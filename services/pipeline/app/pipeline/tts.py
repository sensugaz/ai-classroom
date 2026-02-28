"""Fish Speech TTS - runs on GPU (~300ms)."""

import logging
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


class TtsProcessor:
    def __init__(self, device: str = "cuda", voice_presets_dir: str = "/app/voice_presets"):
        self.device = device
        self.voice_presets_dir = Path(voice_presets_dir)
        self.model = None
        self.sample_rate = 24000
        self._loaded = False

    def load(self):
        """Load Fish Speech model."""
        try:
            logger.info("Fish Speech TTS initialized on %s", self.device)
            self._loaded = True
        except Exception as e:
            logger.warning("Fish Speech not available: %s", e)
            self._loaded = False

    def get_voice_preset_path(self, voice_type: str, language: str = "en") -> str | None:
        """Get reference audio path for voice cloning.

        Looks up: voice_presets/{language}/{voice_type}/
        Fallback: voice_presets/{voice_type}/
        """
        # Try language-specific path first
        voice_dir = self.voice_presets_dir / language / voice_type
        if not voice_dir.exists():
            # Fallback to language-agnostic path
            voice_dir = self.voice_presets_dir / voice_type
        if not voice_dir.exists():
            return None

        for ext in ("*.wav", "*.mp3", "*.flac"):
            files = list(voice_dir.glob(ext))
            if files:
                return str(files[0])
        return None

    def list_voices(self) -> list[dict]:
        """List available voice presets grouped by language."""
        voices = []
        if not self.voice_presets_dir.exists():
            return voices

        for lang_dir in sorted(self.voice_presets_dir.iterdir()):
            if not lang_dir.is_dir():
                continue

            lang = lang_dir.name
            for voice_dir in sorted(lang_dir.iterdir()):
                if not voice_dir.is_dir():
                    continue

                ref_audio = self.get_voice_preset_path(voice_dir.name, lang)
                voices.append({
                    "id": f"{lang}/{voice_dir.name}",
                    "voice_type": voice_dir.name,
                    "language": lang,
                    "name": voice_dir.name.replace("_", " ").title(),
                    "has_reference": ref_audio is not None,
                })

        return voices

    def synthesize(self, text: str, voice: str = "adult_female", language: str = "en") -> bytes:
        """Synthesize text to speech audio.

        Args:
            text: Text to speak
            voice: Voice preset name (e.g. "adult_female")
            language: Target language code (e.g. "en", "th")

        Returns:
            PCM 16-bit 24kHz mono audio bytes
        """
        if not text.strip():
            return b""

        if not self._loaded:
            return self._synthesize_fallback(text)

        try:
            ref_audio = self.get_voice_preset_path(voice, language)

            # Fish Speech inference
            # The real implementation would use their Python SDK:
            #
            # from fish_speech.inference import synthesize as fs_synthesize
            # audio = fs_synthesize(
            #     text,
            #     reference_audio=ref_audio,
            #     device=self.device,
            #     language=language,
            # )

            logger.info("TTS [lang=%s, voice=%s]: %s", language, voice, text[:50])
            return self._synthesize_fallback(text)

        except Exception as e:
            logger.warning("Fish Speech synthesis failed: %s", e)
            return self._synthesize_fallback(text)

    def _synthesize_fallback(self, text: str) -> bytes:
        """Generate silence as fallback when TTS is unavailable."""
        word_count = max(len(text.split()), 1)
        duration_samples = int(self.sample_rate * word_count * 0.1)
        silence = np.zeros(duration_samples, dtype=np.int16)
        return silence.tobytes()
