package session

import (
	"context"
	"log"
	"time"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"
)

type ListSessionLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListSessionLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListSessionLogic {
	return &ListSessionLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListSessionLogic) ListSessions() ([]*model.Session, error) {
	// Try cache first
	cacheKey := "sessions:list"
	var cached []*model.Session
	if found, err := l.svcCtx.Cache.Get(l.ctx, cacheKey, &cached); err == nil && found {
		return cached, nil
	}

	// Cache miss — read from MongoDB
	sessions, err := l.svcCtx.SessionModel.FindAll(l.ctx)
	if err != nil {
		return nil, err
	}

	// Populate cache
	if err := l.svcCtx.Cache.Set(l.ctx, cacheKey, sessions, 15*time.Minute); err != nil {
		log.Printf("cache set error for %s: %v", cacheKey, err)
	}

	return sessions, nil
}
