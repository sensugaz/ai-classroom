package postlesson

import (
	"context"
	"fmt"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SummaryLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewSummaryLogic(ctx context.Context, svcCtx *svc.ServiceContext) *SummaryLogic {
	return &SummaryLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

// GenerateSummary generates a summary from the session's segments using the LLM.
func (l *SummaryLogic) GenerateSummary(id string) (*model.Summary, error) {
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

	summary, err := l.svcCtx.LlmClient.GenerateSummary(session.Segments, session.SourceLang, session.TargetLang)
	if err != nil {
		return nil, fmt.Errorf("failed to generate summary: %w", err)
	}

	// Save to database
	if err := l.svcCtx.SessionModel.UpdateSummary(l.ctx, oid, summary); err != nil {
		return nil, fmt.Errorf("failed to save summary: %w", err)
	}

	return summary, nil
}

// GetSummary retrieves the existing summary for a session.
func (l *SummaryLogic) GetSummary(id string) (*model.Summary, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid session ID: %w", err)
	}

	session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	if session.Summary == nil {
		return nil, fmt.Errorf("no summary available for this session")
	}

	return session.Summary, nil
}
