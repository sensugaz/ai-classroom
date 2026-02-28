package postlesson

import (
	"context"
	"fmt"
	"log"
	"time"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VocabLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewVocabLogic(ctx context.Context, svcCtx *svc.ServiceContext) *VocabLogic {
	return &VocabLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// GenerateVocabulary generates vocabulary from session segments using the LLM.
func (l *VocabLogic) GenerateVocabulary(id string) ([]model.VocabItem, error) {
	// Check cache first — avoid re-calling LLM
	cacheKey := fmt.Sprintf("vocab:%s", id)
	var cached []model.VocabItem
	if found, err := l.svcCtx.Cache.Get(l.ctx, cacheKey, &cached); err == nil && found {
		return cached, nil
	}

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

	vocab, err := l.svcCtx.LlmClient.GenerateVocabulary(session.Segments, session.SourceLang, session.TargetLang)
	if err != nil {
		return nil, fmt.Errorf("failed to generate vocabulary: %w", err)
	}

	// Save to database
	if err := l.svcCtx.SessionModel.UpdateVocabulary(l.ctx, oid, vocab); err != nil {
		return nil, fmt.Errorf("failed to save vocabulary: %w", err)
	}

	// Cache the LLM result
	if err := l.svcCtx.Cache.Set(l.ctx, cacheKey, vocab, 24*time.Hour); err != nil {
		log.Printf("cache set error for %s: %v", cacheKey, err)
	}

	return vocab, nil
}

// GetVocabulary retrieves the existing vocabulary for a session.
// If no vocabulary exists but segments are available, it auto-generates vocabulary.
func (l *VocabLogic) GetVocabulary(id string) ([]model.VocabItem, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("vocab:%s", id)
	var cached []model.VocabItem
	if found, err := l.svcCtx.Cache.Get(l.ctx, cacheKey, &cached); err == nil && found {
		return cached, nil
	}

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid session ID: %w", err)
	}

	session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	if len(session.Vocabulary) == 0 && len(session.Segments) > 0 {
		return l.GenerateVocabulary(id)
	}

	if session.Vocabulary == nil {
		return []model.VocabItem{}, nil
	}

	// Populate cache for next time
	if err := l.svcCtx.Cache.Set(l.ctx, cacheKey, session.Vocabulary, 24*time.Hour); err != nil {
		log.Printf("cache set error for %s: %v", cacheKey, err)
	}

	return session.Vocabulary, nil
}
