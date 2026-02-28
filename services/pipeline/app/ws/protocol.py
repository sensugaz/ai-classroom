"""OpenAI Realtime API-style WebSocket message protocol."""

from dataclasses import dataclass, field, asdict
from typing import Any
import json


# --- Client → Server messages ---

@dataclass
class SessionCreate:
    type: str = "session.create"
    source_lang: str = "th"
    target_lang: str = "en"
    voice: str = "adult_female"
    denoise: bool = True


@dataclass
class InputAudioStart:
    type: str = "input_audio.start"


@dataclass
class InputAudioStop:
    type: str = "input_audio.stop"


@dataclass
class SessionClose:
    type: str = "session.close"


# --- Server → Client messages ---

@dataclass
class SessionCreated:
    type: str = "session.created"
    session_id: str = ""


@dataclass
class VadSpeechStart:
    type: str = "vad.speech_start"


@dataclass
class VadSpeechEnd:
    type: str = "vad.speech_end"


@dataclass
class TranscriptPartial:
    type: str = "transcript.partial"
    text: str = ""


@dataclass
class TranscriptDone:
    type: str = "transcript.done"
    text: str = ""
    processing_time_ms: float = 0


@dataclass
class TranslationDone:
    type: str = "translation.done"
    text: str = ""
    processing_time_ms: float = 0


@dataclass
class AudioDone:
    type: str = "audio.done"
    segment_id: str = ""
    processing_time_ms: float = 0


@dataclass
class ErrorMessage:
    type: str = "error"
    code: str = ""
    message: str = ""


# Message type registry
CLIENT_MESSAGES = {
    "session.create": SessionCreate,
    "input_audio.start": InputAudioStart,
    "input_audio.stop": InputAudioStop,
    "session.close": SessionClose,
}

SERVER_MESSAGES = {
    "session.created": SessionCreated,
    "vad.speech_start": VadSpeechStart,
    "vad.speech_end": VadSpeechEnd,
    "transcript.partial": TranscriptPartial,
    "transcript.done": TranscriptDone,
    "translation.done": TranslationDone,
    "audio.done": AudioDone,
    "error": ErrorMessage,
}


def parse_client_message(data: str) -> Any:
    """Parse a JSON string into the appropriate client message type."""
    obj = json.loads(data)
    msg_type = obj.get("type")
    cls = CLIENT_MESSAGES.get(msg_type)
    if cls is None:
        raise ValueError(f"Unknown message type: {msg_type}")
    return cls(**{k: v for k, v in obj.items() if k in cls.__dataclass_fields__})


def serialize_message(msg: Any) -> str:
    """Serialize a dataclass message to JSON string."""
    return json.dumps(asdict(msg))
