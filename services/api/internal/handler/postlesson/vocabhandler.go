package postlesson

import (
	"net/http"

	"classroom-api/internal/logic/postlesson"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

type vocabPathRequest struct {
	ID string `path:"id"`
}

func GetVocabHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req vocabPathRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := postlesson.NewVocabLogic(r.Context(), svcCtx)
		result, err := l.GetVocabulary(req.ID)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		httpx.OkJsonCtx(r.Context(), w, result)
	}
}
