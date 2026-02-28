"""Download clean single-utterance voice references from LibriSpeech.

Usage:
    python scripts/download_voices.py

Finds single long utterances (>=6s) per speaker — no concatenation.
"""

import wave
import numpy as np
from pathlib import Path

VOICE_PRESETS_DIR = Path(__file__).parent.parent / "voice_presets"

# LibriSpeech test-clean speakers
# Female: 1089 (clear, studio quality), 1221, 237
# Male: 2830 (clear voice), 5105, 6829
WANTED = {
    "female": [1089, 1221, 237, 121, 1188],
    "male": [2830, 5105, 6829, 2094, 3570],
}

MIN_DURATION = 6.0  # seconds — single utterance, no concat
TARGET_SR = 22050


def save_wav(path: Path, audio: np.ndarray, sr: int):
    """Save float32 audio as 16-bit WAV."""
    # Gentle fade in/out
    fade = int(sr * 0.02)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)

    # Normalize
    audio = audio / (np.abs(audio).max() + 1e-6) * 0.9
    pcm = (audio * 32767).astype(np.int16)

    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())

    return len(pcm) / sr


def download():
    try:
        from datasets import load_dataset
    except ImportError:
        import subprocess
        subprocess.check_call(["pip", "install", "datasets", "soundfile"])
        from datasets import load_dataset

    print("Streaming LibriSpeech test-clean...")
    ds = load_dataset(
        "openslr/librispeech_asr",
        "clean",
        split="test",
        streaming=True,
        trust_remote_code=True,
    )

    all_wanted = set()
    for ids in WANTED.values():
        all_wanted.update(ids)

    # Find single long utterance per speaker
    found = {}  # speaker_id -> (audio, duration)
    need_female = True
    need_male = True

    print(f"Looking for single utterances >= {MIN_DURATION}s...")

    for sample in ds:
        sid = sample["speaker_id"]

        if sid not in all_wanted:
            continue
        if sid in found:
            continue

        audio = np.array(sample["audio"]["array"], dtype=np.float32)
        sr = sample["audio"]["sampling_rate"]

        # Resample to target SR
        if sr != TARGET_SR:
            indices = np.linspace(0, len(audio) - 1, int(len(audio) * TARGET_SR / sr)).astype(int)
            audio = audio[indices]

        duration = len(audio) / TARGET_SR

        # Only accept single utterances >= MIN_DURATION
        if duration >= MIN_DURATION:
            # Trim to 10s max
            max_samples = int(10.0 * TARGET_SR)
            audio = audio[:max_samples]
            duration = len(audio) / TARGET_SR

            found[sid] = audio
            gender = "female" if sid in WANTED["female"] else "male"
            print(f"  Found speaker {sid} ({gender}): {duration:.1f}s single utterance")

            if gender == "female":
                need_female = False
            else:
                need_male = False

        # Stop when we have both genders
        if not need_female and not need_male:
            break

    if not found:
        print("ERROR: No suitable utterances found.")
        return

    # Pick best speaker per gender
    female_id = None
    male_id = None
    for sid in WANTED["female"]:
        if sid in found:
            female_id = sid
            break
    for sid in WANTED["male"]:
        if sid in found:
            male_id = sid
            break

    # Fallback
    if not female_id:
        female_id = list(found.keys())[0]
    if not male_id:
        male_id = list(found.keys())[-1]

    print(f"\nUsing: female=speaker {female_id}, male=speaker {male_id}")

    assignments = {
        "adult_female": female_id,
        "adult_male": male_id,
        "child_female": female_id,
        "child_male": male_id,
    }

    for voice_type, sid in assignments.items():
        audio = found[sid]

        for lang in ["en", "th"]:
            voice_dir = VOICE_PRESETS_DIR / lang / voice_type
            voice_dir.mkdir(parents=True, exist_ok=True)

            wav_file = voice_dir / "reference.wav"
            dur = save_wav(wav_file, audio.copy(), TARGET_SR)
            print(f"  Saved {wav_file} ({dur:.1f}s, speaker {sid})")

    print("\nDone! Clean single-utterance references ready.")
    print("Tip: For best quality, replace with your own 6-10s WAV recording.")


if __name__ == "__main__":
    download()
