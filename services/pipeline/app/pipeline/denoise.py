"""DeepFilterNet noise reduction - runs on CPU (~50ms)."""

import logging
import numpy as np

logger = logging.getLogger(__name__)


class DenoiseProcessor:
    def __init__(self):
        self.model = None
        self.df_state = None

    def load(self):
        """Load DeepFilterNet model."""
        try:
            from df.enhance import enhance, init_df
            self.model, self.df_state, _ = init_df()
            logger.info("DeepFilterNet loaded on CPU")
        except ImportError:
            logger.warning("DeepFilterNet not available, denoise disabled")

    def process(self, audio: np.ndarray, sample_rate: int = 16000) -> np.ndarray:
        """Apply noise reduction to audio.

        Args:
            audio: float32 numpy array, shape (samples,)
            sample_rate: input sample rate

        Returns:
            Denoised float32 numpy array
        """
        if self.model is None:
            return audio

        try:
            import torch
            from df.enhance import enhance

            audio_tensor = torch.from_numpy(audio).unsqueeze(0)
            enhanced = enhance(self.model, self.df_state, audio_tensor)
            return enhanced.squeeze(0).numpy()
        except Exception as e:
            logger.warning("DeepFilterNet failed, returning original: %s", e)
            return audio
