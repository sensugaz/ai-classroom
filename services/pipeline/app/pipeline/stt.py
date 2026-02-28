"""OpenAI gpt-4o-transcribe STT via API."""

import io
import logging
import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)


class SttProcessor:
    def __init__(self, api_key: str = "", device: str = "cuda", model_size: str = "large-v3"):
        self.api_key = api_key
        self.device = device
        self.model_size = model_size
        self.client = None
        self.model = None  # local whisper fallback

    def load(self):
        """Load OpenAI client or fall back to local Whisper."""
        if self.api_key:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
            logger.info("STT: OpenAI gpt-4o-transcribe ready")
        else:
            from faster_whisper import WhisperModel
            compute_type = "float16" if self.device == "cuda" else "int8"
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=compute_type,
            )
            logger.info("STT: faster-whisper %s loaded on %s (no API key)", self.model_size, self.device)

    def transcribe(self, audio: np.ndarray, language: str = "th", sample_rate: int = 16000) -> str:
        duration = len(audio) / sample_rate
        if duration < 0.3:
            logger.info("STT: audio too short (%.2fs), skipping", duration)
            return ""

        # Energy check — skip silent audio to prevent hallucination
        rms = float(np.sqrt(np.mean(audio ** 2)))
        if rms < 0.01:
            logger.info("STT: audio too quiet (rms=%.4f), skipping", rms)
            return ""

        if self.client:
            return self._transcribe_openai(audio, language, sample_rate, duration)
        elif self.model:
            return self._transcribe_local(audio, language, sample_rate, duration)
        else:
            raise RuntimeError("STT model not loaded")

    def _transcribe_openai(self, audio: np.ndarray, language: str, sample_rate: int, duration: float) -> str:
        """Transcribe using OpenAI API."""
        try:
            # Convert numpy to WAV in memory
            buf = io.BytesIO()
            sf.write(buf, audio, sample_rate, format='WAV', subtype='PCM_16')
            buf.seek(0)
            buf.name = "audio.wav"

            result = self.client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=buf,
                language=language,
            )

            text = result.text.strip() if result.text else ""

            # Sanity check: output too long for audio duration
            max_chars_per_sec = 80
            if text and len(text) > duration * max_chars_per_sec:
                logger.warning("STT: output too long for %.1fs audio (%d chars), likely hallucination: %s",
                               duration, len(text), text[:60])
                return ""

            if text:
                logger.info("STT [%s] (%.1fs) OpenAI: %s", language, duration, text)
            return text
        except Exception as e:
            logger.error("STT OpenAI failed: %s", e)
            return ""

    def _transcribe_local(self, audio: np.ndarray, language: str, sample_rate: int, duration: float) -> str:
        """Transcribe using local faster-whisper."""
        segments, info = self.model.transcribe(
            audio,
            language=language,
            beam_size=3,
            vad_filter=False,
            condition_on_previous_text=False,
            no_speech_threshold=0.8,
            log_prob_threshold=-1.0,
            temperature=0.0,
        )

        texts = []
        for seg in segments:
            if seg.no_speech_prob > 0.7:
                logger.info("STT: skip no-speech segment (%.2f): %s",
                            seg.no_speech_prob, seg.text.strip())
                continue
            txt = seg.text.strip()
            if txt:
                texts.append(txt)

        text = " ".join(texts)

        # Remove repeated words/phrases (hallucination pattern)
        text = self._remove_repetition(text)

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
