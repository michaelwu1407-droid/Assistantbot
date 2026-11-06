// Sentence playback queue (server WAV or browser speechSynthesis) + Silero VAD loader.
"use strict";

const VAD_VERSION = "0.0.29";
const ORT_VERSION = "1.22.0";
const CDN = {
  vad: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VERSION}/dist/`,
  ort: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`,
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("failed to load " + src));
    document.head.appendChild(s);
  });
}

// Prefer ./vendor (fully offline, see scripts/fetch_web_assets.sh); fall back to the CDN.
async function loadVad() {
  const local = new URL("vendor/", location.href).href;
  for (const base of [{ vad: local, ort: local }, CDN]) {
    try {
      if (!window.ort) await loadScript(base.ort + "ort.wasm.min.js");
      if (!window.vad) await loadScript(base.vad + "bundle.min.js");
      return base;
    } catch (_) { /* try next */ }
  }
  throw new Error("Could not load the voice detector (Silero VAD).");
}

class Player {
  constructor({ onSentence, onIdle, onLevel }) {
    Object.assign(this, { onSentence, onIdle, onLevel });
    this.queue = [];
    this.playing = false;
    this.ctx = null;
    this.source = null;
    this.gen = 0; // bumps on stop() so stale callbacks are ignored
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.connect(this.ctx.destination);
      this.levelBuf = new Uint8Array(this.analyser.fftSize);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  push(sentence) {
    this.queue.push(sentence);
    if (!this.playing) this.next();
  }

  get busy() { return this.playing || this.queue.length > 0; }

  stop() {
    this.gen++;
    this.queue = [];
    this.playing = false;
    try { this.source && this.source.stop(); } catch (_) {}
    this.source = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    this.onLevel(0);
  }

  async next() {
    const item = this.queue.shift();
    if (!item) { this.playing = false; this.onLevel(0); this.onIdle(); return; }
    this.playing = true;
    const gen = this.gen;
    const done = () => { if (gen === this.gen) this.next(); };
    try {
      if (item.audio) await this.playWav(item, gen, done);
      else this.speakBrowser(item, gen, done);
    } catch (err) {
      console.warn("playback failed", err);
      done();
    }
  }

  async playWav(item, gen, done) {
    this.ensureCtx();
    const bytes = Uint8Array.from(atob(item.audio), (c) => c.charCodeAt(0));
    const buf = await this.ctx.decodeAudioData(bytes.buffer);
    if (gen !== this.gen) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.analyser);
    src.onended = done;
    this.source = src;
    src.start();
    this.onSentence(item.text, buf.duration);
    const tick = () => {
      if (gen !== this.gen || this.source !== src) return;
      this.analyser.getByteTimeDomainData(this.levelBuf);
      let peak = 0;
      for (const v of this.levelBuf) peak = Math.max(peak, Math.abs(v - 128));
      this.onLevel(Math.min(1, peak / 64));
      requestAnimationFrame(tick);
    };
    tick();
  }

  speakBrowser(item, gen, done) {
    if (!window.speechSynthesis) { this.onSentence(item.text, item.text.length * 0.08); setTimeout(done, 1500); return; }
    const u = new SpeechSynthesisUtterance(item.text);
    if (/[㐀-鿿]/.test(item.text)) u.lang = "zh-CN";
    u.rate = 1.05;
    u.pitch = 1.2;
    u.onend = u.onerror = done;
    // No audio stream to measure in this mode: wobble the orb instead.
    const wobble = setInterval(() => {
      if (gen !== this.gen || !speechSynthesis.speaking) { clearInterval(wobble); return; }
      this.onLevel(0.3 + Math.random() * 0.4);
    }, 120);
    speechSynthesis.speak(u);
    this.onSentence(item.text, Math.max(1, item.text.length * (/[㐀-鿿]/.test(item.text) ? 0.22 : 0.065)));
  }
}

window.VC = { loadVad, Player };
