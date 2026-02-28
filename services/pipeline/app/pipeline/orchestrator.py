"""Pipeline orchestrator - chains denoise → VAD → STT → translate → TTS."""

import logging
import numpy as np

from ..config import settings
from .denoise import DenoiseProcessor
from .vad import VadProcessor
from .stt import SttProcessor
from .translate import TranslateProcessor
from .tts import TtsProcessor

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    def __init__(self):
        self.denoise = DenoiseProcessor()
        self.vad = VadProcessor(threshold=settings.vad_threshold)
        self.stt = SttProcessor(model_size=settings.whisper_model, device=settings.device)
        self.translate = TranslateProcessor(model_name=settings.nllb_model, device=settings.device)
        self.tts = TtsProcessor(device=settings.device, voice_presets_dir=settings.voice_presets_dir)

    def load_models(self):
        """Load all models at startup."""
        logger.info("Loading pipeline models...")
        self.denoise.load()
        self.vad.load()
        self.stt.load()
        self.translate.load()
        self.tts.load()
        logger.info("All pipeline models loaded")

    def _pcm_to_float(self, pcm_bytes: bytes) -> np.ndarray:
        """Convert PCM 16-bit bytes to float32 numpy array."""
        audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32)
        audio /= 32768.0
        return audio

    def _float_to_pcm(self, audio: np.ndarray) -> bytes:
        """Convert float32 numpy array to PCM 16-bit bytes."""
        audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
        return audio.tobytes()

    def process_realtime(self, audio_bytes: bytes, session) -> dict | None:
        """Process audio chunk in real-time mode.

        Runs denoise → VAD. When speech ends, runs STT → translate → TTS.

        Returns:
            dict with results or None if no action needed
        """
        audio = self._pcm_to_float(audio_bytes)

        # Step 1: Denoise (CPU, ~50ms)
        if session.denoise:
            audio = self.denoise.process(audio, settings.sample_rate)

        # Step 2: VAD (CPU, ~30ms)
        vad_result = self.vad.process(audio, settings.sample_rate)

        result = {
            "speech_start": vad_result["speech_start"],
            "speech_end": vad_result["speech_end"],
        }

        # Only run full pipeline when speech segment is complete
        if vad_result["speech_end"] and vad_result["speech_audio"]:
            speech_audio = self._pcm_to_float(vad_result["speech_audio"])
            pipeline_result = self._run_stt_translate_tts(
                speech_audio, session.source_lang, session.target_lang, session.voice
            )
            result.update(pipeline_result)

        if not result.get("speech_start") and not result.get("speech_end") and not result.get("transcript"):
            return None

        return result

    def process_segment(self, audio_bytes: bytes, session) -> dict:
        """Process a complete audio segment (push-to-talk mode).

        Runs denoise → STT → translate → TTS (skips VAD).

        Returns:
            dict with transcript, translation, and audio
        """
        audio = self._pcm_to_float(audio_bytes)

        # Step 1: Denoise (CPU, ~50ms)
        if session.denoise:
            audio = self.denoise.process(audio, settings.sample_rate)

        # Steps 2-4: STT → translate → TTS
        return self._run_stt_translate_tts(
            audio, session.source_lang, session.target_lang, session.voice
        )

    def _run_stt_translate_tts(
        self, audio: np.ndarray, source_lang: str, target_lang: str, voice: str
    ) -> dict:
        """Run STT → translate → TTS pipeline.

        Args:
            audio: float32 numpy array
            source_lang: source language code
            target_lang: target language code
            voice: voice preset name

        Returns:
            dict with transcript, translation, audio keys
        """
        result = {}

        # STT (GPU, ~300ms)
        transcript = self.stt.transcribe(audio, language=source_lang)
        if not transcript.strip():
            return result
        result["transcript"] = transcript

        # Translate (GPU, ~200ms)
        translation = self.translate.translate(transcript, source_lang, target_lang)
        result["translation"] = translation

        # TTS (GPU, ~300ms)
        tts_audio = self.tts.synthesize(translation, voice=voice, language=target_lang)
        result["audio"] = tts_audio

        return result
