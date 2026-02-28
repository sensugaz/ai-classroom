package postlesson

import (
	"net/http"

	"classroom-api/internal/logic/postlesson"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type flashcardsPathRequest struct {
	ID string `path:"id"`
}

func GetFlashcardsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req flashcardsPathRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := postlesson.NewFlashcardsLogic(r.Context(), svcCtx)
		result, err := l.GetFlashcards(req.ID)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
