package voice

import (
	"net/http"

	voicelogic "classroom-api/internal/logic/voice"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

func ListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := voicelogic.NewListVoiceLogic(r.Context(), svcCtx)
		result := l.ListVoices()
		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
