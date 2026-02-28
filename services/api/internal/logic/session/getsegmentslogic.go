package session

import (
	"context"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GetSegmentsLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetSegmentsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetSegmentsLogic {
	return &GetSegmentsLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *GetSegmentsLogic) GetSegments(id string) ([]model.Segment, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	session, err := l.svcCtx.SessionModel.FindOne(l.ctx, oid)
	if err != nil {
		return nil, err
	}

	if session.Segments == nil {
		return []model.Segment{}, nil
	}

	return session.Segments, nil
}
