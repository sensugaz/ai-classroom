package session

import (
	"net/http"

	"classroom-api/internal/logic/session"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type getSegmentsRequest struct {
	ID string `path:"id"`
}

func GetSegmentsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req getSegmentsRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := session.NewGetSegmentsLogic(r.Context(), svcCtx)
		result, err := l.GetSegments(req.ID)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
