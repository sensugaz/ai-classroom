package postlesson

import (
	"net/http"

	"classroom-api/internal/logic/postlesson"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type sessionPathRequest struct {
	ID string `path:"id"`
}

func GenerateSummaryHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req sessionPathRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := postlesson.NewSummaryLogic(r.Context(), svcCtx)
		result, err := l.GenerateSummary(req.ID)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}

func GetSummaryHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req sessionPathRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := postlesson.NewSummaryLogic(r.Context(), svcCtx)
		result, err := l.GetSummary(req.ID)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
