"""Pipeline orchestrator - chains denoise → VAD → STT → translate → TTS."""

import logging
import time
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
        self.translate = TranslateProcessor(model_name=settings.translate_model, device=settings.device)
        self.tts = TtsProcessor(device=settings.device, voice_presets_dir=settings.voice_presets_dir)

    def load_models(self):
        """Load all models at startup."""
        logger.info("Loading pipeline models...")

        t0 = time.time()
        self.denoise.load()
        logger.info("[LOAD] Denoise: %.1fs", time.time() - t0)

        t0 = time.time()
        self.vad.load()
        logger.info("[LOAD] VAD: %.1fs", time.time() - t0)

        t0 = time.time()
        self.stt.load()
        logger.info("[LOAD] STT (Whisper %s): %.1fs", settings.whisper_model, time.time() - t0)

        t0 = time.time()
        self.translate.load()
        logger.info("[LOAD] Translate (NLLB): %.1fs", time.time() - t0)

        t0 = time.time()
        self.tts.load()
        logger.info("[LOAD] TTS: %.1fs", time.time() - t0)

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
        """Process audio chunk in real-time mode."""
        total_start = time.time()
        audio = self._pcm_to_float(audio_bytes)
        audio_dur = len(audio) / settings.sample_rate

        # Step 1: Denoise
        t0 = time.time()
        if session.denoise:
            audio = self.denoise.process(audio, settings.sample_rate)
        denoise_ms = (time.time() - t0) * 1000

        # Step 2: VAD
        t0 = time.time()
        vad_result = self.vad.process(audio, settings.sample_rate)
        vad_ms = (time.time() - t0) * 1000

        result = {
            "speech_start": vad_result["speech_start"],
            "speech_end": vad_result["speech_end"],
        }

        stt_ms = 0
        translate_ms = 0
        tts_ms = 0

        # Only run full pipeline when speech segment is complete
        if vad_result["speech_end"] and vad_result["speech_audio"]:
            speech_audio = self._pcm_to_float(vad_result["speech_audio"])
            speech_dur = len(speech_audio) / settings.sample_rate

            # Step 3: STT
            t0 = time.time()
            transcript = self.stt.transcribe(speech_audio, language=session.source_lang)
            stt_ms = (time.time() - t0) * 1000

            if transcript.strip():
                result["transcript"] = transcript

                # Step 4: Translate
                t0 = time.time()
                translation = self.translate.translate(transcript, session.source_lang, session.target_lang)
                translate_ms = (time.time() - t0) * 1000
                result["translation"] = translation

                # Step 5: TTS
                t0 = time.time()
                tts_audio = self.tts.synthesize(translation, voice=session.voice, language=session.target_lang)
                tts_ms = (time.time() - t0) * 1000
                result["audio"] = tts_audio

                total_ms = (time.time() - total_start) * 1000
                logger.info(
                    "═══ REALTIME PIPELINE ═══\n"
                    "  Speech duration : %.1fs\n"
                    "  ① Denoise       : %7.0fms\n"
                    "  ② VAD           : %7.0fms\n"
                    "  ③ STT (Whisper) : %7.0fms\n"
                    "  ④ Translate     : %7.0fms\n"
                    "  ⑤ TTS   : %7.0fms\n"
                    "  ─────────────────────────\n"
                    "  TOTAL           : %7.0fms (%.1fs)\n"
                    "  \"%s\" → \"%s\"",
                    speech_dur,
                    denoise_ms, vad_ms, stt_ms, translate_ms, tts_ms,
                    total_ms, total_ms / 1000,
                    transcript[:60], translation[:60],
                )
                return result

        if not result.get("speech_start") and not result.get("speech_end"):
            return None

        return result

    def process_segment(self, audio_bytes: bytes, session) -> dict:
        """Process a complete audio segment (push-to-talk mode)."""
        total_start = time.time()
        audio = self._pcm_to_float(audio_bytes)
        audio_dur = len(audio) / settings.sample_rate

        result = {}

        # Step 1: Denoise
        t0 = time.time()
        if session.denoise:
            audio = self.denoise.process(audio, settings.sample_rate)
        denoise_ms = (time.time() - t0) * 1000

        # Step 2: STT
        t0 = time.time()
        transcript = self.stt.transcribe(audio, language=session.source_lang)
        stt_ms = (time.time() - t0) * 1000

        if not transcript.strip():
            total_ms = (time.time() - total_start) * 1000
            logger.info(
                "═══ PTT PIPELINE (empty) ═══\n"
                "  Audio duration  : %.1fs\n"
                "  ① Denoise       : %7.0fms\n"
                "  ② STT (Whisper) : %7.0fms → (empty)\n"
                "  TOTAL           : %7.0fms",
                audio_dur, denoise_ms, stt_ms, total_ms,
            )
            return result

        result["transcript"] = transcript

        # Step 3: Translate
        t0 = time.time()
        translation = self.translate.translate(transcript, session.source_lang, session.target_lang)
        translate_ms = (time.time() - t0) * 1000
        result["translation"] = translation

        # Step 4: TTS
        t0 = time.time()
        tts_audio = self.tts.synthesize(translation, voice=session.voice, language=session.target_lang)
        tts_ms = (time.time() - t0) * 1000
        result["audio"] = tts_audio

        total_ms = (time.time() - total_start) * 1000

        logger.info(
            "═══ PTT PIPELINE ═══\n"
            "  Audio duration  : %.1fs\n"
            "  ① Denoise       : %7.0fms\n"
            "  ② STT (Whisper) : %7.0fms\n"
            "  ③ Translate     : %7.0fms\n"
            "  ④ TTS   : %7.0fms\n"
            "  ─────────────────────────\n"
            "  TOTAL           : %7.0fms (%.1fs)\n"
            "  \"%s\" → \"%s\"",
            audio_dur,
            denoise_ms, stt_ms, translate_ms, tts_ms,
            total_ms, total_ms / 1000,
            transcript[:60], translation[:60],
        )

        return result
