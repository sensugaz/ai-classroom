from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 9000
    device: str = "cuda"
    whisper_model: str = "large-v3"
    nllb_model: str = "facebook/nllb-200-3.3B"
    vad_threshold: float = 0.5
    sample_rate: int = 16000
    tts_sample_rate: int = 24000
    model_cache_dir: str = "/root/.cache"
    voice_presets_dir: str = "/app/voice_presets"
    denoise_enabled: bool = True

    model_config = {"env_prefix": ""}


settings = Settings()
