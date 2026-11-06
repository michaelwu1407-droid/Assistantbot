// Session: websocket, microphone + VAD, barge-in. Protocol: see README.
"use strict";

let ws = null, mic = null, greeted = false;
let replyStart = 0;            // when the user finished their turn (for the latency readout)
// Her turn runs from "thinking" until "done", including silent gaps between sentences.
const turn = { latest: 0, cancelled: 0, active: false };
const herTurn = () => player.busy || turn.active;
// Barge-in: when the user seems to talk over her we duck her first, and only stop
// once ~400 ms of confident speech confirms it (her own echo rarely gets that far).
const barge = { pending: false, frames: 0, done: false, ignore: false, preempt: false };
const BARGE_FRAMES = 12;       // v5 frames are 32 ms

const player = new VC.Player({
  onSentence: (item, seconds) => {
    if (item.id === 0 && replyStart) {
      els.latency.textContent = `replied in ${((performance.now() - replyStart) / 1000).toFixed(1)}s`;
      replyStart = 0;
    }
    UI.setState("speaking");
    UI.startKaraoke(item.text, seconds);
  },
  onProgress: UI.karaokeProgress,
  onIdle: () => UI.setState("listening"),
  onLevel: (v) => { if (player.busy) UI.setLevel(v); },
});

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onmessage = (e) => handle(JSON.parse(e.data));
  ws.onopen = () => { if (mic && !greeted) greet(); };
  ws.onclose = () => {
    player.stop();
    els.status.textContent = "Lost connection, reconnecting…";
    setTimeout(connect, 1500);
  };
}
const send = (obj) => ws && ws.readyState === 1 && ws.send(obj instanceof Float32Array ? obj : JSON.stringify(obj));

function handle(msg) {
  if (msg.turn != null) {
    if (msg.turn <= turn.cancelled) return; // a reply we already cut off
    turn.latest = Math.max(turn.latest, msg.turn);
  }
  const userTalking = els.orb.classList.contains("hearing");
  switch (msg.type) {
    case "state":
      if (msg.turn != null && msg.state === "thinking") turn.active = true;
      if (msg.ignored) { UI.clearSubtitle(); replyStart = 0; }
      if (!player.busy && !userTalking) UI.setState(msg.state);
      break;
    case "user": UI.banner(""); UI.showUser(msg.text); break;
    case "sentence": UI.banner(""); player.push(msg); break;
    case "done":
      turn.active = false;
      if (!player.busy && !userTalking) { UI.setState("listening"); if (!els.subtitle.querySelector("span:not(.dots)")) UI.clearSubtitle(); }
      break;
    case "error":
      turn.active = false;
      UI.banner(msg.message);
      if (!player.busy) { UI.clearSubtitle(); UI.setState("listening"); }
      break;
  }
}

// Cut her off: stop audio, drop anything still in flight for this turn, and tell the
// server how many sentences were heard so her memory matches what the user heard.
function interrupt() {
  if (!herTurn()) return;
  const heard = player.heard;
  turn.cancelled = turn.latest;
  turn.active = false;
  player.stop();
  send({ type: "interrupt", heard });
}

function greet() { greeted = true; replyStart = performance.now(); send({ type: "greet" }); }

const vadCallbacks = {
  onSpeechStart: () => {
    // While she is audible, wait for proof it's really the user (duck meanwhile).
    // While she is only thinking or between sentences, the user simply takes the floor.
    Object.assign(barge, { pending: player.busy, frames: 0, done: false, ignore: false, preempt: !player.busy && turn.active });
    if (barge.pending) {
      if (els.bargeIn.checked) player.duck(true); else barge.ignore = true;
    } else UI.setState("hearing");
  },
  onSpeechRealStart: () => {
    if (barge.preempt) { barge.preempt = false; interrupt(); UI.setState("hearing"); }
  },
  onFrameProcessed: (probs, frame) => {
    if (!player.busy) {
      let sum = 0;
      for (let i = 0; i < frame.length; i += 4) sum += frame[i] * frame[i];
      UI.setLevel(Math.min(1, Math.sqrt(sum / (frame.length / 4)) * 9));
    }
    if (barge.pending && !barge.done && !barge.ignore) {
      barge.frames = probs.isSpeech > 0.75 ? barge.frames + 1 : Math.max(0, barge.frames - 1);
      if (barge.frames >= BARGE_FRAMES) { barge.done = true; interrupt(); UI.setState("hearing"); }
    }
  },
  onVADMisfire: () => {
    if (barge.pending && !barge.done) player.duck(false);
    barge.pending = barge.preempt = false;
    if (!player.busy) UI.setState("listening");
  },
  onSpeechEnd: (audio) => {
    const wasBarge = barge.pending, confirmed = barge.done;
    barge.pending = barge.preempt = false;
    if (wasBarge && !confirmed) { player.duck(false); return; } // her echo or a cough: carry on
    replyStart = performance.now();
    UI.setState("transcribing");
    send(audio); // Float32 PCM, 16 kHz mono
  },
};

async function toggleMic() {
  player.ensureCtx(); // unlock audio on a user gesture
  if (mic) {
    mic.pause();
    mic = null;
    UI.micOn = false;
    els.micBtn.classList.remove("on");
    els.micBtn.setAttribute("aria-pressed", "false");
    UI.setState(player.busy ? "speaking" : "idle");
    return;
  }
  try {
    els.status.textContent = "Starting microphone…";
    const base = await VC.loadVad();
    mic = await vad.MicVAD.new({
      model: "v5", baseAssetPath: base.vad, onnxWASMBasePath: base.ort,
      positiveSpeechThreshold: 0.6, negativeSpeechThreshold: 0.4,
      redemptionMs: 600, minSpeechMs: 250, preSpeechPadMs: 300,
      ...vadCallbacks,
    });
    mic.start();
    UI.micOn = true;
    els.micBtn.classList.add("on");
    els.micBtn.setAttribute("aria-pressed", "true");
    UI.banner("");
    UI.setState(player.busy ? "speaking" : "listening");
    if (!greeted && UI.persona.greet) greet();
  } catch (err) {
    mic = null;
    UI.setState("idle");
    const denied = /denied|NotAllowed|Permission/i.test(String(err && (err.name + err.message)));
    UI.banner(denied ? "Microphone access was blocked. Allow it in the address bar's site settings, then tap the mic again."
                     : `Couldn't start the microphone (${err.message || err}). You can still type.`);
  }
}

async function loadInfo(reload = false) {
  const res = await fetch(reload ? "/api/reload" : "/api/info", { method: reload ? "POST" : "GET" });
  const info = UI.applyInfo(await res.json());
  // poll while loading; while something is down, keep checking so it recovers by itself
  const down = Object.values(info.status).some((s) => !s.ok);
  clearTimeout(loadInfo.timer);
  if (info.loading || (down && !info.demo)) loadInfo.timer = setTimeout(loadInfo, info.loading ? 1000 : 4000);
}

els.micBtn.onclick = toggleMic;
els.textForm.onsubmit = (e) => {
  e.preventDefault();
  const text = els.textInput.value.trim();
  if (!text) return;
  player.ensureCtx();
  interrupt();
  UI.showUser(text);
  replyStart = performance.now();
  send({ type: "text", text });
  els.textInput.value = "";
};
els.resetBtn.onclick = () => {
  interrupt(); send({ type: "reset" });
  greeted = false; UI.showUser(""); UI.clearSubtitle(); els.latency.textContent = "";
  if (mic && UI.persona.greet) greet();
};
els.reloadBtn.onclick = () => { els.status.textContent = "Reloading…"; loadInfo(true).catch((e) => UI.banner("Reload failed: " + e.message)); };
document.addEventListener("keydown", (e) => {
  if (e.target === els.textInput || e.repeat) return;
  if (e.code === "Space") { e.preventDefault(); toggleMic(); }
  if (e.code === "Escape") { interrupt(); UI.setState("listening"); }
});

connect();
loadInfo().catch(() => UI.banner("Can't reach the companion server."));
