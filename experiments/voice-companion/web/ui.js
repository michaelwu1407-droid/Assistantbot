// Rendering helpers: orb state, karaoke subtitles, health chips, banner.
"use strict";

const $ = (id) => document.getElementById(id);
const els = ["orb", "status", "latency", "subtitle", "userLine", "micBtn", "bargeIn", "banner", "health",
  "textForm", "textInput", "resetBtn", "reloadBtn", "title", "avatar", "avatarInitial"]
  .reduce((o, id) => ((o[id] = $(id)), o), {});

const UI = {
  persona: { name: "Companion", user_name: "You" },
  micOn: false,
  karaoke: { raf: 0, chars: 0, start: 0, seconds: 1, manual: 0 },

  setState(state) {
    if (state === "listening" && !UI.micOn) state = "idle";
    const name = UI.persona.name;
    const text = {
      idle: UI.micOn ? "" : `Tap the mic (or press Space) to talk to ${name}`,
      listening: "Listening…", hearing: "Hearing you…", transcribing: "Catching that…",
      thinking: `${name} is thinking…`, speaking: "",
    }[state] ?? "";
    els.orb.className = "orb " + state;
    els.status.textContent = text;
    if (state === "thinking" || state === "transcribing") UI.thinkingDots();
  },

  setLevel(v) { document.documentElement.style.setProperty("--level", v.toFixed(3)); },

  thinkingDots() {
    cancelAnimationFrame(UI.karaoke.raf);
    els.subtitle.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
  },

  // Light characters up across the sentence. Browser voices report word boundaries,
  // which take over from the time estimate when they arrive.
  startKaraoke(text, seconds) {
    cancelAnimationFrame(UI.karaoke.raf);
    const chars = [...text];
    els.subtitle.replaceChildren(...chars.map((c) => Object.assign(document.createElement("span"), { textContent: c })));
    Object.assign(UI.karaoke, { chars: chars.length, start: performance.now(), seconds, manual: 0 });
    const step = () => {
      const k = UI.karaoke;
      const timed = Math.ceil(k.chars * Math.min(1, (performance.now() - k.start) / (k.seconds * 1000)));
      UI.lightUpTo(Math.max(timed, k.manual));
      if (Math.max(timed, k.manual) < k.chars) k.raf = requestAnimationFrame(step);
    };
    step();
  },

  karaokeProgress(charIndex) { UI.karaoke.manual = Math.max(UI.karaoke.manual, charIndex); },

  lightUpTo(n) { els.subtitle.childNodes.forEach((node, i) => node.classList?.toggle("lit", i < n)); },

  clearSubtitle() { cancelAnimationFrame(UI.karaoke.raf); els.subtitle.textContent = ""; },

  showUser(text) { els.userLine.textContent = text ? `${UI.persona.user_name || "You"}: ${text}` : ""; },

  // Problems show as a banner with what to do; a typed-in error clears on the next good event.
  banner(msg) { els.banner.textContent = msg || ""; els.banner.hidden = !msg; },

  applyInfo(info) {
    UI.persona = info;
    document.title = info.name;
    els.title.textContent = info.name;
    els.avatarInitial.textContent = (info.name || "?")[0];
    const img = els.avatar.querySelector("img");
    if (info.avatar && (!img || img.getAttribute("src") !== info.avatar)) {
      img?.remove();
      els.avatar.prepend(Object.assign(document.createElement("img"), { src: info.avatar, alt: info.name }));
    } else if (!info.avatar) img?.remove();

    let problem = "";
    for (const chip of els.health.querySelectorAll(".chip")) {
      const st = info.status[chip.dataset.key];
      chip.className = "chip " + ((info.loading && !st.ok) || st.busy ? "busy" : st.ok ? (st.error ? "warn" : "ok") : "bad");
      chip.title = st.error || st.label;
      if (!info.loading && st.error && !problem) problem = st.error;
    }
    if (info.loading) els.status.textContent = "Waking up… loading models";
    else if (/^(Waking|Reloading)/.test(els.status.textContent)) UI.setState(UI.micOn ? "listening" : "idle");
    UI.banner(problem);
    return info;
  },
};
