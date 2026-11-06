import numpy as np
from fastapi.testclient import TestClient

from server.app import create_app
from server.config import Persona
from server.pipeline import Conversation
from server.stt import is_phantom


def read_until_done(ws):
    msgs = []
    while not msgs or msgs[-1]["type"] != "done":
        msgs.append(ws.receive_json())
    return msgs


def test_reply_messages_carry_increasing_turn_ids():
    with TestClient(create_app(demo=True)) as client, client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "text", "text": "hi"})
        first = read_until_done(ws)
        ws.send_json({"type": "text", "text": "again"})
        second = read_until_done(ws)
        assert {m["turn"] for m in first} == {1}
        assert {m["turn"] for m in second} == {2}


def test_greeting_happens_once_and_again_after_reset():
    with TestClient(create_app(demo=True)) as client, client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "greet"})
        assert any(m["type"] == "sentence" for m in read_until_done(ws))
        ws.send_json({"type": "greet"})          # ignored: already greeted
        ws.send_json({"type": "text", "text": "x"})
        assert {m["turn"] for m in read_until_done(ws)} == {2}
        ws.send_json({"type": "reset"})
        ws.send_json({"type": "greet"})
        assert {m["turn"] for m in read_until_done(ws)} == {3}


def test_noise_is_ignored_quietly():
    class SilentSTT:
        def transcribe(self, pcm):
            return ""

    app = create_app(demo=True)
    with TestClient(app) as client:
        app.state.engine.stt = SilentSTT()
        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
            ws.send_bytes(np.zeros(8000, dtype=np.float32).tobytes())
            assert ws.receive_json()["state"] == "transcribing"
            assert ws.receive_json() == {"type": "state", "state": "listening", "ignored": True}


def test_trim_to_heard_keeps_only_heard_sentences():
    conv = Conversation(Persona(), None, None)
    conv.history = [{"role": "user", "content": "story?"},
                    {"role": "assistant", "content": "One. Two. Three."}]
    conv._last_reply = ["One.", "Two.", "Three."]
    conv.trim_to_heard(2)
    assert conv.history[-1]["content"] == "One. Two. —"
    conv.trim_to_heard(0)
    assert conv.history == [{"role": "user", "content": "story?"}]


def test_phantom_filter():
    assert is_phantom("Thanks for watching!", noisy=False)
    assert is_phantom("字幕由Amara.org社区提供", noisy=False)
    assert is_phantom("Thank you.", noisy=True)
    assert not is_phantom("Thank you.", noisy=False)   # a real thank-you
    assert not is_phantom("Hello Aria", noisy=True)


def test_greeting_cue_names_the_user():
    conv = Conversation(Persona(user_name="Kobe"), None, None)
    assert "Kobe" in conv.greeting_cue()
