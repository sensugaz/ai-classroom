package translate

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PushLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewPushLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PushLogic {
	return &PushLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

type PushRequest struct {
	SessionID  string `json:"session_id"`
	AudioData  []byte `json:"audio_data"`
	SourceLang string `json:"source_lang"`
	TargetLang string `json:"target_lang"`
}

type PushResponse struct {
	OriginalText   string `json:"original_text"`
	TranslatedText string `json:"translated_text"`
	AudioURL       string `json:"audio_url,omitempty"`
}

func (l *PushLogic) PushTranslate(req *PushRequest) (*PushResponse, error) {
	// Connect to pipeline server for this single request
	pipelineConn, err := l.svcCtx.PipelineClient.ConnectWithUrl(l.svcCtx.PipelineClient.GetUrl())
	if err != nil {
		return nil, fmt.Errorf("failed to connect to pipeline server: %w", err)
	}
	defer pipelineConn.Close()

	// Send config message
	configMsg := map[string]interface{}{
		"type":        "config",
		"session_id":  req.SessionID,
		"source_lang": req.SourceLang,
		"target_lang": req.TargetLang,
		"mode":        "push_to_talk",
	}
	configData, _ := json.Marshal(configMsg)
	if err := pipelineConn.WriteMessage(websocket.TextMessage, configData); err != nil {
		return nil, fmt.Errorf("failed to send config: %w", err)
	}

	// Send audio data as binary
	if err := pipelineConn.WriteMessage(websocket.BinaryMessage, req.AudioData); err != nil {
		return nil, fmt.Errorf("failed to send audio: %w", err)
	}

	// Send end-of-audio signal
	endMsg := map[string]string{"type": "end_audio"}
	endData, _ := json.Marshal(endMsg)
	if err := pipelineConn.WriteMessage(websocket.TextMessage, endData); err != nil {
		return nil, fmt.Errorf("failed to send end signal: %w", err)
	}

	// Read response from pipeline
	_, respData, err := pipelineConn.ReadMessage()
	if err != nil {
		return nil, fmt.Errorf("failed to read pipeline response: %w", err)
	}

	var result PushResponse
	if err := json.Unmarshal(respData, &result); err != nil {
		return nil, fmt.Errorf("failed to parse pipeline response: %w", err)
	}

	// Save segment to MongoDB if session ID is provided
	if req.SessionID != "" {
		if oid, err := primitive.ObjectIDFromHex(req.SessionID); err == nil {
			session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
			if err == nil {
				segIndex := len(session.Segments)
				segment := model.Segment{
					Index:          segIndex,
					OriginalText:   result.OriginalText,
					TranslatedText: result.TranslatedText,
					Timestamp:      time.Now(),
				}
				_ = l.svcCtx.SessionModel.AddSegment(l.ctx, oid, segment)
			}
		}
	}

	return &result, nil
}
