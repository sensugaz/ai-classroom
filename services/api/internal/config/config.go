package config

import "github.com/zeromicro/go-zero/rest"

type Config struct {
	rest.RestConf

	Mongo struct {
		Uri string
	}

	Redis struct {
		Host string
	}

	PipelineWsUrl string

	OpenRouter struct {
		ApiKey  string
		BaseUrl string
		Model   string
	}
}
