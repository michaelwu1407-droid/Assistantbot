import asyncio
import json

import httpx

from server.config import LLMConfig, TTSConfig
from server.llm import ChatLLM, LLMUnavailable
from server.tts import OpenAICompatTTS


def test_llm_parses_openai_sse_stream():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json={"data": [{"id": "qwen3-8b.gguf"}]})
        seen["url"] = str(request.url)
        seen["body"] = json.loads(request.content)
        chunks = [{"choices": [{"delta": {"role": "assistant"}}]},
                  {"choices": [{"delta": {"content": "Hi"}}]},
                  {"choices": [{"delta": {"content": " there"}}]}]
        sse = "".join(f"data: {json.dumps(c)}\n\n" for c in chunks) + "data: [DONE]\n\n"
        return httpx.Response(200, text=sse, headers={"content-type": "text/event-stream"})

    llm = ChatLLM(LLMConfig(base_url="http://llm/v1/"), client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))

    async def run():
        return [t async for t in llm.stream([{"role": "system", "content": "Be nice."}, {"role": "user", "content": "yo"}])]

    assert asyncio.run(run()) == ["Hi", " there"]
    assert seen["url"] == "http://llm/v1/chat/completions"
    assert seen["body"]["stream"] is True
    assert seen["body"]["model"] == "qwen3-8b.gguf"  # auto-picked from /models
    assert seen["body"]["messages"][-1]["content"].endswith("/no_think")  # Qwen3 soft switch


def test_tts_posts_openai_speech_request():
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert request.url.path == "/v1/audio/speech"
        assert body == {"model": "kokoro", "voice": "af_heart", "input": "hello", "response_format": "wav"}
        return httpx.Response(200, content=b"RIFFxxxx")

    tts = OpenAICompatTTS(TTSConfig(backend="openai", base_url="http://tts/v1"),
                          client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    assert asyncio.run(tts.synth("hello")) == b"RIFFxxxx"


def test_llm_auto_discovery_reports_a_clear_fix_when_nothing_runs():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")

    llm = ChatLLM(LLMConfig(), client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    try:
        asyncio.run(llm.connect())
    except LLMUnavailable as exc:
        assert "llama-server" in str(exc) and "Ollama" in str(exc)
    else:
        raise AssertionError("expected LLMUnavailable")
