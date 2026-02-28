package session

import (
	"context"
	"log"

	"classroom-api/internal/model"
	"classroom-api/internal/svc"
)

type CreateSessionLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateSessionLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateSessionLogic {
	return &CreateSessionLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

type CreateSessionRequest struct {
	TeacherName       string `json:"teacher_name"`
	ClassName         string `json:"class_name"`
	Subject           string `json:"subject"`
	CourseOutline     string `json:"course_outline"`
	SourceLang        string `json:"source_lang"`
	TargetLang        string `json:"target_lang"`
	VoiceType         string `json:"voice_type"`
	Mode              string `json:"mode"`
	NoiseCancellation bool   `json:"noise_cancellation"`
}

func (l *CreateSessionLogic) CreateSession(req *CreateSessionRequest) (*model.Session, error) {
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
		Status:            "active",
	}

	result, err := l.svcCtx.SessionModel.Insert(l.ctx, session)
	if err != nil {
		return nil, err
	}

	// Invalidate session list cache
	if err := l.svcCtx.Cache.Delete(l.ctx, "sessions:list"); err != nil {
		log.Printf("cache delete error for sessions:list: %v", err)
	}

	return result, nil
}
