package handler

import (
	"net/http"

	"classroom-api/internal/handler/postlesson"
	"classroom-api/internal/handler/session"
	"classroom-api/internal/handler/translate"
	"classroom-api/internal/handler/voice"
	"classroom-api/internal/svc"

	"github.com/zeromicro/go-zero/rest"
)

func RegisterHandlers(server *rest.Server, svcCtx *svc.ServiceContext) {
	server.AddRoutes(
		[]rest.Route{
			{
				Method:  http.MethodPost,
				Path:    "/api/v1/sessions",
				Handler: session.CreateHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/sessions",
				Handler: session.ListHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/sessions/:id",
				Handler: session.GetHandler(svcCtx),
			},
			{
				Method:  http.MethodPut,
				Path:    "/api/v1/sessions/:id",
				Handler: session.UpdateHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/sessions/:id/segments",
				Handler: session.GetSegmentsHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/ws/translate",
				Handler: translate.WsHandler(svcCtx),
			},
			{
				Method:  http.MethodPost,
				Path:    "/api/v1/translate/push",
				Handler: translate.PushHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/voices",
				Handler: voice.ListHandler(svcCtx),
			},
			{
				Method:  http.MethodPost,
				Path:    "/api/v1/sessions/:id/summary",
				Handler: postlesson.GenerateSummaryHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/sessions/:id/summary",
				Handler: postlesson.GetSummaryHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/sessions/:id/vocab",
				Handler: postlesson.GetVocabHandler(svcCtx),
			},
			{
				Method:  http.MethodGet,
				Path:    "/api/v1/sessions/:id/flashcards",
				Handler: postlesson.GetFlashcardsHandler(svcCtx),
			},
		},
	)
}
