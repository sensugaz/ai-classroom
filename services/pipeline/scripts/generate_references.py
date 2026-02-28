"""Generate voice reference audio using espeak-ng.

Usage:
    python scripts/generate_references.py

Creates reference WAV files in voice_presets/ for XTTS-v2 voice cloning.
Uses espeak-ng (no GPU needed, runs in seconds).
"""

import subprocess
import shutil
from pathlib import Path

VOICE_PRESETS_DIR = Path(__file__).parent.parent / "voice_presets"

# espeak-ng voice mapping
VOICES = {
    "adult_female": "en-us+f3",
    "adult_male": "en-us",
    "child_female": "en-us+f4",
    "child_male": "en-us+m3",
}

TEXT = (
    "Hello everyone, welcome to today's classroom session. "
    "We will be learning something new and exciting together. "
    "Let's get started with our lesson."
)


def generate():
    # Check espeak-ng is installed
    if not shutil.which("espeak-ng"):
        print("ERROR: espeak-ng not installed. Run: sudo apt-get install -y espeak-ng")
        return

    for lang in ["en", "th"]:
        for voice_type, espeak_voice in VOICES.items():
            voice_dir = VOICE_PRESETS_DIR / lang / voice_type
            voice_dir.mkdir(parents=True, exist_ok=True)

            wav_file = voice_dir / "reference.wav"
            if wav_file.exists():
                print(f"  Skip {lang}/{voice_type} (exists)")
                continue

            print(f"  Generating {lang}/{voice_type}...")

            result = subprocess.run(
                ["espeak-ng", "-v", espeak_voice, "-s", "130", "-w", str(wav_file), TEXT],
                capture_output=True,
                timeout=10,
            )

            if result.returncode != 0:
                print(f"  ERROR: {result.stderr.decode()}")
                continue

            size = wav_file.stat().st_size
            print(f"  Created {wav_file} ({size} bytes)")

    print("\nDone! Reference audio files created in voice_presets/")
    print("Tip: Replace with real human voice WAV files for better quality.")


if __name__ == "__main__":
    generate()
