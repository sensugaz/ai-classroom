"""FastAPI + WebSocket entry point for pipeline server."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket

from .config import settings
from .models.loader import log_gpu_memory, check_gpu_available
from .pipeline.orchestrator import PipelineOrchestrator
from .ws.handler import ConnectionHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

pipeline = PipelineOrchestrator()
handler = ConnectionHandler(pipeline)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, clean up on shutdown."""
    logger.info("Starting pipeline server on device=%s", settings.device)
    check_gpu_available()
    pipeline.load_models()
    log_gpu_memory()
    yield
    logger.info("Shutting down pipeline server")


app = FastAPI(
    title="Classroom Translator Pipeline",
    version="0.1.0",
    lifespan=lifespan,
)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Main WebSocket endpoint for audio translation pipeline."""
    await handler.handle(ws)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "device": settings.device}


@app.get("/voices")
async def list_voices():
    """List available voice presets."""
    return {"voices": pipeline.tts.list_voices()}
