package postlesson

import (
	"context"
	"fmt"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FlashcardsLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewFlashcardsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *FlashcardsLogic {
	return &FlashcardsLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// GenerateFlashcards generates flashcards from session segments using the LLM.
func (l *FlashcardsLogic) GenerateFlashcards(id string) ([]model.Flashcard, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid session ID: %w", err)
	}

	session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	if len(session.Segments) == 0 {
		return nil, fmt.Errorf("no segments found for this session")
	}

	cards, err := l.svcCtx.LlmClient.GenerateFlashcards(session.Segments, session.SourceLang, session.TargetLang)
	if err != nil {
		return nil, fmt.Errorf("failed to generate flashcards: %w", err)
	}

	// Save to database
	if err := l.svcCtx.SessionModel.UpdateFlashcards(l.ctx, oid, cards); err != nil {
		return nil, fmt.Errorf("failed to save flashcards: %w", err)
	}

	return cards, nil
}

// GetFlashcards retrieves the existing flashcards for a session.
// If no flashcards exist but segments are available, it auto-generates flashcards.
func (l *FlashcardsLogic) GetFlashcards(id string) ([]model.Flashcard, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid session ID: %w", err)
	}

	session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	if len(session.Flashcards) == 0 && len(session.Segments) > 0 {
		return l.GenerateFlashcards(id)
	}

	if session.Flashcards == nil {
		return []model.Flashcard{}, nil
	}

	return session.Flashcards, nil
}
