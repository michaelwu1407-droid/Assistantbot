// Session: websocket, microphone + VAD, barge-in. Protocol: see README.
"use strict";

let ws = null, mic = null, greeted = false;
let replyStart = 0;            // when the user finished their turn (for the latency readout)
// Her turn runs from "thinking" until "done", including silent gaps between sentences.
const turn = { latest: 0, cancelled: 0, active: false };
const herTurn = () => player.busy || turn.active;
// Barge-in: when the user seems to talk over her we duck her first, and only stop
// once ~400 ms of confident speech confirms it (her own echo rarely gets that far).
const barge = { frames: 0, hist: [], done: false, ducked: false };  // reset when her next turn starts
const utt = { duringHer: false, userFrames: 0 };         // the user's current utterance
const BARGE_FRAMES = 7;        // user-like frames (32 ms each) needed to cut her off…
const BARGE_WINDOW = 12;       // …within this many recent frames
const SILENCE_MS = 600;        // silence the VAD waits for before it ends the user's turn

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
      if (msg.turn != null && msg.state === "thinking") {
        turn.active = true;
        Object.assign(barge, { frames: 0, hist: [], done: false, ducked: false });
      }
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

// Speculation: after a short pause (SPEC_FRAMES) send the utterance so the server can start
// on it while the VAD waits out its full silence window; "commit" when the VAD agrees it ended,
// "spec_cancel" if the user carries on. Saves most of the silence window on every reply.
const spec = { ring: [], utter: null, low: 0, sent: false };
const SPEC_FRAMES = 5;         // 160 ms of quiet
const concat = (frames) => {
  const out = new Float32Array(frames.reduce((n, f) => n + f.length, 0));
  let i = 0;
  for (const f of frames) { out.set(f, i); i += f.length; }
  return out;
};
function trackSpeculation(probs, frame) {
  const f = frame.slice();
  if (!spec.utter) { spec.ring.push(f); if (spec.ring.length > 10) spec.ring.shift(); return; }
  spec.utter.push(f);
  if (probs.isSpeech < 0.4) spec.low++;
  else { if (spec.sent && probs.isSpeech > 0.6) { send({ type: "spec_cancel" }); spec.sent = false; } spec.low = 0; }
  const longEnough = spec.utter.length >= 13; // ~400 ms incl. padding
  const herEcho = utt.duringHer && !barge.done && utt.userFrames < BARGE_FRAMES;
  if (!spec.sent && spec.low === SPEC_FRAMES && longEnough && !herEcho) {
    send({ type: "speculate" });
    send(concat(spec.utter));
    spec.sent = true;
  }
}
function endSpeculation(cancel) {
  if (spec.sent && cancel) send({ type: "spec_cancel" });
  const wasSent = spec.sent;
  Object.assign(spec, { utter: null, low: 0, sent: false });
  return wasSent;
}

// Double-talk check: while she plays, learn how loud her own echo normally is at the mic (ratio of
// mic level to her output level), and only treat sound as the user when it is clearly louder than
// that. Without it, speakers + a mic make her interrupt herself and answer her own words.
const echo = { ratios: [], loud: true, recentOut: 0 };
const ECHO_MARGIN = 2.5;       // +8 dB over her predicted echo
const MIN_USER_RMS = 0.008;    // quieter than any real speech at the mic (her echo tail is ~0.002)
function frameRms(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i += 2) sum += frame[i] * frame[i];
  return Math.sqrt(sum / (frame.length / 2));
}
function updateEchoGate(frame) {
  // her echo outlives her voice a little (room reverb, VAD lag): decay over ~300 ms, not instantly
  echo.recentOut = Math.max(player.outputRms(), echo.recentOut * 0.7);
  const out = echo.recentOut, mic = frameRms(frame);
  if (mic < MIN_USER_RMS) { echo.loud = false; return; }
  if (out < 0.003) { echo.loud = true; return; } // she has been silent: nothing to confuse the user with
  const ratio = mic / out;
  echo.ratios.push(ratio);
  if (echo.ratios.length > 90) echo.ratios.shift(); // ~3 s of her speech
  if (echo.ratios.length < 12) { echo.loud = false; return; } // still learning: be conservative
  const typical = [...echo.ratios].sort((a, b) => a - b)[Math.floor(echo.ratios.length * 0.3)];
  echo.loud = ratio > typical * ECHO_MARGIN;
}

const vadCallbacks = {
  onSpeechStart: () => {
    Object.assign(spec, { utter: spec.ring.slice(), low: 0, sent: false });
    utt.duringHer = herTurn();   // started while she had the floor: must prove it's the user
    utt.userFrames = 0;
    if (!utt.duringHer) UI.setState("hearing");
  },
  onFrameProcessed: (probs, frame) => {
    updateEchoGate(frame);
    trackSpeculation(probs, frame);
    if (!player.busy) UI.setLevel(Math.min(1, frameRms(frame) * 9));
    // Cut-in, checked on every 32 ms frame of her turn: speech-like AND louder than her echo.
    const userish = probs.isSpeech > 0.6 && echo.loud;
    if (userish) utt.userFrames++;
    if (!herTurn() || barge.done || !els.bargeIn.checked) return;
    // count over a sliding window so the small gaps between words don't reset the evidence
    barge.hist.push(userish);
    if (barge.hist.length > BARGE_WINDOW) barge.hist.shift();
    barge.frames = barge.hist.filter(Boolean).length;
    if (userish && player.busy && !barge.ducked) { barge.ducked = true; player.duck(true); }
    if (barge.ducked && barge.frames === 0) { barge.ducked = false; player.duck(false); }
    if (barge.frames >= BARGE_FRAMES) { barge.done = true; interrupt(); UI.setState("hearing"); }
  },
  onVADMisfire: () => {
    endSpeculation(true);
    if (!player.busy) UI.setState("listening");
  },
  onSpeechEnd: (audio) => {
    // Speech that began during her turn counts only if it proved to be the user (a confirmed
    // cut-in, or enough frames louder than her echo); otherwise it was her echo or a cough.
    const isUser = !utt.duringHer || barge.done || utt.userFrames >= BARGE_FRAMES;
    if (!isUser) { endSpeculation(true); return; }
    replyStart = performance.now() - SILENCE_MS; // the user actually went quiet this long ago
    UI.setState("transcribing");
    if (endSpeculation(false)) send({ type: "commit" }); // the server already has it
    else send(audio); // Float32 PCM, 16 kHz mono
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
      redemptionMs: SILENCE_MS, minSpeechMs: 250, preSpeechPadMs: 300,
      ...vadCallbacks,
    });
    mic.start();
    window.__vc.micStartedAt = performance.now();
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
  const down = Object.values(info.status).some((s) => !s.ok || s.busy);
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

// Hooks for the automated scorecard (eval/). Harmless in normal use.
window.__vc = { vadCallbacks, player, turn, barge, echo, micStartedAt: 0 };
