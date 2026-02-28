"""Per-connection session state."""

import uuid
from dataclasses import dataclass, field


@dataclass
class Session:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source_lang: str = "th"
    target_lang: str = "en"
    voice: str = "adult_female"
    denoise: bool = True
    is_recording: bool = False
    segment_counter: int = 0
    audio_buffer: bytearray = field(default_factory=bytearray)

    def next_segment_id(self) -> str:
        self.segment_counter += 1
        return f"seg_{self.segment_counter:04d}"

    def clear_buffer(self) -> bytes:
        data = bytes(self.audio_buffer)
        self.audio_buffer.clear()
        return data

    def append_audio(self, data: bytes) -> None:
        self.audio_buffer.extend(data)
