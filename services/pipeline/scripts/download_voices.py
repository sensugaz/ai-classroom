"""Download real human voice references from LibriSpeech (free, no auth needed).

Usage:
    python scripts/download_voices.py

Downloads 4 voice clips (~6-10s each) for XTTS-v2 voice cloning.
"""

import wave
import numpy as np
from pathlib import Path

VOICE_PRESETS_DIR = Path(__file__).parent.parent / "voice_presets"

# LibriSpeech known speaker IDs
# Female speakers: 1089, 1188, 1221, 121, 237
# Male speakers: 2094, 2830, 3570, 5105, 6829
SPEAKER_MAP = {
    "adult_female": {"gender": "female", "target_speakers": {1089, 1188, 1221, 121, 8555}},
    "adult_male": {"gender": "male", "target_speakers": {2094, 2830, 3570, 5105, 6829}},
    "child_female": {"gender": "female", "target_speakers": {1089, 1188, 1221, 121, 8555}},
    "child_male": {"gender": "male", "target_speakers": {2094, 2830, 3570, 5105, 6829}},
}

TARGET_DURATION = 8.0  # seconds
TARGET_SR = 22050


def download():
    try:
        from datasets import load_dataset
    except ImportError:
        print("Installing datasets library...")
        import subprocess
        subprocess.check_call(["pip", "install", "datasets", "soundfile"])
        from datasets import load_dataset

    print("Streaming LibriSpeech test-clean (no full download needed)...")
    ds = load_dataset(
        "openslr/librispeech_asr",
        "clean",
        split="test",
        streaming=True,
        trust_remote_code=True,
    )

    # Collect audio per speaker
    collected = {}  # speaker_id -> audio chunks
    needed_speakers = set()
    for cfg in SPEAKER_MAP.values():
        needed_speakers.update(cfg["target_speakers"])

    print(f"Looking for speakers: {needed_speakers}")
    found_speakers = set()

    for sample in ds:
        speaker_id = sample["speaker_id"]

        if speaker_id not in needed_speakers:
            continue

        if speaker_id not in collected:
            collected[speaker_id] = []

        audio = np.array(sample["audio"]["array"], dtype=np.float32)
        sr = sample["audio"]["sampling_rate"]

        # Resample if needed
        if sr != TARGET_SR:
            indices = np.linspace(0, len(audio) - 1, int(len(audio) * TARGET_SR / sr)).astype(int)
            audio = audio[indices]

        collected[speaker_id].append(audio)

        # Check total duration
        total_samples = sum(len(a) for a in collected[speaker_id])
        total_dur = total_samples / TARGET_SR

        if total_dur >= TARGET_DURATION:
            found_speakers.add(speaker_id)
            print(f"  Speaker {speaker_id}: {total_dur:.1f}s collected")

        # Stop when we have enough speakers
        if len(found_speakers) >= 2:
            break

    if not found_speakers:
        print("ERROR: Could not find enough audio. Check internet connection.")
        return

    # Assign speakers to voice types
    female_speakers = []
    male_speakers = []
    for sid in found_speakers:
        for voice_type, cfg in SPEAKER_MAP.items():
            if sid in cfg["target_speakers"]:
                if cfg["gender"] == "female":
                    female_speakers.append(sid)
                else:
                    male_speakers.append(sid)
                break

    # Pick one speaker per gender
    female_id = female_speakers[0] if female_speakers else list(found_speakers)[0]
    male_id = male_speakers[0] if male_speakers else list(found_speakers)[-1]

    assignments = {
        "adult_female": female_id,
        "adult_male": male_id,
        "child_female": female_id,  # same voice, pitch-shifted later
        "child_male": male_id,
    }

    # Save WAV files
    for voice_type, speaker_id in assignments.items():
        for lang in ["en"]:
            voice_dir = VOICE_PRESETS_DIR / lang / voice_type
            voice_dir.mkdir(parents=True, exist_ok=True)

            wav_file = voice_dir / "reference.wav"

            # Concatenate audio chunks
            chunks = collected.get(speaker_id, [])
            if not chunks:
                print(f"  Skip {lang}/{voice_type} (no audio)")
                continue

            audio = np.concatenate(chunks)

            # Trim to target duration
            max_samples = int(TARGET_DURATION * TARGET_SR)
            audio = audio[:max_samples]

            # Pitch shift for child voices
            if "child" in voice_type:
                factor = 1.15
                indices = np.arange(0, len(audio), factor)
                indices = indices[indices < len(audio)].astype(int)
                audio = audio[indices]

            # Fade in/out
            fade = int(TARGET_SR * 0.05)
            audio[:fade] *= np.linspace(0, 1, fade)
            audio[-fade:] *= np.linspace(1, 0, fade)

            # Normalize
            audio = audio / (np.abs(audio).max() + 1e-6) * 0.9
            pcm = (audio * 32767).astype(np.int16)

            with wave.open(str(wav_file), "w") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(TARGET_SR)
                wf.writeframes(pcm.tobytes())

            duration = len(pcm) / TARGET_SR
            print(f"  Saved {wav_file} ({duration:.1f}s, speaker {speaker_id})")

    # Copy en references to th (XTTS uses voice, not language, from reference)
    for voice_type in ["adult_female", "adult_male", "child_female", "child_male"]:
        en_ref = VOICE_PRESETS_DIR / "en" / voice_type / "reference.wav"
        th_dir = VOICE_PRESETS_DIR / "th" / voice_type
        th_ref = th_dir / "reference.wav"
        th_dir.mkdir(parents=True, exist_ok=True)
        if en_ref.exists() and not th_ref.exists():
            import shutil
            shutil.copy2(en_ref, th_ref)
            print(f"  Copied → {th_ref}")

    print("\nDone! Voice references ready in voice_presets/")
    print("Tip: Replace with your own WAV files for custom voices.")


if __name__ == "__main__":
    download()
