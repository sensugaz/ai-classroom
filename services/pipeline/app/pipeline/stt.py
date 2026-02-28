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

    def transcribe(self, audio: np.ndarray, language: str = "th", sample_rate: int = 16000) -> str:
        """Transcribe audio to text.

        Args:
            audio: float32 numpy array, shape (samples,), 16kHz
            language: source language code
            sample_rate: audio sample rate

        Returns:
            Transcribed text string
        """
        if self.model is None:
            raise RuntimeError("STT model not loaded")

        # Skip very short audio (< 0.5s) — Whisper hallucinates on silence/noise
        duration = len(audio) / sample_rate
        if duration < 0.5:
            logger.info("STT: audio too short (%.2fs), skipping", duration)
            return ""

        # Thai initial prompt helps guide the model
        initial_prompt = "สวัสดีครับ" if language == "th" else None

        segments, info = self.model.transcribe(
            audio,
            language=language,
            beam_size=1,  # greedy — faster and more stable for fine-tuned models
            vad_filter=False,  # We handle VAD externally
            condition_on_previous_text=False,  # Prevent hallucination chains
            no_speech_threshold=0.6,
            log_prob_threshold=-0.5,
            initial_prompt=initial_prompt,
            temperature=0.0,  # deterministic output
        )

        texts = []
        for seg in segments:
            if seg.no_speech_prob > 0.5:
                logger.info("STT: skip no-speech segment (%.2f): %s",
                            seg.no_speech_prob, seg.text.strip())
                continue
            texts.append(seg.text.strip())

        text = " ".join(texts)

        # Sanity check: if output is way too long for audio duration, likely hallucination
        # Thai uses ~40-60 chars/sec (no spaces, dense script)
        max_chars_per_sec = 50
        if text and len(text) > duration * max_chars_per_sec:
            logger.warning("STT: output too long for %.1fs audio (%d chars), likely hallucination: %s",
                           duration, len(text), text[:60])
            return ""

        logger.debug("STT [%s] (%.1fs): %s", language, duration, text)
        return text
