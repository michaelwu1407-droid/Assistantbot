// Sentence playback (server WAV or browser speechSynthesis) + Silero VAD loader.
"use strict";

const VAD_VERSION = "0.0.29";
const ORT_VERSION = "1.22.0";
const CDN = {
  vad: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VERSION}/dist/`,
  ort: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`,
};
const CJK = /[㐀-鿿]/;
const PAUSE_S = 0.12; // breath between sentences

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src, onload: resolve });
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
  throw new Error("Could not load the voice detector.");
}

function pickBrowserVoice(text) {
  const lang = CJK.test(text) ? "zh" : "en";
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
  const good = /natural|neural|premium|enhanced|google|aria|jenny|samantha|ava|xiaoxiao/i;
  return voices.find((v) => good.test(v.name)) || voices[0] || null;
}

class Player {
  constructor({ onSentence, onProgress, onIdle, onLevel }) {
    Object.assign(this, { onSentence, onProgress, onIdle, onLevel });
    this.queue = [];
    this.playing = false;
    this.heard = 0;   // sentences of the current reply that started playing
    this.gen = 0;     // bumps on stop() so stale callbacks are ignored
    if (window.speechSynthesis) speechSynthesis.getVoices(); // starts async voice loading
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.gain.connect(this.analyser).connect(this.ctx.destination);
      this.levelBuf = new Uint8Array(this.analyser.fftSize);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  get busy() { return this.playing || this.queue.length > 0; }

  // Loudness of what she is playing right now (after ducking): the source of any echo at the mic.
  outputRms() {
    if (!this.analyser || !this.playing) return 0;
    const buf = this.rmsBuf || (this.rmsBuf = new Float32Array(this.analyser.fftSize));
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  push(item) {
    if (item.id === 0) this.heard = 0;
    if (item.audio) { // decode now, while earlier sentences play
      this.ensureCtx();
      const bytes = Uint8Array.from(atob(item.audio), (c) => c.charCodeAt(0));
      item.buffer = this.ctx.decodeAudioData(bytes.buffer);
      item.buffer.catch(() => {});
    }
    this.queue.push(item);
    if (!this.playing) this.next(true);
  }

  // Quieten while the user might be talking over her; restore if it was a false alarm.
  duck(on) {
    if (this.gain) this.gain.gain.setTargetAtTime(on ? 0.2 : 1, this.ctx.currentTime, 0.04);
    if (window.speechSynthesis && speechSynthesis.speaking) on ? speechSynthesis.pause() : speechSynthesis.resume();
  }

  stop() {
    this.gen++;
    this.queue = [];
    this.playing = false;
    try { this.source && this.source.stop(); } catch (_) {}
    this.source = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (this.gain) {
      this.gain.gain.cancelScheduledValues(0);
      this.gain.gain.value = 1;
    }
    this.onLevel(0);
  }

  async next(first = false) {
    const item = this.queue.shift();
    if (!item) { this.playing = false; this.onLevel(0); this.onIdle(); return; }
    this.playing = true;
    const gen = this.gen;
    const done = () => { if (gen === this.gen) this.next(); };
    try {
      if (item.buffer) await this.playWav(item, gen, done, first ? 0 : PAUSE_S);
      else this.speakBrowser(item, gen, done);
    } catch (err) {
      console.warn("playback failed", err);
      done();
    }
  }

  async playWav(item, gen, done, delay) {
    const buf = await item.buffer;
    if (gen !== this.gen) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.onended = done;
    this.source = src;
    src.start(this.ctx.currentTime + delay);
    setTimeout(() => {
      if (gen !== this.gen) return;
      this.heard++;
      this.onSentence(item, buf.duration);
      this.meter(gen, src);
    }, delay * 1000);
  }

  meter(gen, src) {
    if (gen !== this.gen || this.source !== src) return;
    this.analyser.getByteTimeDomainData(this.levelBuf);
    let peak = 0;
    for (const v of this.levelBuf) peak = Math.max(peak, Math.abs(v - 128));
    this.onLevel(Math.min(1, peak / 48));
    requestAnimationFrame(() => this.meter(gen, src));
  }

  speakBrowser(item, gen, done) {
    const text = item.text;
    const estimate = Math.max(1, text.length * (CJK.test(text) ? 0.22 : 0.065));
    this.heard++;
    if (!window.speechSynthesis) { this.onSentence(item, estimate); setTimeout(done, estimate * 1000); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.voice = pickBrowserVoice(text);
    if (u.voice) u.lang = u.voice.lang;
    u.rate = 1.05;
    u.pitch = 1.15;
    u.onend = u.onerror = done;
    u.onboundary = (e) => { if (gen === this.gen) this.onProgress(e.charIndex + (e.charLength || 1)); };
    const wobble = setInterval(() => { // no audio stream to measure in this mode
      if (gen !== this.gen || !speechSynthesis.speaking) { clearInterval(wobble); return; }
      this.onLevel(speechSynthesis.paused ? 0 : 0.3 + Math.random() * 0.4);
    }, 110);
    speechSynthesis.speak(u);
    this.onSentence(item, estimate);
  }
}

window.VC = { loadVad, Player };
