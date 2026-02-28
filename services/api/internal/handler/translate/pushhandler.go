package translate

import (
	"encoding/base64"
	"io"
	"net/http"
	"strings"

	"classroom-api/internal/logic/translate"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type pushRequestBody struct {
	SessionID  string `json:"session_id"`
	AudioData  string `json:"audio_data"` // base64 encoded audio
	SourceLang string `json:"source_lang"`
	TargetLang string `json:"target_lang"`
}

func PushHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var audioBytes []byte
		var sessionID, sourceLang, targetLang string

		// Check content type for multipart or JSON
		contentType := r.Header.Get("Content-Type")
		if strings.Contains(contentType, "application/json") || contentType == "" {
			var req pushRequestBody
			if err := httpx.Parse(r, &req); err != nil {
				httpx.ErrorCtx(r.Context(), w, err)
				return
			}

			decoded, err := base64.StdEncoding.DecodeString(req.AudioData)
			if err != nil {
				httpx.ErrorCtx(r.Context(), w, err)
				return
			}
			audioBytes = decoded
			sessionID = req.SessionID
			sourceLang = req.SourceLang
			targetLang = req.TargetLang
		} else {
			// Handle multipart form data
			if err := r.ParseMultipartForm(32 << 20); err != nil { // 32MB max
				httpx.ErrorCtx(r.Context(), w, err)
				return
			}

			sessionID = r.FormValue("session_id")
			sourceLang = r.FormValue("source_lang")
			targetLang = r.FormValue("target_lang")

			file, _, err := r.FormFile("audio")
			if err != nil {
				httpx.ErrorCtx(r.Context(), w, err)
				return
			}
			defer file.Close()

			audioBytes, err = io.ReadAll(file)
			if err != nil {
				httpx.ErrorCtx(r.Context(), w, err)
				return
			}
		}

		pushReq := &translate.PushRequest{
			SessionID:  sessionID,
			AudioData:  audioBytes,
			SourceLang: sourceLang,
			TargetLang: targetLang,
		}

		l := translate.NewPushLogic(r.Context(), svcCtx)
		result, err := l.PushTranslate(pushReq)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
