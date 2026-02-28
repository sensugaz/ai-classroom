"""Silero VAD - runs on CPU (~30ms)."""

import logging
import numpy as np
import torch

logger = logging.getLogger(__name__)

# Silero VAD requires exactly 512 samples per call at 16kHz
VAD_WINDOW_SIZE = 512


class VadProcessor:
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        self.model = None
        self._speech_active = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()
        # Require ~500ms of silence before ending speech (~16 frames of 512 samples)
        self._silence_threshold = 16

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
        """Detect speech boundaries by processing audio in 512-sample windows.

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
        result = {
            "has_speech": False,
            "speech_start": False,
            "speech_end": False,
            "speech_audio": None,
        }

        # Process audio in VAD_WINDOW_SIZE chunks
        num_samples = len(audio)
        offset = 0

        while offset + VAD_WINDOW_SIZE <= num_samples:
            chunk = audio[offset:offset + VAD_WINDOW_SIZE]
            offset += VAD_WINDOW_SIZE

            tensor = torch.from_numpy(chunk).float()
            confidence = self.model(tensor, sample_rate).item()
            is_speech = confidence > self.threshold

            if is_speech:
                result["has_speech"] = True
                self._silence_frames = 0
                if not self._speech_active:
                    self._speech_active = True
                    self._speech_buffer.clear()
                    result["speech_start"] = True
                # Accumulate speech audio (store the full audio, not just this chunk)
                self._speech_buffer.extend(chunk.tobytes())
            else:
                if self._speech_active:
                    # Still accumulate during short silence gaps
                    self._speech_buffer.extend(chunk.tobytes())
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
