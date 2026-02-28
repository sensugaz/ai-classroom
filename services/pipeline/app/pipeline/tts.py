"""XTTS-v2 TTS - runs on GPU (~200-400ms)."""

import logging
import subprocess
import wave
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# XTTS-v2 supported language codes
XTTS_LANGUAGES = {
    "en": "en",
    "es": "es",
    "fr": "fr",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "pl": "pl",
    "tr": "tr",
    "ru": "ru",
    "nl": "nl",
    "cs": "cs",
    "ar": "ar",
    "zh": "zh-cn",
    "ja": "ja",
    "hu": "hu",
    "ko": "ko",
}

# espeak-ng voice mapping for generating default reference audio
_ESPEAK_VOICES = {
    ("en", "adult_male"): "en-us",
    ("en", "adult_female"): "en-us+f3",
    ("en", "child_male"): "en-us+m3",
    ("en", "child_female"): "en-us+f4",
    ("th", "adult_male"): "th",
    ("th", "adult_female"): "th+f3",
    ("th", "child_male"): "th+m3",
    ("th", "child_female"): "th+f4",
}

_REFERENCE_TEXTS = {
    "en": "Hello everyone, welcome to today's class. Let's begin our lesson together.",
    "th": "สวัสดีครับทุกคน ยินดีต้อนรับสู่ชั้นเรียนวันนี้ เรามาเริ่มบทเรียนกันเลยนะครับ",
}


class TtsProcessor:
    def __init__(self, device: str = "cuda", voice_presets_dir: str = "/app/voice_presets"):
        self.device = device
        self.voice_presets_dir = Path(voice_presets_dir)
        self.model = None
        self.sample_rate = 24000
        self._loaded = False

    def load(self):
        """Load XTTS-v2 model."""
        try:
            from TTS.api import TTS

            logger.info("Loading XTTS-v2 model on %s...", self.device)
            self.model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
            if self.device == "cuda":
                self.model = self.model.to("cuda")
            self._loaded = True
            self.sample_rate = 24000
            logger.info("XTTS-v2 loaded on %s", self.device)

            # Generate missing reference audio with espeak-ng
            self._ensure_reference_audio()

        except Exception as e:
            logger.warning("XTTS-v2 not available: %s", e)
            self._loaded = False

    def _ensure_reference_audio(self):
        """Generate missing reference audio. Try espeak-ng first, then synthetic fallback."""
        for (lang, voice_type), espeak_voice in _ESPEAK_VOICES.items():
            voice_dir = self.voice_presets_dir / lang / voice_type
            voice_dir.mkdir(parents=True, exist_ok=True)

            wav_file = voice_dir / "reference.wav"
            if wav_file.exists():
                logger.info("Reference exists: %s", wav_file)
                continue

            text = _REFERENCE_TEXTS.get(lang, _REFERENCE_TEXTS["en"])
            logger.info("Generating reference audio: %s/%s", lang, voice_type)

            # Try espeak-ng first
            try:
                result = subprocess.run(
                    ["espeak-ng", "-v", espeak_voice, "-s", "130", "-w", str(wav_file), text],
                    capture_output=True, timeout=10,
                )
                if wav_file.exists() and wav_file.stat().st_size > 100:
                    logger.info("Created reference (espeak-ng): %s", wav_file)
                    continue
            except (FileNotFoundError, Exception) as e:
                logger.info("espeak-ng not available: %s", e)

            # Fallback: generate synthetic speech-like WAV
            self._generate_synthetic_reference(wav_file, voice_type)

    def _generate_synthetic_reference(self, wav_file: Path, voice_type: str):
        """Generate a synthetic speech-like WAV file using numpy."""

        sr = 22050
        duration = 6.0  # seconds

        # Base frequency varies by voice type
        base_freq = {
            "adult_male": 120,
            "adult_female": 220,
            "child_male": 200,
            "child_female": 280,
        }.get(voice_type, 180)

        t = np.linspace(0, duration, int(sr * duration), dtype=np.float32)

        # Create speech-like audio with formants and amplitude modulation
        # Fundamental + harmonics
        audio = np.sin(2 * np.pi * base_freq * t) * 0.4
        audio += np.sin(2 * np.pi * base_freq * 2 * t) * 0.2
        audio += np.sin(2 * np.pi * base_freq * 3 * t) * 0.1

        # Amplitude modulation (syllable-like rhythm ~4Hz)
        envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 4.0 * t)
        audio *= envelope

        # Add some noise for naturalness
        audio += np.random.randn(len(t)).astype(np.float32) * 0.02

        # Fade in/out
        fade = int(sr * 0.1)
        audio[:fade] *= np.linspace(0, 1, fade)
        audio[-fade:] *= np.linspace(1, 0, fade)

        # Normalize
        audio = audio / (np.abs(audio).max() + 1e-6) * 0.8
        pcm = (audio * 32767).astype(np.int16)

        # Write WAV
        with wave.open(str(wav_file), "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(pcm.tobytes())

        logger.info("Created reference (synthetic): %s (%.1fs)", wav_file, duration)

    def _find_reference_audio(self, voice: str, language: str) -> str | None:
        """Find reference audio WAV for voice cloning."""
        voice_dir = self.voice_presets_dir / language / voice
        if not voice_dir.exists():
            # Fallback: try any language with same voice type
            for lang_dir in self.voice_presets_dir.iterdir():
                fallback = lang_dir / voice
                if fallback.exists():
                    voice_dir = fallback
                    break
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
                ref_audio = self._find_reference_audio(voice_dir.name, lang)
                voices.append({
                    "id": f"{lang}/{voice_dir.name}",
                    "voice_type": voice_dir.name,
                    "language": lang,
                    "name": voice_dir.name.replace("_", " ").title(),
                    "has_reference": ref_audio is not None,
                })
        return voices

    def synthesize(self, text: str, voice: str = "adult_female", language: str = "en") -> bytes:
        """Synthesize text to speech audio using XTTS-v2.

        Returns:
            PCM 16-bit 24kHz mono audio bytes
        """
        if not text.strip():
            logger.warning("[TTS] Empty text, skipping")
            return b""

        if not self._loaded:
            logger.warning("[TTS] XTTS-v2 not loaded → silence")
            return self._synthesize_silence(text)

        xtts_lang = XTTS_LANGUAGES.get(language)
        if not xtts_lang:
            logger.warning("[TTS] Language '%s' not in XTTS-v2 supported list → silence", language)
            return self._synthesize_silence(text)

        ref_audio = self._find_reference_audio(voice, language)
        if not ref_audio:
            logger.warning("[TTS] No reference audio found for voice='%s' lang='%s' → silence", voice, language)
            logger.warning("[TTS] Searched: %s", self.voice_presets_dir / language / voice)
            return self._synthesize_silence(text)

        try:
            logger.info("[TTS] XTTS-v2 synthesizing [lang=%s, voice=%s, ref=%s]: %s",
                        xtts_lang, voice, ref_audio, text[:80])

            wav = self.model.tts(text=text, speaker_wav=ref_audio, language=xtts_lang)

            # Convert float list to PCM 16-bit
            audio = np.array(wav, dtype=np.float32)
            audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
            pcm = audio.tobytes()

            duration_s = len(audio) / self.sample_rate
            logger.info("[TTS] Generated %.1fs audio (%d bytes)", duration_s, len(pcm))
            return pcm

        except Exception as e:
            logger.exception("[TTS] XTTS-v2 synthesis failed: %s", e)
            return self._synthesize_silence(text)

    def _synthesize_silence(self, text: str) -> bytes:
        """Generate short silence as fallback."""
        word_count = max(len(text.split()), 1)
        duration_samples = int(self.sample_rate * word_count * 0.1)
        silence = np.zeros(duration_samples, dtype=np.int16)
        return silence.tobytes()
