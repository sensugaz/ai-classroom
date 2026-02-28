"""WebSocket connection handler."""

import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect

from .protocol import (
    parse_client_message,
    serialize_message,
    SessionCreate,
    InputAudioStart,
    InputAudioStop,
    SessionClose,
    SessionCreated,
    VadSpeechStart,
    VadSpeechEnd,
    TranscriptDone,
    TranslationDone,
    AudioDone,
    ErrorMessage,
)
from .session import Session

logger = logging.getLogger(__name__)


class ConnectionHandler:
    def __init__(self, pipeline):
        self.pipeline = pipeline

    async def handle(self, ws: WebSocket):
        await ws.accept()
        session = Session()
        logger.info("WebSocket connected: %s", session.session_id)

        try:
            while True:
                raw = await ws.receive()

                if raw.get("type") == "websocket.disconnect":
                    break

                if raw.get("bytes"):
                    # Binary frame = audio data (PCM 16-bit 16kHz mono)
                    await self._handle_audio(ws, session, raw["bytes"])
                elif raw.get("text"):
                    # JSON text frame = control message
                    await self._handle_text(ws, session, raw["text"])

        except (WebSocketDisconnect, RuntimeError):
            pass
        except Exception as e:
            logger.exception("WebSocket error: %s", e)
            try:
                await ws.send_text(serialize_message(
                    ErrorMessage(code="internal_error", message=str(e))
                ))
            except Exception:
                pass

    async def _handle_text(self, ws: WebSocket, session: Session, text: str):
        try:
            msg = parse_client_message(text)
        except ValueError as e:
            await ws.send_text(serialize_message(
                ErrorMessage(code="invalid_message", message=str(e))
            ))
            return

        if isinstance(msg, SessionCreate):
            session.source_lang = msg.source_lang
            session.target_lang = msg.target_lang
            session.voice = msg.voice
            session.denoise = msg.denoise
            await ws.send_text(serialize_message(
                SessionCreated(session_id=session.session_id)
            ))

        elif isinstance(msg, InputAudioStart):
            session.is_recording = True
            session.audio_buffer.clear()

        elif isinstance(msg, InputAudioStop):
            session.is_recording = False
            # Process buffered audio (push-to-talk mode)
            audio_data = session.clear_buffer()
            if audio_data:
                await self._process_audio_segment(ws, session, audio_data)

        elif isinstance(msg, SessionClose):
            await ws.close()

    async def _handle_audio(self, ws: WebSocket, session: Session, data: bytes):
        session.append_audio(data)

        if not session.is_recording:
            # Real-time mode: run VAD on accumulated buffer
            # Feed ~500ms chunks to VAD (VAD internally processes 512-sample windows)
            chunk_size = 16000  # 500ms of 16-bit 16kHz mono
            if len(session.audio_buffer) >= chunk_size:
                audio_data = session.clear_buffer()
                await self._process_realtime(ws, session, audio_data)

    async def _process_realtime(self, ws: WebSocket, session: Session, audio_data: bytes):
        """Process audio in real-time mode with VAD."""
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                self.pipeline.process_realtime,
                audio_data,
                session,
            )

            if result is None:
                return

            if result.get("speech_start"):
                await ws.send_text(serialize_message(VadSpeechStart()))

            if result.get("speech_end"):
                await ws.send_text(serialize_message(VadSpeechEnd()))

            if result.get("transcript"):
                await ws.send_text(serialize_message(
                    TranscriptDone(text=result["transcript"])
                ))

            if result.get("translation"):
                await ws.send_text(serialize_message(
                    TranslationDone(text=result["translation"])
                ))

            if result.get("audio"):
                segment_id = session.next_segment_id()
                await ws.send_bytes(result["audio"])
                await ws.send_text(serialize_message(
                    AudioDone(segment_id=segment_id)
                ))

        except Exception as e:
            logger.exception("Pipeline error: %s", e)
            await ws.send_text(serialize_message(
                ErrorMessage(code="pipeline_error", message=str(e))
            ))

    async def _process_audio_segment(self, ws: WebSocket, session: Session, audio_data: bytes):
        """Process a complete audio segment (push-to-talk mode)."""
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                self.pipeline.process_segment,
                audio_data,
                session,
            )

            if result.get("transcript"):
                await ws.send_text(serialize_message(
                    TranscriptDone(text=result["transcript"])
                ))

            if result.get("translation"):
                await ws.send_text(serialize_message(
                    TranslationDone(text=result["translation"])
                ))

            if result.get("audio"):
                segment_id = session.next_segment_id()
                await ws.send_bytes(result["audio"])
                await ws.send_text(serialize_message(
                    AudioDone(segment_id=segment_id)
                ))

        except Exception as e:
            logger.exception("Pipeline error: %s", e)
            await ws.send_text(serialize_message(
                ErrorMessage(code="pipeline_error", message=str(e))
            ))
