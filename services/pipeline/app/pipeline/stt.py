"""faster-whisper STT - runs on GPU (~300ms)."""

import logging
import numpy as np

logger = logging.getLogger(__name__)

# Common Thai Whisper hallucination phrases (YouTube outros, etc.)
_HALLUCINATION_PHRASES = {
    "ขอบคุณที่ติดตาม",
    "ขอบคุณที่รับชม",
    "อย่าลืมกดไลค์",
    "อย่าลืมกดติดตาม",
    "กดกระดิ่ง",
    "กดซับสไครป์",
    "โปรดติดตามตอนต่อไป",
    "ฝากกดไลค์",
    "ฝากกดแชร์",
}


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
        if self.model is None:
            raise RuntimeError("STT model not loaded")

        duration = len(audio) / sample_rate
        if duration < 1.0:
            logger.info("STT: audio too short (%.2fs), skipping", duration)
            return ""

        segments, info = self.model.transcribe(
            audio,
            language=language,
            beam_size=1,
            vad_filter=True,
            condition_on_previous_text=False,
            no_speech_threshold=0.5,
            log_prob_threshold=-0.3,
            temperature=0.0,
        )

        texts = []
        for seg in segments:
            if seg.no_speech_prob > 0.4:
                logger.info("STT: skip no-speech segment (%.2f): %s",
                            seg.no_speech_prob, seg.text.strip())
                continue
            txt = seg.text.strip()
            if txt:
                texts.append(txt)

        text = " ".join(texts)

        # Remove repeated words/phrases (hallucination pattern)
        text = self._remove_repetition(text)

        # Remove known hallucination phrases
        text = self._remove_hallucinations(text)

        # Sanity check: output too long for audio duration
        max_chars_per_sec = 80
        if text and len(text) > duration * max_chars_per_sec:
            logger.warning("STT: output too long for %.1fs audio (%d chars), likely hallucination: %s",
                           duration, len(text), text[:60])
            return ""

        if text:
            logger.info("STT [%s] (%.1fs): %s", language, duration, text)
        return text

    @staticmethod
    def _remove_repetition(text: str) -> str:
        """Remove repeated words/phrases that indicate hallucination."""
        if not text:
            return text

        words = text.split()
        if len(words) <= 2:
            return text

        # Cap to prevent O(n^3) on long hallucinations
        words = words[:200]

        for n in range(1, 7):
            if len(words) < n * 3:
                continue
            for i in range(len(words) - n):
                phrase = words[i:i + n]
                repeats = 1
                j = i + n
                while j + n <= len(words) and words[j:j + n] == phrase:
                    repeats += 1
                    j += n
                if repeats >= 3:
                    logger.warning("STT: repetition detected '%s' x%d, keeping first occurrence",
                                   " ".join(phrase), repeats)
                    return " ".join(words[:i + n])

        return " ".join(words)

    @staticmethod
    def _remove_hallucinations(text: str) -> str:
        """Remove known Thai Whisper hallucination phrases."""
        original = text
        for phrase in _HALLUCINATION_PHRASES:
            text = text.replace(phrase, "")
        text = " ".join(text.split())  # clean up whitespace

        if text != original:
            logger.warning("STT: removed hallucination phrases: '%s' -> '%s'", original, text)

        return text
