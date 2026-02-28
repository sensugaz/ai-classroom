"""TTS — Kokoro only (natural built-in voices, no fallback)."""

import logging
import numpy as np

logger = logging.getLogger(__name__)

# Kokoro voice mapping — natural human voices
_KOKORO_VOICES = {
    "adult_female": "af_heart",      # warm, natural female
    "adult_male": "am_adam",          # clear, natural male
    "child_female": "af_bella",       # lighter female voice
    "child_male": "am_michael",       # lighter male voice
}

# Kokoro language codes
_KOKORO_LANG_CODES = {
    "en": "a",   # American English
    "th": "a",   # Thai not supported — use English voice for translated text
    "es": "e",   # Spanish
    "fr": "f",   # French
    "ja": "j",   # Japanese
    "ko": "k",   # Korean
    "zh": "z",   # Chinese
}


class TtsProcessor:
    def __init__(self, device: str = "cuda", voice_presets_dir: str = "/app/voice_presets"):
        self.device = device
        self.sample_rate = 24000
        self._loaded = False
        self._kokoro_pipeline = None
        self._kokoro_lang = None

    def load(self):
        """Load Kokoro TTS."""
        from kokoro import KPipeline

        logger.info("Loading Kokoro TTS...")
        self._kokoro_pipeline = KPipeline(lang_code='a')
        self._kokoro_lang = 'a'
        self._loaded = True
        self.sample_rate = 24000
        logger.info("Kokoro TTS loaded (48 built-in voices, 24kHz)")

    def synthesize(self, text: str, voice: str = "adult_female", language: str = "en") -> bytes:
        """Synthesize text to speech. Returns PCM 16-bit mono audio bytes."""
        if not text.strip():
            return b""

        if not self._loaded:
            logger.warning("[TTS] Not loaded → silence")
            return self._silence(text)

        kokoro_voice = _KOKORO_VOICES.get(voice, "af_heart")
        lang_code = _KOKORO_LANG_CODES.get(language, "a")

        # Re-create pipeline if language changed
        if self._kokoro_lang != lang_code:
            from kokoro import KPipeline
            self._kokoro_pipeline = KPipeline(lang_code=lang_code)
            self._kokoro_lang = lang_code

        logger.info("[TTS] Kokoro [voice=%s, lang=%s]: %s", kokoro_voice, lang_code, text[:80])

        audio_chunks = []
        for _, _, audio in self._kokoro_pipeline(text, voice=kokoro_voice):
            if audio is not None:
                audio_chunks.append(audio)

        if not audio_chunks:
            logger.warning("[TTS] Kokoro produced no audio")
            return self._silence(text)

        audio = np.concatenate(audio_chunks)
        audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
        pcm = audio.tobytes()

        logger.info("[TTS] Kokoro → %.1fs (%d bytes)", len(audio) / self.sample_rate, len(pcm))
        return pcm

    def list_voices(self) -> list[dict]:
        """List available voices."""
        return [
            {"id": f"en/{vt}", "voice_type": vt, "language": "en",
             "name": vt.replace("_", " ").title(), "kokoro_voice": kid}
            for vt, kid in _KOKORO_VOICES.items()
        ]

    def _silence(self, text: str) -> bytes:
        word_count = max(len(text.split()), 1)
        return np.zeros(int(self.sample_rate * word_count * 0.1), dtype=np.int16).tobytes()
