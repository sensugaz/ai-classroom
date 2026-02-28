import torch
from pydantic_settings import BaseSettings


def _default_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


class Settings(BaseSettings):
    port: int = 9000
    device: str = _default_device()
    whisper_model: str = "large-v3"
    translate_model: str = "Helsinki-NLP/opus-mt-th-en"
    vad_threshold: float = 0.5
    sample_rate: int = 16000
    tts_sample_rate: int = 24000
    model_cache_dir: str = "/root/.cache"
    voice_presets_dir: str = "/app/voice_presets"
    openai_api_key: str = ""
    stt_postprocess: bool = True
    denoise_enabled: bool = False

    model_config = {"env_prefix": ""}


settings = Settings()
