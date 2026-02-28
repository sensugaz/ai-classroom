"""Edge TTS - uses Microsoft Edge's online TTS service."""

import asyncio
import io
import logging
import struct
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# Voice mapping: (language, voice_type) -> edge-tts voice name
EDGE_VOICES = {
    ("th", "adult_male"): "th-TH-NiwatNeural",
    ("th", "adult_female"): "th-TH-PremwadeeNeural",
    ("th", "child_male"): "th-TH-NiwatNeural",
    ("th", "child_female"): "th-TH-PremwadeeNeural",
    ("en", "adult_male"): "en-US-GuyNeural",
    ("en", "adult_female"): "en-US-JennyNeural",
    ("en", "child_male"): "en-US-GuyNeural",
    ("en", "child_female"): "en-US-JennyNeural",
    ("zh", "adult_male"): "zh-CN-YunxiNeural",
    ("zh", "adult_female"): "zh-CN-XiaoxiaoNeural",
    ("ja", "adult_male"): "ja-JP-KeitaNeural",
    ("ja", "adult_female"): "ja-JP-NanamiNeural",
    ("ko", "adult_male"): "ko-KR-InJoonNeural",
    ("ko", "adult_female"): "ko-KR-SunHiNeural",
    ("es", "adult_male"): "es-ES-AlvaroNeural",
    ("es", "adult_female"): "es-ES-ElviraNeural",
    ("fr", "adult_male"): "fr-FR-HenriNeural",
    ("fr", "adult_female"): "fr-FR-DeniseNeural",
}

DEFAULT_VOICE = "en-US-JennyNeural"


class TtsProcessor:
    def __init__(self, device: str = "cuda", voice_presets_dir: str = "/app/voice_presets"):
        self.device = device
        self.voice_presets_dir = Path(voice_presets_dir)
        self.sample_rate = 24000
        self._loaded = False
        self._loop = None

    def load(self):
        """Initialize edge-tts."""
        try:
            import edge_tts  # noqa: F401
            self._loaded = True
            logger.info("Edge TTS initialized")
        except ImportError:
            logger.warning("edge-tts not installed, TTS will produce silence")
            self._loaded = False

    def _get_voice_name(self, voice: str, language: str) -> str:
        """Map voice_type + language to edge-tts voice name."""
        return EDGE_VOICES.get((language, voice), DEFAULT_VOICE)

    def list_voices(self) -> list[dict]:
        """List available voice presets grouped by language."""
        voices = []
        seen = set()
        for (lang, voice_type), voice_name in EDGE_VOICES.items():
            key = f"{lang}/{voice_type}"
            if key not in seen:
                seen.add(key)
                voices.append({
                    "id": key,
                    "voice_type": voice_type,
                    "language": lang,
                    "name": voice_type.replace("_", " ").title(),
                    "has_reference": False,
                    "edge_voice": voice_name,
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
            return self._synthesize_silence(text)

        try:
            voice_name = self._get_voice_name(voice, language)
            logger.info("TTS [lang=%s, voice=%s (%s)]: %s", language, voice, voice_name, text[:80])

            # Run async edge-tts in sync context
            mp3_data = self._run_edge_tts(text, voice_name)
            if not mp3_data:
                return self._synthesize_silence(text)

            # Convert MP3 to PCM
            pcm_data = self._mp3_to_pcm(mp3_data)
            return pcm_data

        except Exception as e:
            logger.warning("Edge TTS synthesis failed: %s", e)
            return self._synthesize_silence(text)

    def _run_edge_tts(self, text: str, voice_name: str) -> bytes:
        """Run edge-tts async communicate and return MP3 bytes."""
        import edge_tts

        async def _generate():
            communicate = edge_tts.Communicate(text, voice_name)
            buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    buffer.write(chunk["data"])
            return buffer.getvalue()

        # Get or create event loop
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # We're inside an async context (called from executor), create new loop
            new_loop = asyncio.new_event_loop()
            try:
                return new_loop.run_until_complete(_generate())
            finally:
                new_loop.close()
        else:
            return asyncio.run(_generate())

    def _mp3_to_pcm(self, mp3_data: bytes) -> bytes:
        """Convert MP3 bytes to PCM 16-bit mono at target sample rate."""
        try:
            import subprocess
            # Use ffmpeg to convert MP3 to raw PCM
            process = subprocess.run(
                [
                    "ffmpeg", "-i", "pipe:0",
                    "-f", "s16le",
                    "-acodec", "pcm_s16le",
                    "-ar", str(self.sample_rate),
                    "-ac", "1",
                    "pipe:1",
                ],
                input=mp3_data,
                capture_output=True,
                timeout=10,
            )
            if process.returncode == 0:
                return process.stdout
            else:
                logger.warning("ffmpeg conversion failed: %s", process.stderr[:200])
                return self._synthesize_silence("")
        except FileNotFoundError:
            logger.warning("ffmpeg not found, cannot convert MP3 to PCM")
            return self._synthesize_silence("")

    def _synthesize_silence(self, text: str) -> bytes:
        """Generate short silence as fallback when TTS is unavailable."""
        word_count = max(len(text.split()), 1)
        duration_samples = int(self.sample_rate * word_count * 0.1)
        silence = np.zeros(duration_samples, dtype=np.int16)
        return silence.tobytes()
