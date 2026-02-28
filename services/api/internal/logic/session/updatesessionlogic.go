package session

import (
	"context"
	"fmt"
	"log"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UpdateSessionLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateSessionLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateSessionLogic {
	return &UpdateSessionLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

type UpdateSessionRequest struct {
	TeacherName       string `json:"teacher_name"`
	ClassName         string `json:"class_name"`
	Subject           string `json:"subject"`
	CourseOutline     string `json:"course_outline"`
	SourceLang        string `json:"source_lang"`
	TargetLang        string `json:"target_lang"`
	VoiceType         string `json:"voice_type"`
	Mode              string `json:"mode"`
	NoiseCancellation bool   `json:"noise_cancellation"`
	Status            string `json:"status"`
}

func (l *UpdateSessionLogic) UpdateSession(id string, req *UpdateSessionRequest) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	session := &model.Session{
		TeacherName:       req.TeacherName,
		ClassName:         req.ClassName,
		Subject:           req.Subject,
		CourseOutline:     req.CourseOutline,
		SourceLang:        req.SourceLang,
		TargetLang:        req.TargetLang,
		VoiceType:         req.VoiceType,
		Mode:              req.Mode,
		NoiseCancellation: req.NoiseCancellation,
		Status:            req.Status,
	}

	if err := l.svcCtx.SessionModel.Update(l.ctx, oid, session); err != nil {
		return err
	}

	// Invalidate session cache + list cache
	cacheKey := fmt.Sprintf("session:%s", id)
	if err := l.svcCtx.Cache.Delete(l.ctx, cacheKey, "sessions:list"); err != nil {
		log.Printf("cache delete error: %v", err)
	}

	return nil
}
