"""Silero VAD - runs on CPU (~30ms)."""

import logging
import numpy as np
import torch

logger = logging.getLogger(__name__)


class VadProcessor:
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        self.model = None
        self._speech_active = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()
        # Require ~500ms of silence before ending speech
        self._silence_threshold = 10

    def load(self):
        """Load Silero VAD model from torch hub."""
        self.model, _ = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            trust_repo=True,
        )
        # Set model to inference mode
        self.model.train(False)
        logger.info("Silero VAD loaded on CPU")

    def process(self, audio: np.ndarray, sample_rate: int = 16000) -> dict:
        """Detect speech boundaries.

        Args:
            audio: float32 numpy array, shape (samples,)
            sample_rate: input sample rate

        Returns:
            dict with keys:
                - has_speech: bool
                - speech_start: bool (transition to speech)
                - speech_end: bool (transition to silence)
                - speech_audio: bytes or None (complete utterance when speech_end)
        """
        tensor = torch.from_numpy(audio).float()
        confidence = self.model(tensor, sample_rate).item()
        is_speech = confidence > self.threshold

        result = {
            "has_speech": is_speech,
            "speech_start": False,
            "speech_end": False,
            "speech_audio": None,
        }

        if is_speech:
            self._silence_frames = 0
            if not self._speech_active:
                self._speech_active = True
                self._speech_buffer.clear()
                result["speech_start"] = True
            # Accumulate speech audio
            self._speech_buffer.extend(audio.tobytes())
        else:
            if self._speech_active:
                self._silence_frames += 1
                if self._silence_frames >= self._silence_threshold:
                    self._speech_active = False
                    result["speech_end"] = True
                    result["speech_audio"] = bytes(self._speech_buffer)
                    self._speech_buffer.clear()

        return result

    def reset(self):
        """Reset VAD state for new session."""
        self._speech_active = False
        self._silence_frames = 0
        self._speech_buffer.clear()
        if self.model is not None:
            self.model.reset_states()
