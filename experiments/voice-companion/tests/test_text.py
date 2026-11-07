from server.text import SentenceChunker, ThinkFilter, clean


def run_chunker(tokens):
    c = SentenceChunker()
    out = []
    for t in tokens:
        out += c.feed(t)
    return out + c.flush()


def test_english_sentences_split_on_terminal_punctuation():
    assert run_chunker(["Hi the", "re! How ", "are you? Fine."]) == ["Hi there!", "How are you?", "Fine."]


def test_english_period_needs_following_space():
    # "3.5" must not be cut
    assert run_chunker(["It costs 3.5 dollars. Ok"]) == ["It costs 3.5 dollars.", "Ok"]


def test_chinese_sentences():
    assert run_chunker(["你终于上线了！", "我等你好久了。"]) == ["你终于上线了！", "我等你好久了。"]


def test_first_chunk_cuts_early_at_comma_for_latency():
    out = run_chunker(["Well, you finally showed up, didn't you, after all this time."])
    assert out[0] == "Well, you finally showed up,"  # (4-char first chunks measured slower: CPU contention)


def test_punctuation_only_chunks_dropped_and_markdown_cleaned():
    assert run_chunker(["**Hey**!! 😀 ...", "\n"]) == ["Hey!"]
    assert clean("  `a`  b ") == "a b"
    assert clean("*smiles* hi (pouts)") == "hi"  # stage directions are never read aloud
    assert clean("Aria: hey there") == "hey there"  # no speaker labels


def test_think_filter_across_token_boundaries():
    f = ThinkFilter()
    tokens = ["<thi", "nk>secret plan</th", "ink>Hello", " <", "there"]
    out = "".join(f.feed(t) for t in tokens) + f.flush()
    assert out == "Hello <there"


def test_think_filter_unclosed_block_is_dropped():
    f = ThinkFilter()
    assert f.feed("<think>still thinking") + f.flush() == ""
