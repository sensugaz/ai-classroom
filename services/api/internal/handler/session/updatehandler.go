package session

import (
	"net/http"

	"classroom-api/internal/logic/session"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type updateSessionFullRequest struct {
	ID                string `path:"id"`
	TeacherName       string `json:"teacher_name,optional"`
	ClassName         string `json:"class_name,optional"`
	Subject           string `json:"subject,optional"`
	CourseOutline     string `json:"course_outline,optional"`
	SourceLang        string `json:"source_lang,optional"`
	TargetLang        string `json:"target_lang,optional"`
	VoiceType         string `json:"voice_type,optional"`
	Mode              string `json:"mode,optional"`
	NoiseCancellation bool   `json:"noise_cancellation,optional"`
	Status            string `json:"status,optional"`
}

func UpdateHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req updateSessionFullRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		updateReq := &session.UpdateSessionRequest{
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

		l := session.NewUpdateSessionLogic(r.Context(), svcCtx)
		if err := l.UpdateSession(req.ID, updateReq); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, map[string]interface{}{
			"message": "session updated",
		})
	}
}
