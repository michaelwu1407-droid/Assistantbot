"""FastAPI app: serves the web UI, /api/info, /api/reload and the /ws voice session."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles

from .config import ROOT
from .engine import Engine
from .session import Session


def create_app(demo: bool = False) -> FastAPI:
    engine = Engine(demo=demo)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        # Load models in the background so the page opens instantly and shows progress.
        task = asyncio.create_task(engine.reload())
        yield
        task.cancel()

    app = FastAPI(title="Voice Companion", lifespan=lifespan)
    app.state.engine = engine

    @app.get("/api/info")
    async def info() -> dict:
        await engine.recheck_llm()
        return engine.info()

    @app.post("/api/reload")
    async def reload() -> dict:
        await engine.reload()
        return engine.info()

    @app.websocket("/ws")
    async def ws(socket: WebSocket) -> None:
        await socket.accept()
        await Session(socket, engine).run()

    app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
    return app
