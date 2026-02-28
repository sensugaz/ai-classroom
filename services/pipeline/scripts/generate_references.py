"""Generate voice reference audio using simple single-speaker TTS models.

Usage:
    python scripts/generate_references.py

This creates reference WAV files in voice_presets/ for XTTS-v2 voice cloning.
Uses lightweight single-speaker models (no GPU needed, ~30s to run).
"""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

VOICE_PRESETS_DIR = Path(__file__).parent.parent / "voice_presets"

# Models to use for generating reference audio
# These are small single-speaker models that don't need reference audio themselves
MODELS = {
    "en_female": "tts_models/en/ljspeech/tacotron2-DDC",
    "en_male": "tts_models/en/ljspeech/tacotron2-DDC",  # same model, we'll pitch-shift
}

TEXTS = {
    "en": (
        "Hello everyone, welcome to today's classroom session. "
        "We will be learning something new and exciting together. "
        "Let's get started with our lesson."
    ),
}

def generate():
    from TTS.api import TTS
    import numpy as np
    import wave

    print("Loading TTS model for reference generation...")
    tts = TTS("tts_models/en/ljspeech/tacotron2-DDC")

    voices = {
        "adult_female": {"pitch_factor": 1.0},
        "adult_male": {"pitch_factor": 0.85},
        "child_female": {"pitch_factor": 1.2},
        "child_male": {"pitch_factor": 1.1},
    }

    for lang in ["en", "th"]:
        text = TEXTS.get(lang, TEXTS["en"])

        for voice_type, params in voices.items():
            voice_dir = VOICE_PRESETS_DIR / lang / voice_type
            voice_dir.mkdir(parents=True, exist_ok=True)

            wav_file = voice_dir / "reference.wav"
            if wav_file.exists():
                print(f"  Skip {lang}/{voice_type} (exists)")
                continue

            print(f"  Generating {lang}/{voice_type}...")

            # Generate with base model
            wav = tts.tts(text=text)
            audio = np.array(wav, dtype=np.float32)

            # Pitch shift by resampling
            pitch_factor = params["pitch_factor"]
            if pitch_factor != 1.0:
                indices = np.arange(0, len(audio), pitch_factor)
                indices = indices[indices < len(audio)].astype(int)
                audio = audio[indices]

            # Normalize
            audio = audio / (np.abs(audio).max() + 1e-6) * 0.9

            # Save as WAV
            sr = tts.synthesizer.output_sample_rate
            pcm = (audio * 32767).astype(np.int16)
            with wave.open(str(wav_file), "w") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sr)
                wf.writeframes(pcm.tobytes())

            duration = len(audio) / sr
            print(f"  Created {wav_file} ({duration:.1f}s)")

    print("\nDone! Reference audio files created in voice_presets/")
    print("Tip: Replace with real human voice WAV files for better quality.")


if __name__ == "__main__":
    generate()
