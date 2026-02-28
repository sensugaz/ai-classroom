package llmclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"classroom-api/internal/model"
)

// LlmClient communicates with the OpenRouter API for LLM-powered features.
type LlmClient struct {
	apiKey  string
	baseUrl string
	model   string
	client  *http.Client
}

// NewLlmClient creates a new OpenRouter LLM client.
func NewLlmClient(apiKey, baseUrl, model string) *LlmClient {
	return &LlmClient{
		apiKey:  apiKey,
		baseUrl: strings.TrimRight(baseUrl, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// chatRequest represents the request body for OpenRouter chat completions.
type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatResponse represents the response from OpenRouter chat completions.
type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// callLLM sends a chat completion request to the OpenRouter API.
func (c *LlmClient) callLLM(systemPrompt, userPrompt string) (string, error) {
	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := c.baseUrl + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call OpenRouter API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenRouter API returned status %d: %s", resp.StatusCode, string(body))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices returned from OpenRouter API")
	}

	return chatResp.Choices[0].Message.Content, nil
}

// formatSegments converts segments into a readable transcript string.
func formatSegments(segments []model.Segment) string {
	var sb strings.Builder
	for _, seg := range segments {
		sb.WriteString(fmt.Sprintf("[%d] Original (%s): %s\n", seg.Index, seg.Timestamp.Format(time.RFC3339), seg.OriginalText))
		if seg.TranslatedText != "" {
			sb.WriteString(fmt.Sprintf("    Translated: %s\n", seg.TranslatedText))
		}
	}
	return sb.String()
}

// GenerateSummary generates a bilingual summary of the lesson transcript.
func (c *LlmClient) GenerateSummary(segments []model.Segment, sourceLang, targetLang string) (*model.Summary, error) {
	transcript := formatSegments(segments)

	systemPrompt := `You are an educational assistant that summarizes classroom lessons.
You must respond with valid JSON only, no markdown, no extra text.
The JSON format must be: {"th": "Thai summary here", "en": "English summary here"}`

	userPrompt := fmt.Sprintf(`Summarize the following classroom transcript.
The source language is %s and the target language is %s.
Provide a concise summary in both Thai and English.

Transcript:
%s

Respond with JSON only: {"th": "...", "en": "..."}`, sourceLang, targetLang, transcript)

	result, err := c.callLLM(systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("failed to generate summary: %w", err)
	}

	// Extract JSON from the response (handle potential markdown wrapping)
	result = extractJSON(result)

	var summary model.Summary
	if err := json.Unmarshal([]byte(result), &summary); err != nil {
		return nil, fmt.Errorf("failed to parse summary response: %w, raw: %s", err, result)
	}

	return &summary, nil
}

// GenerateVocabulary extracts vocabulary items from the lesson transcript.
func (c *LlmClient) GenerateVocabulary(segments []model.Segment, sourceLang, targetLang string) ([]model.VocabItem, error) {
	transcript := formatSegments(segments)

	systemPrompt := `You are an educational assistant that extracts key vocabulary from classroom lessons.
You must respond with valid JSON only, no markdown, no extra text.
The JSON format must be an array: [{"th": "...", "en": "...", "phonetic": "...", "difficulty": "beginner|intermediate|advanced", "example": "..."}]`

	userPrompt := fmt.Sprintf(`Extract key vocabulary from the following classroom transcript.
The source language is %s and the target language is %s.
For each word, provide Thai, English, phonetic pronunciation, difficulty level, and an example sentence.

Transcript:
%s

Respond with JSON array only.`, sourceLang, targetLang, transcript)

	result, err := c.callLLM(systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("failed to generate vocabulary: %w", err)
	}

	result = extractJSON(result)

	var vocab []model.VocabItem
	if err := json.Unmarshal([]byte(result), &vocab); err != nil {
		return nil, fmt.Errorf("failed to parse vocabulary response: %w, raw: %s", err, result)
	}

	return vocab, nil
}

// GenerateFlashcards creates flashcards from the lesson transcript.
func (c *LlmClient) GenerateFlashcards(segments []model.Segment, sourceLang, targetLang string) ([]model.Flashcard, error) {
	transcript := formatSegments(segments)

	systemPrompt := `You are an educational assistant that creates flashcards from classroom lessons.
You must respond with valid JSON only, no markdown, no extra text.
The JSON format must be an array: [{"front": "...", "back": "...", "example": "..."}]`

	userPrompt := fmt.Sprintf(`Create study flashcards from the following classroom transcript.
The source language is %s and the target language is %s.
Each flashcard should have a front (term/question), back (definition/answer), and an example usage.

Transcript:
%s

Respond with JSON array only.`, sourceLang, targetLang, transcript)

	result, err := c.callLLM(systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("failed to generate flashcards: %w", err)
	}

	result = extractJSON(result)

	var cards []model.Flashcard
	if err := json.Unmarshal([]byte(result), &cards); err != nil {
		return nil, fmt.Errorf("failed to parse flashcards response: %w, raw: %s", err, result)
	}

	return cards, nil
}

// extractJSON attempts to extract a JSON string from potentially markdown-wrapped content.
func extractJSON(s string) string {
	s = strings.TrimSpace(s)

	// Remove markdown code block wrapping if present
	if strings.HasPrefix(s, "```json") {
		s = strings.TrimPrefix(s, "```json")
		if idx := strings.LastIndex(s, "```"); idx >= 0 {
			s = s[:idx]
		}
	} else if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
		if idx := strings.LastIndex(s, "```"); idx >= 0 {
			s = s[:idx]
		}
	}

	return strings.TrimSpace(s)
}
