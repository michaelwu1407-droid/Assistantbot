// UI + websocket session. Server protocol: see README "WebSocket protocol".
"use strict";

const $ = (id) => document.getElementById(id);
const els = ["orb", "status", "latency", "subtitle", "userLine", "micBtn", "error", "bargeIn",
  "textForm", "textInput", "resetBtn", "reloadBtn", "title", "byline", "avatar", "avatarInitial"]
  .reduce((o, id) => ((o[id] = $(id)), o), {});

const STATUS = {
  idle: "Tap the mic to start talking", listening: "Listening…", hearing: "Hearing you…",
  transcribing: "Catching that…", thinking: "Thinking…", speaking: "",
};
let ws, mic = null, ignoreUtterance = false, persona = { name: "Companion" }, karaokeTimer = 0;

function setState(state) {
  if (state === "listening" && !mic) state = "idle";
  els.orb.className = "orb " + state;
  els.status.textContent = STATUS[state] ?? "";
}
function showError(msg) { els.error.textContent = msg || ""; }
function setLevel(v) { document.documentElement.style.setProperty("--level", v.toFixed(3)); }

const player = new VC.Player({
  onSentence: (text, seconds) => { setState("speaking"); karaoke(text, seconds); },
  onIdle: () => setState("listening"),
  onLevel: setLevel,
});

// Karaoke subtitles: light up characters across the sentence's audio duration.
function karaoke(text, seconds) {
  cancelAnimationFrame(karaokeTimer);
  const chars = [...text];
  els.subtitle.replaceChildren(...chars.map((c) => Object.assign(document.createElement("span"), { textContent: c })));
  const start = performance.now();
  const step = () => {
    const lit = Math.ceil(chars.length * Math.min(1, (performance.now() - start) / (seconds * 1000)));
    els.subtitle.childNodes.forEach((n, i) => n.classList.toggle("lit", i < lit));
    if (lit < chars.length) karaokeTimer = requestAnimationFrame(step);
  };
  step();
}

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.binaryType = "arraybuffer";
  ws.onmessage = (e) => handle(JSON.parse(e.data));
  ws.onclose = () => { setState("idle"); els.status.textContent = "Disconnected. Reconnecting…"; setTimeout(connect, 1500); };
  ws.onopen = () => showError("");
}
function send(obj) { if (ws && ws.readyState === 1) ws.send(typeof obj === "string" ? obj : JSON.stringify(obj)); }

function handle(msg) {
  switch (msg.type) {
    case "state":
      if (msg.state === "speaking") {
        if (msg.latency_ms != null) els.latency.textContent = `first reply in ${(msg.latency_ms / 1000).toFixed(1)}s`;
        break; // the player flips to "speaking" when sound actually starts
      }
      if (msg.state !== "listening" || !player.busy) setState(msg.state);
      break;
    case "user": els.userLine.textContent = `${persona.user_name || "You"}: ${msg.text}`; break;
    case "sentence": showError(""); player.push(msg); break;
    case "done": if (!player.busy) setState("listening"); break;
    case "error": showError(msg.message); if (!player.busy) setState("listening"); break;
  }
}

function interrupt() { player.stop(); cancelAnimationFrame(karaokeTimer); send({ type: "interrupt" }); }

async function toggleMic() {
  player.ensureCtx(); // unlock audio on a user gesture
  if (mic) { mic.pause(); mic = null; els.micBtn.classList.remove("on"); setState("idle"); return; }
  try {
    els.status.textContent = "Loading voice detector…";
    const base = await VC.loadVad();
    mic = await vad.MicVAD.new({
      model: "v5",
      baseAssetPath: base.vad,
      onnxWASMBasePath: base.ort,
      positiveSpeechThreshold: 0.6,
      negativeSpeechThreshold: 0.45,
      redemptionMs: 700,
      minSpeechMs: 300,
      onSpeechStart: () => {
        ignoreUtterance = player.busy && !els.bargeIn.checked;
        if (!ignoreUtterance) setState("hearing");
      },
      onSpeechRealStart: () => { if (!ignoreUtterance && player.busy) interrupt(); },
      onVADMisfire: () => { if (!player.busy) setState("listening"); },
      onSpeechEnd: (audio) => {
        if (ignoreUtterance) { ignoreUtterance = false; return; }
        send(audio); // Float32 PCM, 16 kHz mono
      },
    });
    mic.start();
    els.micBtn.classList.add("on");
    setState("listening");
  } catch (err) {
    mic = null;
    setState("idle");
    showError(`Microphone unavailable: ${err.message || err}. You can still type.`);
  }
}

async function loadInfo(method = "GET") {
  const info = await (await fetch("/api/" + (method === "POST" ? "reload" : "info"), { method })).json();
  persona = info;
  document.title = info.name;
  els.title.textContent = info.name;
  els.byline.textContent = info.demo ? "demo mode · no models loaded" : `${info.llm} · voice: ${info.tts}`;
  els.avatarInitial.textContent = (info.name || "?")[0];
  els.avatar.querySelector("img")?.remove();
  if (info.avatar) els.avatar.prepend(Object.assign(document.createElement("img"), { src: info.avatar, alt: info.name }));
  if (!info.stt_ready && !info.demo) showError(info.stt_error || "Speech-to-text not loaded. Type instead.");
}

els.micBtn.onclick = toggleMic;
els.textForm.onsubmit = (e) => {
  e.preventDefault();
  const text = els.textInput.value.trim();
  if (!text) return;
  player.ensureCtx();
  interrupt();
  els.userLine.textContent = `${persona.user_name || "You"}: ${text}`;
  send({ type: "text", text });
  els.textInput.value = "";
};
els.resetBtn.onclick = () => { interrupt(); send({ type: "reset" }); els.subtitle.textContent = els.userLine.textContent = ""; };
els.reloadBtn.onclick = async () => {
  els.status.textContent = "Reloading models…";
  try { await loadInfo("POST"); showError(""); } catch (e) { showError("Reload failed: " + e.message); }
  setState(mic ? "listening" : "idle");
};

setState("idle");
connect();
loadInfo().catch(() => {});
