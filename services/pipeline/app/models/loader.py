"""Model loading and GPU memory management."""

import logging
import torch

logger = logging.getLogger(__name__)


def log_gpu_memory():
    """Log current GPU memory usage."""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated() / 1024**3
        reserved = torch.cuda.memory_reserved() / 1024**3
        total = torch.cuda.get_device_properties(0).total_memory / 1024**3
        logger.info(
            "GPU Memory: %.1f GB allocated, %.1f GB reserved, %.1f GB total",
            allocated, reserved, total,
        )
    else:
        logger.info("CUDA not available, running on CPU")


def check_gpu_available() -> bool:
    """Check if CUDA GPU is available."""
    available = torch.cuda.is_available()
    if available:
        device_name = torch.cuda.get_device_name(0)
        logger.info("GPU available: %s", device_name)
    else:
        logger.warning("No GPU available, falling back to CPU")
    return available
