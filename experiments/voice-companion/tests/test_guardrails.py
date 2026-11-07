import asyncio

from server.config import Persona
from server.pipeline import Conversation
from server.text import ends_sentence, fix_roles, out_of_character, tidy_opening


class ScriptedLLM:
    """Replies with the next scripted line each call; records the prompts it was sent."""
    model = "qwen3-0.6b"

    def __init__(self, *lines):
        self.lines, self.prompts = list(lines), []

    async def stream(self, messages, temperature=None):
        self.prompts.append((messages, temperature))
        for word in self.lines.pop(0).split(" "):
            yield word + " "


class NoTTS:
    async def synth(self, text):
        return None


def chat(llm, history=None):
    conv = Conversation(Persona(name="Aria", user_name="Kobe"), llm, NoTTS())
    conv.history = history or []

    async def sink(_):
        pass
    return conv, asyncio.run(conv.reply("hi", sink))


def test_assistant_speak_is_never_voiced():
    assert out_of_character("I'm just a language model, I don't have feelings.")
    assert out_of_character("我只是一个模型")
    assert not out_of_character("You're late, and I noticed.")
    _, said = chat(ScriptedLLM("As an AI I can't feel. But I missed you!"))
    assert said == "I missed you!"  # and the dangling "But" is tidied away


def test_roles_repaired_but_self_introduction_kept():
    assert fix_roles("I missed you, Aria.", "Aria", "Kobe") == "I missed you, Kobe."
    assert fix_roles("I'm Aria, remember?", "Aria", "Kobe") == "I'm Aria, remember?"


def test_reply_capped_at_two_sentences():
    _, said = chat(ScriptedLLM("One here. Two here. Three here. Four here."))
    assert said == "One here. Two here."
    assert not ends_sentence("I'm just...")


def test_repeat_triggers_hotter_retry_with_a_note():
    history = [{"role": "user", "content": "yo"}, {"role": "assistant", "content": "Max is chewing my shoes."}]
    llm = ScriptedLLM("Max is chewing my shoes. Ugh.", "Fine, tell me about your day.")
    _, said = chat(llm, history)
    assert said == "Fine, tell me about your day."
    second_prompt, temperature = llm.prompts[1]
    assert temperature is not None and "Say something different" in second_prompt[-1]["content"]


def test_never_silent():
    llm = ScriptedLLM(*["As an AI, no."] * 4)
    _, said = chat(llm)
    assert said == "Mm, say that again?"


def test_tidy_opening_after_dropped_sentence():
    assert tidy_opening("but I've been busy.") == "I've been busy."


def test_compact_history_for_small_models_keeps_user_facts():
    conv = Conversation(Persona(name="Aria", user_name="Kobe"), ScriptedLLM(), NoTTS())
    conv.history = [{"role": "user", "content": "My dog is Max."}, {"role": "assistant", "content": "Cute!"},
                    {"role": "user", "content": "I'm tired."}, {"role": "assistant", "content": "Aww."}]
    msgs = conv.messages("What's my dog called?")
    assert [m["role"] for m in msgs] == ["system", "user", "assistant", "user"]
    assert "My dog is Max." in msgs[1]["content"] and "Cute!" not in str(msgs)
