package voice

import (
	"context"

	"classroom-api/internal/svc"
)

type ListVoiceLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListVoiceLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListVoiceLogic {
	return &ListVoiceLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

type Voice struct {
	ID        string `json:"id"`
	VoiceType string `json:"voice_type"`
	Language  string `json:"language"`
	Name      string `json:"name"`
}

func (l *ListVoiceLogic) ListVoices() []Voice {
	return []Voice{
		// Thai voices
		{ID: "th/adult_male", VoiceType: "adult_male", Language: "th", Name: "Adult Male"},
		{ID: "th/adult_female", VoiceType: "adult_female", Language: "th", Name: "Adult Female"},
		{ID: "th/child_male", VoiceType: "child_male", Language: "th", Name: "Child Male"},
		{ID: "th/child_female", VoiceType: "child_female", Language: "th", Name: "Child Female"},
		// English voices
		{ID: "en/adult_male", VoiceType: "adult_male", Language: "en", Name: "Adult Male"},
		{ID: "en/adult_female", VoiceType: "adult_female", Language: "en", Name: "Adult Female"},
		{ID: "en/child_male", VoiceType: "child_male", Language: "en", Name: "Child Male"},
		{ID: "en/child_female", VoiceType: "child_female", Language: "en", Name: "Child Female"},
	}
}
