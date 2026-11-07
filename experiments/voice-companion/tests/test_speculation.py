import time

import numpy as np
from fastapi.testclient import TestClient

from server.app import create_app


class FakeSTT:
    text = "how was your day"

    def transcribe(self, pcm):
        time.sleep(0.05)
        return self.text


def until_done(ws):
    msgs = []
    while not msgs or msgs[-1]["type"] != "done":
        msgs.append(ws.receive_json())
    return msgs


def speculate(ws):
    ws.send_json({"type": "speculate"})
    ws.send_bytes(np.zeros(16000, dtype=np.float32).tobytes())


def test_commit_releases_the_held_reply():
    app = create_app(demo=True)
    with TestClient(app) as client:
        app.state.engine.stt = FakeSTT()
        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
            speculate(ws)
            time.sleep(0.6)  # the provisional reply is produced but held back
            ws.send_json({"type": "commit"})
            msgs = until_done(ws)
            kinds = [m["type"] for m in msgs]
            assert "sentence" in kinds
            assert msgs[kinds.index("user")]["text"] == "how was your day"


def test_cancel_discards_and_forgets_the_provisional_turn():
    app = create_app(demo=True)
    with TestClient(app) as client:
        stt = app.state.engine.stt = FakeSTT()
        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
            speculate(ws)
            time.sleep(0.6)
            ws.send_json({"type": "spec_cancel"})
            stt.text = "how was your day at work"  # the real, longer utterance
            ws.send_bytes(np.zeros(32000, dtype=np.float32).tobytes())
            msgs = until_done(ws)
            assert [m["text"] for m in msgs if m["type"] == "user"] == ["how was your day at work"]
            history = [m["content"] for m in app.state.last_session.conv.history]
            assert "how was your day" not in history  # the guess is not in her memory either
