"""TTS — XTTS-v2 (natural voice cloning) with VITS/espeak-ng fallback.

Priority: XTTS-v2 → VITS → espeak-ng
"""

import logging
import subprocess
import tempfile
import wave
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# XTTS-v2 supported languages
_XTTS_LANGUAGES = {
    "en": "en", "es": "es", "fr": "fr", "de": "de", "it": "it",
    "pt": "pt", "pl": "pl", "tr": "tr", "ru": "ru", "nl": "nl",
    "cs": "cs", "ar": "ar", "zh": "zh-cn", "ja": "ja", "hu": "hu", "ko": "ko",
}

# espeak-ng voice mapping
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

# Reference text for auto-generating reference audio
_REFERENCE_TEXTS = {
    "en": "Hello everyone, welcome to today's class. Let's begin our lesson together.",
    "th": "สวัสดีครับทุกคน ยินดีต้อนรับสู่ชั้นเรียนวันนี้ เรามาเริ่มบทเรียนกันเลยนะครับ",
}

# VITS fallback speakers
_VITS_SPEAKERS = {
    "adult_female": "p225",
    "adult_male": "p226",
    "child_female": "p240",
    "child_male": "p243",
}


def _patch_transformers():
    """Patch transformers compatibility issue with coqui-tts."""
    try:
        import transformers.pytorch_utils as pu
        if not hasattr(pu, "isin_mps_friendly"):
            import torch
            pu.isin_mps_friendly = torch.isin
            logger.info("Patched transformers.pytorch_utils.isin_mps_friendly")
    except Exception:
        pass


class TtsProcessor:
    def __init__(self, device: str = "cuda", voice_presets_dir: str = "/app/voice_presets"):
        self.device = device
        self.voice_presets_dir = Path(voice_presets_dir)
        self.model = None
        self.sample_rate = 24000
        self._loaded = False
        self._backend = None  # "xtts", "vits", "espeak"

    def load(self):
        """Load TTS model. Try XTTS-v2 first, then VITS, then espeak-ng."""

        # Patch before importing TTS
        _patch_transformers()

        # 1. Try XTTS-v2 (best quality, voice cloning)
        if self._try_load_xtts():
            return

        # 2. Try VITS (multi-speaker, decent quality)
        if self._try_load_vits():
            return

        # 3. espeak-ng fallback
        if self._try_load_espeak():
            return

        logger.warning("No TTS backend available")

    def _try_load_xtts(self) -> bool:
        try:
            from TTS.api import TTS

            logger.info("Loading XTTS-v2 on %s...", self.device)
            self.model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
            if self.device == "cuda":
                self.model = self.model.to("cuda")
            self._loaded = True
            self._backend = "xtts"
            self.sample_rate = 24000
            logger.info("XTTS-v2 loaded on %s", self.device)

            # Auto-generate reference audio if missing
            self._ensure_reference_audio()
            return True
        except Exception as e:
            logger.warning("XTTS-v2 not available: %s", e)
            return False

    def _try_load_vits(self) -> bool:
        try:
            from TTS.api import TTS

            logger.info("Loading VITS (vctk) on %s...", self.device)
            self.model = TTS("tts_models/en/vctk/vits")
            if self.device == "cuda":
                self.model = self.model.to("cuda")
            self._loaded = True
            self._backend = "vits"
            self.sample_rate = self.model.synthesizer.output_sample_rate
            logger.info("VITS loaded on %s (sr=%d)", self.device, self.sample_rate)
            return True
        except Exception as e:
            logger.warning("VITS not available: %s", e)
            return False

    def _try_load_espeak(self) -> bool:
        try:
            result = subprocess.run(["espeak-ng", "--version"], capture_output=True, timeout=5)
            if result.returncode == 0:
                self._loaded = True
                self._backend = "espeak"
                self.sample_rate = 22050
                logger.info("Using espeak-ng fallback TTS")
                return True
        except Exception:
            pass
        return False

    def _ensure_reference_audio(self):
        """Generate missing reference audio with espeak-ng for XTTS-v2."""
        for (lang, voice_type), espeak_voice in _ESPEAK_VOICES.items():
            voice_dir = self.voice_presets_dir / lang / voice_type
            voice_dir.mkdir(parents=True, exist_ok=True)

            wav_file = voice_dir / "reference.wav"
            if wav_file.exists():
                continue

            text = _REFERENCE_TEXTS.get(lang, _REFERENCE_TEXTS["en"])
            try:
                subprocess.run(
                    ["espeak-ng", "-v", espeak_voice, "-s", "130", "-w", str(wav_file), text],
                    capture_output=True, timeout=10,
                )
                if wav_file.exists() and wav_file.stat().st_size > 100:
                    logger.info("Created reference (espeak-ng): %s", wav_file)
            except Exception as e:
                logger.warning("Failed to generate reference for %s/%s: %s", lang, voice_type, e)

    def synthesize(self, text: str, voice: str = "adult_female", language: str = "en") -> bytes:
        """Synthesize text to speech. Returns PCM 16-bit mono audio bytes."""
        if not text.strip():
            return b""

        if not self._loaded:
            logger.warning("[TTS] Not loaded → silence")
            return self._silence(text)

        if self._backend == "xtts":
            return self._synth_xtts(text, voice, language)
        elif self._backend == "vits":
            return self._synth_vits(text, voice)
        elif self._backend == "espeak":
            return self._synth_espeak(text, voice, language)
        return self._silence(text)

    def _synth_xtts(self, text: str, voice: str, language: str) -> bytes:
        """XTTS-v2 — natural voice cloning."""
        xtts_lang = _XTTS_LANGUAGES.get(language)
        if not xtts_lang:
            logger.warning("[TTS] Language '%s' not supported by XTTS → VITS fallback", language)
            return self._synth_espeak(text, voice, language)

        ref_audio = self._find_reference(voice, language)
        if not ref_audio:
            logger.warning("[TTS] No reference for voice=%s lang=%s → espeak fallback", voice, language)
            return self._synth_espeak(text, voice, language)

        try:
            logger.info("[TTS] XTTS-v2 [lang=%s, voice=%s]: %s", xtts_lang, voice, text[:80])
            wav = self.model.tts(text=text, speaker_wav=ref_audio, language=xtts_lang)

            audio = np.array(wav, dtype=np.float32)
            audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
            pcm = audio.tobytes()

            logger.info("[TTS] XTTS-v2 → %.1fs (%d bytes)", len(audio) / self.sample_rate, len(pcm))
            return pcm
        except Exception as e:
            logger.exception("[TTS] XTTS-v2 failed: %s", e)
            return self._synth_espeak(text, voice, language)

    def _synth_vits(self, text: str, voice: str) -> bytes:
        """VITS — multi-speaker built-in voices."""
        speaker = _VITS_SPEAKERS.get(voice, "p225")
        try:
            logger.info("[TTS] VITS [speaker=%s]: %s", speaker, text[:80])
            wav = self.model.tts(text=text, speaker=speaker)

            audio = np.array(wav, dtype=np.float32)
            audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
            pcm = audio.tobytes()

            logger.info("[TTS] VITS → %.1fs (%d bytes)", len(audio) / self.sample_rate, len(pcm))
            return pcm
        except Exception as e:
            logger.exception("[TTS] VITS failed: %s", e)
            return self._synth_espeak(text, voice, "en")

    def _synth_espeak(self, text: str, voice: str, language: str) -> bytes:
        """espeak-ng — CPU fallback."""
        espeak_voice = _ESPEAK_VOICES.get((language, voice), "en-us")
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                tmp_path = f.name

            subprocess.run(
                ["espeak-ng", "-v", espeak_voice, "-s", "150", "-w", tmp_path, text],
                capture_output=True, timeout=10, check=True,
            )

            with wave.open(tmp_path, "r") as wf:
                self.sample_rate = wf.getframerate()
                pcm = wf.readframes(wf.getnframes())

            Path(tmp_path).unlink(missing_ok=True)
            logger.info("[TTS] espeak-ng → %.1fs", len(pcm) / 2 / self.sample_rate)
            return pcm
        except Exception as e:
            logger.exception("[TTS] espeak-ng failed: %s", e)
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass
            return self._silence(text)

    def _find_reference(self, voice: str, language: str) -> str | None:
        """Find reference audio WAV for XTTS-v2."""
        for lang in [language, "en"]:
            voice_dir = self.voice_presets_dir / lang / voice
            if voice_dir.exists():
                for ext in ("*.wav", "*.mp3", "*.flac"):
                    files = list(voice_dir.glob(ext))
                    if files:
                        return str(files[0])
        return None

    def list_voices(self) -> list[dict]:
        """List available voices."""
        voices = []
        for voice_type in _VITS_SPEAKERS:
            voices.append({
                "id": f"en/{voice_type}",
                "voice_type": voice_type,
                "language": "en",
                "name": voice_type.replace("_", " ").title(),
                "has_reference": True,
            })
        return voices

    def _silence(self, text: str) -> bytes:
        word_count = max(len(text.split()), 1)
        return np.zeros(int(self.sample_rate * word_count * 0.1), dtype=np.int16).tobytes()
