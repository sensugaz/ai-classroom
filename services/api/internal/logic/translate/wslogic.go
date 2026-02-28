package translate

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// WsMessage represents a message exchanged over WebSocket.
type WsMessage struct {
	Type      string          `json:"type"`                // "config" | "transcript" | "audio" | "error"
	SessionID string          `json:"session_id,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
}

// TranscriptData represents transcript data from the pipeline.
type TranscriptData struct {
	Index          int    `json:"index"`
	OriginalText   string `json:"original_text"`
	TranslatedText string `json:"translated_text"`
}

type WsLogic struct {
	svcCtx *svc.ServiceContext
}

func NewWsLogic(svcCtx *svc.ServiceContext) *WsLogic {
	return &WsLogic{
		svcCtx: svcCtx,
	}
}

// HandleWebSocket manages the bidirectional WebSocket relay between browser and pipeline server.
func (l *WsLogic) HandleWebSocket(clientConn *websocket.Conn) {
	defer clientConn.Close()

	// Connect to pipeline server
	pipelineConn, err := l.svcCtx.PipelineClient.ConnectWithUrl(l.svcCtx.PipelineClient.GetUrl())
	if err != nil {
		log.Printf("failed to connect to pipeline server: %v", err)
		errMsg, _ := json.Marshal(map[string]string{
			"type":    "error",
			"message": "Failed to connect to pipeline",
		})
		clientConn.WriteMessage(websocket.TextMessage, errMsg)
		return
	}
	defer pipelineConn.Close()

	var sessionID primitive.ObjectID
	done := make(chan struct{})

	// Pipeline -> Client relay goroutine
	go func() {
		defer close(done)
		for {
			msgType, data, err := pipelineConn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Printf("pipeline read error: %v", err)
				}
				return
			}

			// If it's a text message, try to parse transcript and save segment
			if msgType == websocket.TextMessage {
				var wsMsg WsMessage
				if err := json.Unmarshal(data, &wsMsg); err == nil && wsMsg.Type == "transcript" {
					l.saveSegment(sessionID, wsMsg.Data)
				}
			}

			// Forward to client
			if err := clientConn.WriteMessage(msgType, data); err != nil {
				log.Printf("client write error: %v", err)
				return
			}
		}
	}()

	// Client -> Pipeline relay
	for {
		msgType, data, err := clientConn.ReadMessage()
		if err != nil {
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("client read error: %v", err)
			}
			break
		}

		// If it's a text message, check for config/session_id
		if msgType == websocket.TextMessage {
			var wsMsg WsMessage
			if err := json.Unmarshal(data, &wsMsg); err == nil {
				if wsMsg.SessionID != "" {
					if oid, err := primitive.ObjectIDFromHex(wsMsg.SessionID); err == nil {
						sessionID = oid
					}
				}
			}
		}

		// Forward to pipeline
		if err := pipelineConn.WriteMessage(msgType, data); err != nil {
			log.Printf("pipeline write error: %v", err)
			break
		}
	}

	<-done
}

// saveSegment parses transcript data and saves it as a segment to MongoDB.
func (l *WsLogic) saveSegment(sessionID primitive.ObjectID, data json.RawMessage) {
	if sessionID.IsZero() {
		return
	}

	var td TranscriptData
	if err := json.Unmarshal(data, &td); err != nil {
		log.Printf("failed to parse transcript data: %v", err)
		return
	}

	segment := model.Segment{
		Index:          td.Index,
		OriginalText:   td.OriginalText,
		TranslatedText: td.TranslatedText,
		Timestamp:      time.Now(),
	}

	ctx := context.Background()
	if err := l.svcCtx.SessionModel.AddSegment(ctx, sessionID, segment); err != nil {
		log.Printf("failed to save segment: %v", err)
	}
}
