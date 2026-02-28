"""TTS — Kokoro (natural built-in voices) with VITS/espeak-ng fallback.

Priority: Kokoro → VITS → espeak-ng
"""

import logging
import subprocess
import tempfile
import wave
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# Kokoro voice mapping — natural human voices
_KOKORO_VOICES = {
    "adult_female": "af_heart",      # warm, natural female
    "adult_male": "am_adam",          # clear, natural male
    "child_female": "af_bella",       # lighter female voice
    "child_male": "am_michael",       # lighter male voice
}

# VITS fallback speakers (built-in, no reference needed)
_VITS_SPEAKERS = {
    "adult_female": "p225",
    "adult_male": "p226",
    "child_female": "p240",
    "child_male": "p243",
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

# Kokoro language codes
_KOKORO_LANG_CODES = {
    "en": "a",   # American English
    "th": "a",   # Thai not supported — use English voice for translated text
    "es": "e",   # Spanish
    "fr": "f",   # French
    "ja": "j",   # Japanese
    "ko": "k",   # Korean (if supported)
    "zh": "z",   # Chinese
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
        self._backend = None  # "kokoro", "vits", "espeak"
        self._kokoro_pipeline = None

    def load(self):
        """Load TTS model. Try Kokoro first, then VITS, then espeak-ng."""

        # 1. Try Kokoro (best quality, built-in voices)
        if self._try_load_kokoro():
            return

        # Patch before importing coqui TTS
        _patch_transformers()

        # 2. Try VITS (multi-speaker, decent quality)
        if self._try_load_vits():
            return

        # 3. espeak-ng fallback
        if self._try_load_espeak():
            return

        logger.warning("No TTS backend available")

    def _try_load_kokoro(self) -> bool:
        try:
            from kokoro import KPipeline

            logger.info("Loading Kokoro TTS...")
            self._kokoro_pipeline = KPipeline(lang_code='a')  # American English
            self._kokoro_lang = 'a'
            self._loaded = True
            self._backend = "kokoro"
            self.sample_rate = 24000
            logger.info("Kokoro TTS loaded (48 built-in voices, 24kHz)")
            return True
        except Exception as e:
            logger.warning("Kokoro not available: %s", e)
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

    def synthesize(self, text: str, voice: str = "adult_female", language: str = "en") -> bytes:
        """Synthesize text to speech. Returns PCM 16-bit mono audio bytes."""
        if not text.strip():
            return b""

        if not self._loaded:
            logger.warning("[TTS] Not loaded → silence")
            return self._silence(text)

        if self._backend == "kokoro":
            return self._synth_kokoro(text, voice, language)
        elif self._backend == "vits":
            return self._synth_vits(text, voice)
        elif self._backend == "espeak":
            return self._synth_espeak(text, voice, language)
        return self._silence(text)

    def _synth_kokoro(self, text: str, voice: str, language: str) -> bytes:
        """Kokoro — natural built-in voices."""
        kokoro_voice = _KOKORO_VOICES.get(voice, "af_heart")
        lang_code = _KOKORO_LANG_CODES.get(language, "a")

        try:
            # Re-create pipeline if language changed
            if self._kokoro_lang != lang_code:
                from kokoro import KPipeline
                self._kokoro_pipeline = KPipeline(lang_code=lang_code)
                self._kokoro_lang = lang_code

            logger.info("[TTS] Kokoro [voice=%s, lang=%s]: %s", kokoro_voice, lang_code, text[:80])

            # Generate audio — Kokoro yields chunks
            audio_chunks = []
            for _, _, audio in self._kokoro_pipeline(text, voice=kokoro_voice):
                if audio is not None:
                    audio_chunks.append(audio)

            if not audio_chunks:
                logger.warning("[TTS] Kokoro produced no audio")
                return self._synth_espeak(text, voice, language)

            audio = np.concatenate(audio_chunks)
            audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
            pcm = audio.tobytes()

            logger.info("[TTS] Kokoro → %.1fs (%d bytes)", len(audio) / self.sample_rate, len(pcm))
            return pcm
        except Exception as e:
            logger.exception("[TTS] Kokoro failed: %s", e)
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

    def list_voices(self) -> list[dict]:
        """List available voices."""
        voices = []
        for voice_type, kokoro_id in _KOKORO_VOICES.items():
            voices.append({
                "id": f"en/{voice_type}",
                "voice_type": voice_type,
                "language": "en",
                "name": voice_type.replace("_", " ").title(),
                "kokoro_voice": kokoro_id,
                "has_reference": True,
            })
        return voices

    def _silence(self, text: str) -> bytes:
        word_count = max(len(text.split()), 1)
        return np.zeros(int(self.sample_rate * word_count * 0.1), dtype=np.int16).tobytes()
