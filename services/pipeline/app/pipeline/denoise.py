"""DeepFilterNet noise reduction - runs on CPU (~50ms)."""

import logging
import numpy as np

logger = logging.getLogger(__name__)


def _patch_torchaudio():
    """Patch torchaudio.backend for newer torchaudio (>=2.1) compatibility."""
    try:
        import types
        import torchaudio
        if not hasattr(torchaudio, "backend"):
            backend = types.ModuleType("torchaudio.backend")
            common = types.ModuleType("torchaudio.backend.common")
            # AudioMetaData moved in newer torchaudio
            if hasattr(torchaudio, "AudioMetaData"):
                common.AudioMetaData = torchaudio.AudioMetaData
            else:
                common.AudioMetaData = type("AudioMetaData", (), {
                    "sample_rate": 0, "num_frames": 0, "num_channels": 0,
                    "bits_per_sample": 0, "encoding": "",
                })
            backend.common = common
            torchaudio.backend = backend
            import sys
            sys.modules["torchaudio.backend"] = backend
            sys.modules["torchaudio.backend.common"] = common
            logger.info("Patched torchaudio.backend for compatibility")
    except Exception as e:
        logger.debug("torchaudio patch not needed: %s", e)


class DenoiseProcessor:
    def __init__(self):
        self.model = None
        self.df_state = None

    def load(self):
        """Load DeepFilterNet model."""
        try:
            _patch_torchaudio()
            from df.enhance import enhance, init_df
            self.model, self.df_state, _ = init_df()
            logger.info("DeepFilterNet loaded on CPU")
        except Exception as e:
            logger.warning("DeepFilterNet not available: %s", e)

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
