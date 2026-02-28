import torch
from pydantic_settings import BaseSettings


def _default_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


class Settings(BaseSettings):
    port: int = 9000
    device: str = _default_device()
    whisper_model: str = "Vinxscribe/biodatlab-whisper-th-large-v3-faster"
    nllb_model: str = "facebook/nllb-200-distilled-600M"
    vad_threshold: float = 0.5
    sample_rate: int = 16000
    tts_sample_rate: int = 24000
    model_cache_dir: str = "/root/.cache"
    voice_presets_dir: str = "/app/voice_presets"
    denoise_enabled: bool = True

    model_config = {"env_prefix": ""}


settings = Settings()
