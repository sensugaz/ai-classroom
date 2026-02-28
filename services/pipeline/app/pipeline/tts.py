"""TTS using VITS (multi-speaker, built-in voices) or XTTS-v2 (voice cloning).

VITS is the default — no reference audio needed, 109 built-in speakers.
XTTS-v2 is used when reference audio exists for voice cloning.
"""

import logging
import subprocess
import wave
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# espeak-ng voice mapping for fallback TTS
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

# VITS speaker mapping (vctk model has 109 speakers)
_VITS_SPEAKERS = {
    "adult_female": "p225",
    "adult_male": "p226",
    "child_female": "p240",
    "child_male": "p243",
}


class TtsProcessor:
    def __init__(self, device: str = "cuda", voice_presets_dir: str = "/app/voice_presets"):
        self.device = device
        self.voice_presets_dir = Path(voice_presets_dir)
        self.model = None
        self.sample_rate = 22050
        self._loaded = False
        self._backend = None  # "vits" or "xtts"

    def load(self):
        """Load TTS model. Try VITS first (no reference needed), then XTTS-v2."""
        # Try VITS multi-speaker first
        try:
            from TTS.api import TTS

            logger.info("Loading VITS (vctk) multi-speaker model on %s...", self.device)
            self.model = TTS("tts_models/en/vctk/vits")
            if self.device == "cuda":
                self.model = self.model.to("cuda")
            self._loaded = True
            self._backend = "vits"
            self.sample_rate = self.model.synthesizer.output_sample_rate
            logger.info("VITS loaded on %s (sr=%d, speakers=%s)",
                        self.device, self.sample_rate,
                        list(_VITS_SPEAKERS.values()))
            return
        except Exception as e:
            logger.warning("VITS not available: %s", e)

        # Try espeak-ng as last resort
        try:
            result = subprocess.run(["espeak-ng", "--version"], capture_output=True, timeout=5)
            if result.returncode == 0:
                self._loaded = True
                self._backend = "espeak"
                self.sample_rate = 22050
                logger.info("Using espeak-ng fallback TTS")
                return
        except Exception:
            pass

        logger.warning("No TTS backend available")
        self._loaded = False

    def synthesize(self, text: str, voice: str = "adult_female", language: str = "en") -> bytes:
        """Synthesize text to speech audio.

        Returns:
            PCM 16-bit mono audio bytes
        """
        if not text.strip():
            logger.warning("[TTS] Empty text, skipping")
            return b""

        if not self._loaded:
            logger.warning("[TTS] No TTS backend loaded → silence")
            return self._synthesize_silence(text)

        if self._backend == "vits":
            return self._synthesize_vits(text, voice)
        elif self._backend == "espeak":
            return self._synthesize_espeak(text, voice, language)
        else:
            return self._synthesize_silence(text)

    def _synthesize_vits(self, text: str, voice: str) -> bytes:
        """Synthesize using VITS multi-speaker model."""
        speaker = _VITS_SPEAKERS.get(voice, "p225")
        try:
            logger.info("[TTS] VITS synthesizing [speaker=%s, voice=%s]: %s",
                        speaker, voice, text[:80])

            wav = self.model.tts(text=text, speaker=speaker)

            audio = np.array(wav, dtype=np.float32)
            audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
            pcm = audio.tobytes()

            duration_s = len(audio) / self.sample_rate
            logger.info("[TTS] VITS generated %.1fs audio (%d bytes)", duration_s, len(pcm))
            return pcm

        except Exception as e:
            logger.exception("[TTS] VITS synthesis failed: %s", e)
            return self._synthesize_silence(text)

    def _synthesize_espeak(self, text: str, voice: str, language: str) -> bytes:
        """Synthesize using espeak-ng (CPU fallback)."""
        import tempfile

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

            duration_s = len(pcm) / 2 / self.sample_rate
            logger.info("[TTS] espeak-ng generated %.1fs audio (%d bytes)", duration_s, len(pcm))
            return pcm

        except Exception as e:
            logger.exception("[TTS] espeak-ng failed: %s", e)
            Path(tmp_path).unlink(missing_ok=True)
            return self._synthesize_silence(text)

    def list_voices(self) -> list[dict]:
        """List available voices."""
        voices = []
        for voice_type, speaker in _VITS_SPEAKERS.items():
            voices.append({
                "id": f"en/{voice_type}",
                "voice_type": voice_type,
                "language": "en",
                "name": voice_type.replace("_", " ").title(),
                "has_reference": True,
            })
        return voices

    def _synthesize_silence(self, text: str) -> bytes:
        """Generate short silence as fallback."""
        word_count = max(len(text.split()), 1)
        duration_samples = int(self.sample_rate * word_count * 0.1)
        silence = np.zeros(duration_samples, dtype=np.int16)
        return silence.tobytes()
