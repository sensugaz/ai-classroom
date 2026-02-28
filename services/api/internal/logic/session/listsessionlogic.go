package session

import (
	"context"

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
	return l.svcCtx.SessionModel.FindAll(l.ctx)
}
