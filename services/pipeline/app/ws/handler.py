"""WebSocket connection handler."""

import asyncio
import logging
import time

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

        # Queue for ordered realtime results: (seq, future)
        self._send_lock = asyncio.Lock()
        self._realtime_seq = 0
        self._next_send_seq = 0
        self._pending_results: dict[int, dict | None] = {}
        self._pending_event = asyncio.Event()

        # Start the ordered sender task
        sender_task = asyncio.create_task(self._ordered_sender(ws, session))

        try:
            while True:
                raw = await ws.receive()

                if raw.get("type") == "websocket.disconnect":
                    break

                if raw.get("bytes"):
                    await self._handle_audio(ws, session, raw["bytes"])
                elif raw.get("text"):
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
        finally:
            sender_task.cancel()
            try:
                await sender_task
            except asyncio.CancelledError:
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
            audio_data = session.clear_buffer()
            if audio_data:
                await self._process_audio_segment(ws, session, audio_data)

        elif isinstance(msg, SessionClose):
            await ws.close()

    async def _handle_audio(self, ws: WebSocket, session: Session, data: bytes):
        session.append_audio(data)

        if not session.is_recording:
            chunk_size = 16000  # 500ms of 16-bit 16kHz mono
            if len(session.audio_buffer) >= chunk_size:
                audio_data = session.clear_buffer()
                # Fire and forget — ordered sender handles sequence
                seq = self._realtime_seq
                self._realtime_seq += 1
                asyncio.create_task(self._process_realtime_parallel(seq, audio_data, session))

    async def _process_realtime_parallel(self, seq: int, audio_data: bytes, session: Session):
        """Process audio chunk in parallel, store result by sequence number."""
        try:
            t_start = time.time()
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                self.pipeline.process_realtime,
                audio_data,
                session,
            )

            if result is not None:
                result["_elapsed_ms"] = (time.time() - t_start) * 1000

            self._pending_results[seq] = result
            self._pending_event.set()

        except Exception as e:
            logger.exception("Pipeline error (seq=%d): %s", seq, e)
            self._pending_results[seq] = None
            self._pending_event.set()

    async def _ordered_sender(self, ws: WebSocket, session: Session):
        """Send realtime results to client in order."""
        try:
            while True:
                await self._pending_event.wait()
                self._pending_event.clear()

                # Send all consecutive ready results
                while self._next_send_seq in self._pending_results:
                    result = self._pending_results.pop(self._next_send_seq)
                    self._next_send_seq += 1

                    if result is None:
                        continue

                    elapsed_ms = result.get("_elapsed_ms", 0)

                    if result.get("speech_start"):
                        await ws.send_text(serialize_message(VadSpeechStart()))

                    if result.get("speech_end"):
                        await ws.send_text(serialize_message(VadSpeechEnd()))

                    if result.get("transcript"):
                        await ws.send_text(serialize_message(
                            TranscriptDone(text=result["transcript"], processing_time_ms=round(elapsed_ms))
                        ))

                    if result.get("translation"):
                        await ws.send_text(serialize_message(
                            TranslationDone(text=result["translation"], processing_time_ms=round(elapsed_ms))
                        ))

                    if result.get("audio"):
                        segment_id = session.next_segment_id()
                        await ws.send_bytes(result["audio"])
                        await ws.send_text(serialize_message(
                            AudioDone(segment_id=segment_id, processing_time_ms=round(elapsed_ms))
                        ))
                        logger.info("Realtime segment done in %.1fs", elapsed_ms / 1000)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.exception("Ordered sender error: %s", e)

    async def _process_audio_segment(self, ws: WebSocket, session: Session, audio_data: bytes):
        """Process a complete audio segment (push-to-talk mode)."""
        try:
            t_start = time.time()
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                self.pipeline.process_segment,
                audio_data,
                session,
            )

            elapsed_ms = (time.time() - t_start) * 1000

            if result.get("transcript"):
                await ws.send_text(serialize_message(
                    TranscriptDone(text=result["transcript"], processing_time_ms=round(elapsed_ms))
                ))

            if result.get("translation"):
                await ws.send_text(serialize_message(
                    TranslationDone(text=result["translation"], processing_time_ms=round(elapsed_ms))
                ))

            if result.get("audio"):
                segment_id = session.next_segment_id()
                await ws.send_bytes(result["audio"])
                await ws.send_text(serialize_message(
                    AudioDone(segment_id=segment_id, processing_time_ms=round(elapsed_ms))
                ))
                logger.info("PTT segment done in %.1fs", elapsed_ms / 1000)

        except Exception as e:
            logger.exception("Pipeline error: %s", e)
            await ws.send_text(serialize_message(
                ErrorMessage(code="pipeline_error", message=str(e))
            ))
