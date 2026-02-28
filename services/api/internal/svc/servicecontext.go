package svc

import (
	"context"
	"log"
	"os"
	"time"

	"classroom-api/internal/cache"
	"classroom-api/internal/config"
	"classroom-api/internal/llmclient"
	"classroom-api/internal/model"
	"classroom-api/internal/pipelineclient"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ServiceContext struct {
	Config         config.Config
	MongoClient    *mongo.Client
	MongoDB        *mongo.Database
	SessionModel   *model.SessionModel
	PipelineClient *pipelineclient.PipelineClient
	LlmClient      *llmclient.LlmClient
	Cache          *cache.Cache
}

func NewServiceContext(c config.Config) *ServiceContext {
	// Override config from environment variables
	if uri := os.Getenv("MONGO_URI"); uri != "" {
		c.Mongo.Uri = uri
	}
	if pipelineUrl := os.Getenv("PIPELINE_WS_URL"); pipelineUrl != "" {
		c.PipelineWsUrl = pipelineUrl
	}
	if apiKey := os.Getenv("OPENROUTER_API_KEY"); apiKey != "" {
		c.OpenRouter.ApiKey = apiKey
	}
	if redisHost := os.Getenv("REDIS_HOST"); redisHost != "" {
		c.Redis.Host = redisHost
	}

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(c.Mongo.Uri))
	if err != nil {
		log.Fatalf("failed to connect to MongoDB: %v", err)
	}

	// Ping to verify connection
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Printf("warning: failed to ping MongoDB: %v", err)
	}

	// Extract database name from URI or use default
	dbName := "classroom"
	db := mongoClient.Database(dbName)

	// Initialize pipeline client
	plClient := pipelineclient.NewPipelineClient(c.PipelineWsUrl)

	// Initialize LLM client
	llmClient := llmclient.NewLlmClient(
		c.OpenRouter.ApiKey,
		c.OpenRouter.BaseUrl,
		c.OpenRouter.Model,
	)

	// Initialize Redis cache
	redisCache := cache.NewCache(c.Redis.Host)
	if err := redisCache.Ping(ctx); err != nil {
		log.Printf("warning: failed to ping Redis: %v", err)
	}

	return &ServiceContext{
		Config:         c,
		MongoClient:    mongoClient,
		MongoDB:        db,
		SessionModel:   model.NewSessionModel(db),
		PipelineClient: plClient,
		LlmClient:      llmClient,
		Cache:          redisCache,
	}
}
