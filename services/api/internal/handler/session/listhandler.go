package session

import (
	"net/http"

	"classroom-api/internal/logic/session"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

func ListHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := session.NewListSessionLogic(r.Context(), svcCtx)
		result, err := l.ListSessions()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
