package pipelineclient

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

// PipelineClient manages a WebSocket connection to the pipeline server.
type PipelineClient struct {
	url  string
	conn *websocket.Conn
	mu   sync.Mutex
}

// NewPipelineClient creates a new PipelineClient with the given pipeline server WebSocket URL.
func NewPipelineClient(url string) *PipelineClient {
	return &PipelineClient{
		url: url,
	}
}

// Connect establishes a WebSocket connection to the pipeline server.
func (c *PipelineClient) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	conn, _, err := websocket.DefaultDialer.Dial(c.url, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to pipeline server at %s: %w", c.url, err)
	}
	c.conn = conn
	return nil
}

// ConnectWithUrl establishes a WebSocket connection to a specific URL.
func (c *PipelineClient) ConnectWithUrl(url string) (*websocket.Conn, error) {
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to pipeline server at %s: %w", url, err)
	}
	return conn, nil
}

// SendJSON sends a JSON-encoded message as a text frame.
func (c *PipelineClient) SendJSON(msg interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return fmt.Errorf("not connected to pipeline server")
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return c.conn.WriteMessage(websocket.TextMessage, data)
}

// SendBinary sends raw binary data as a binary frame.
func (c *PipelineClient) SendBinary(data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return fmt.Errorf("not connected to pipeline server")
	}

	return c.conn.WriteMessage(websocket.BinaryMessage, data)
}

// ReadMessage reads the next message from the WebSocket connection.
func (c *PipelineClient) ReadMessage() (int, []byte, error) {
	if c.conn == nil {
		return 0, nil, fmt.Errorf("not connected to pipeline server")
	}

	return c.conn.ReadMessage()
}

// Close closes the WebSocket connection gracefully.
func (c *PipelineClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return nil
	}

	err := c.conn.WriteMessage(
		websocket.CloseMessage,
		websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""),
	)
	if err != nil {
		return c.conn.Close()
	}
	return c.conn.Close()
}

// GetUrl returns the configured pipeline server URL.
func (c *PipelineClient) GetUrl() string {
	return c.url
}

// SendJSONOnConn sends a JSON-encoded message on a specific connection.
func SendJSONOnConn(conn *websocket.Conn, msg interface{}) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}
	return conn.WriteMessage(websocket.TextMessage, data)
}

// SendBinaryOnConn sends binary data on a specific connection.
func SendBinaryOnConn(conn *websocket.Conn, data []byte) error {
	return conn.WriteMessage(websocket.BinaryMessage, data)
}
