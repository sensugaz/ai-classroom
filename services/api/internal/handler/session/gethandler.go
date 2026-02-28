package session

import (
	"net/http"

	"classroom-api/internal/logic/session"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type getSessionRequest struct {
	ID string `path:"id"`
}

func GetHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req getSessionRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := session.NewGetSessionLogic(r.Context(), svcCtx)
		result, err := l.GetSession(req.ID)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
