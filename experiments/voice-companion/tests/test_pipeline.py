import asyncio
import base64

import numpy as np
from fastapi.testclient import TestClient

from server.app import create_app
from server.config import Persona
from server.pipeline import Conversation


class FakeLLM:
    def __init__(self, text, delay=0.0):
        self.text, self.delay, self.calls = text, delay, []

    async def stream(self, messages, temperature=None):
        self.calls.append(messages)
        for word in self.text.split(" "):
            await asyncio.sleep(self.delay)
            yield word + " "


class FakeTTS:
    async def synth(self, text):
        return b"RIFF" + text.encode()


def collect():
    sent = []

    async def send(msg):
        sent.append(msg)
    return sent, send


def test_reply_streams_sentences_with_audio_and_records_history():
    llm = FakeLLM("<think>hmm</think>Hello there! You came back.")
    conv = Conversation(Persona(name="Aria", user_name="Kobe", system_prompt="I am {name}, you are {user_name}."), llm, FakeTTS())
    sent, send = collect()
    text = asyncio.run(conv.reply("hi", send))

    assert text == "Hello there! You came back."
    sentences = [m for m in sent if m["type"] == "sentence"]
    assert [s["text"] for s in sentences] == ["Hello there!", "You came back."]
    assert base64.b64decode(sentences[0]["audio"]) == b"RIFFHello there!"
    assert sent[-1] == {"type": "done"}
    assert "Aria" in llm.calls[0][0]["content"] and "Kobe" in llm.calls[0][0]["content"]
    assert conv.history == [{"role": "user", "content": "hi"},
                            {"role": "assistant", "content": "Hello there! You came back."}]


def test_cancelled_reply_keeps_alternating_roles():
    llm = FakeLLM("one. two. three. four. five.", delay=0.05)
    conv = Conversation(Persona(), llm, FakeTTS())
    sent, send = collect()

    async def run():
        task = asyncio.create_task(conv.reply("first", send))
        await asyncio.sleep(0.01)  # cancel before anything is said
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    asyncio.run(run())

    msgs = conv.messages("second")
    roles = [m["role"] for m in msgs]
    assert roles == ["system", "user"]
    assert msgs[1]["content"] == "first\nsecond"


def test_websocket_text_turn_in_demo_mode():
    with TestClient(create_app(demo=True)) as client:
        assert client.get("/api/info").json()["demo"] is True
        assert "Voice Companion" in client.get("/").text
        with client.websocket_connect("/ws") as ws:
            assert ws.receive_json() == {"type": "state", "state": "listening"}
            ws.send_json({"type": "text", "text": "hello"})
            msgs = []
            while not msgs or msgs[-1]["type"] != "done":
                msgs.append(ws.receive_json())
            sentences = [m for m in msgs if m["type"] == "sentence"]
            assert sentences and sentences[0]["audio"] is None  # browser voice
            # audio without STT loaded reports a clear error instead of crashing
            ws.send_bytes(np.zeros(1600, dtype=np.float32).tobytes())
            assert ws.receive_json()["type"] == "error"


def test_websocket_audio_turn_uses_stt_then_replies():
    class FakeSTT:
        def transcribe(self, pcm):
            assert pcm.dtype == np.float32 and len(pcm) == 16000
            return "how was your day"

    app = create_app(demo=True)
    with TestClient(app) as client:
        app.state.engine.stt = FakeSTT()
        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
            ws.send_bytes(np.zeros(16000, dtype=np.float32).tobytes())
            msgs = []
            while not msgs or msgs[-1]["type"] != "done":
                msgs.append(ws.receive_json())
            kinds = [m["type"] for m in msgs]
            assert kinds[:2] == ["state", "user"] and msgs[1]["text"] == "how was your day"
            assert "sentence" in kinds
