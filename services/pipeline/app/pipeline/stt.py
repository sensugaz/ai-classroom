"""faster-whisper STT - runs on GPU (~300ms)."""

import logging
import numpy as np

logger = logging.getLogger(__name__)


class SttProcessor:
    def __init__(self, model_size: str = "large-v3", device: str = "cuda"):
        self.model_size = model_size
        self.device = device
        self.model = None

    def load(self):
        """Load faster-whisper model."""
        from faster_whisper import WhisperModel

        compute_type = "float16" if self.device == "cuda" else "int8"
        self.model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=compute_type,
        )
        logger.info("faster-whisper %s loaded on %s", self.model_size, self.device)

    def transcribe(self, audio: np.ndarray, language: str = "th") -> str:
        """Transcribe audio to text.

        Args:
            audio: float32 numpy array, shape (samples,), 16kHz
            language: source language code

        Returns:
            Transcribed text string
        """
        if self.model is None:
            raise RuntimeError("STT model not loaded")

        segments, info = self.model.transcribe(
            audio,
            language=language,
            beam_size=5,
            vad_filter=False,  # We handle VAD externally
        )

        text = " ".join(seg.text.strip() for seg in segments)
        logger.debug("STT [%s]: %s", language, text)
        return text
