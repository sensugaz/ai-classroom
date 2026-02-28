package session

import (
	"context"
	"fmt"
	"log"
	"time"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GetSessionLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetSessionLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetSessionLogic {
	return &GetSessionLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetSessionLogic) GetSession(id string) (*model.Session, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	// Try cache first
	cacheKey := fmt.Sprintf("session:%s", id)
	var cached model.Session
	if found, err := l.svcCtx.Cache.Get(l.ctx, cacheKey, &cached); err == nil && found {
		return &cached, nil
	}

	// Cache miss — read from MongoDB
	session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
	if err != nil {
		return nil, err
	}

	// Populate cache
	if err := l.svcCtx.Cache.Set(l.ctx, cacheKey, session, 1*time.Hour); err != nil {
		log.Printf("cache set error for %s: %v", cacheKey, err)
	}

	return session, nil
}
