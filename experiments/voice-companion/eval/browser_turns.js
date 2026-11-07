// Turn-taking checks in a real browser against the running app.
// usage: node browser_turns.js <url> <barge.wav> <echo.wav>   -> JSON on stdout
const { chromium } = require("playwright");
const [url, bargeWav, echoWav] = process.argv.slice(2);
const STORY = "Tell me a long story about the stars, in six sentences.";
const errors = [];

async function page(browser, init) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  if (init) await p.addInitScript(init);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && errors.push(m.text()));
  await p.addInitScript(() => {
    window.__log = [];
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (d) {
      if (typeof d === "string") window.__log.push([performance.now(), JSON.parse(d).type]);
      return send.call(this, d);
    };
  });
  await p.goto(url);
  await p.waitForFunction(() => !document.getElementById("status").textContent.startsWith("Waking"), null, { timeout: 90000 });
  await p.evaluate(() => {
    const cb = window.__vc.vadCallbacks;
    for (const k of ["onSpeechStart", "onVADMisfire", "onSpeechEnd"]) {
      const f = cb[k];
      cb[k] = (...a) => { window.__log.push([performance.now(), k + (window.__vc.player.busy ? ":busy" : ":idle")]); return f(...a); };
    }
    const duck = window.__vc.player.duck.bind(window.__vc.player);
    window.__vc.player.duck = (on) => { window.__log.push([performance.now(), on ? "duck" : "unduck"]); duck(on); };
  });
  return p;
}

// The page's microphone is replaced by a stream we control, so speech can be injected at an exact
// moment: 0.8 s after she starts talking. Returns timings relative to the injected speech onset.
const FAKE_MIC = () => {
  // The "mic" hears her real output at window.__echoLevel (echo leaking from speakers to mic, which
  // drops when she ducks) plus any speech we inject, all in her audio context so timing is exact.
  navigator.mediaDevices.getUserMedia = async () => {
    const pl = window.__vc.player;
    pl.ensureCtx();
    window.__micDest = pl.ctx.createMediaStreamDestination();
    const echo = pl.ctx.createGain();
    echo.gain.value = window.__echoLevel || 0;
    pl.gain.connect(echo).connect(window.__micDest);
    return window.__micDest.stream;
  };
  window.__inject = async (b64, gain) => {
    const ctx = window.__vc.player.ctx;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const buf = await ctx.decodeAudioData(bytes.buffer);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = gain;
    src.buffer = buf;
    src.connect(g).connect(window.__micDest);
    src.start();
    return performance.now();
  };
};

const ECHO = 0.3; // -10 dB: a harsh speaker-to-mic leak (browser echo cancelling usually does better)

// wav = the user's speech to inject 0.8 s after she starts talking, or null to just let her talk
async function overTalk(wav, gain) {
  const br = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const p = await page(br, FAKE_MIC);
  await p.evaluate((e) => { window.__echoLevel = e; }, ECHO);
  await p.click("#micBtn");
  await p.waitForFunction(() => window.__vc.micStartedAt > 0);
  await p.waitForTimeout(1500);
  await p.fill("#textInput", STORY);
  await p.click("button[type=submit]");
  // wait for the story reply (not the greeting) to start playing
  await p.waitForFunction(() => window.__vc.turn.latest >= 2 && window.__vc.player.busy && window.__vc.player.heard >= 1,
    null, { timeout: 60000 });
  await p.waitForTimeout(300);
  const onset = wav
    ? await p.evaluate(([d, g]) => window.__inject(d, g), [require("fs").readFileSync(wav).toString("base64"), gain])
    : await p.evaluate(() => performance.now());
  // she must still be talking when the user's words become detectable, or the trial says nothing
  await p.waitForTimeout(wav ? 400 : 8000);
  const stillTalking = await p.evaluate(() => window.__vc.player.busy || window.__log.some(([, k]) => k === "interrupt"));
  if (wav) await p.waitForTimeout(4000);
  const log = await p.evaluate(() => window.__log);
  await br.close();
  const after = (type) => {
    const hit = log.find(([t, k]) => k === type && t >= onset - 50);
    return hit ? Math.round(hit[0] - onset) : null;
  };
  const events = log.filter(([t]) => t >= onset - 50).map(([t, k]) => `${Math.round(t - onset)}:${k}`);
  return { speakingAtOnset: stillTalking, duck_ms: after("duck"), stop_ms: after("interrupt"), events };
}

// Pause-gap: her turn is active but nothing is audible; the user starting to talk must take the floor.
async function gap(browser) {
  const p = await page(browser);
  return p.evaluate(() => {
    const vc = window.__vc;
    vc.turn.active = true;
    vc.turn.latest = 99;
    vc.vadCallbacks.onSpeechStart();
    const frame = Float32Array.from({ length: 512 }, (_, i) => 0.3 * Math.sin(i / 3));
    for (let i = 0; i < 12; i++) vc.vadCallbacks.onFrameProcessed({ isSpeech: 0.95 }, frame);
    return window.__log.some(([, k]) => k === "interrupt") && vc.turn.cancelled === 99;
  });
}

(async () => {
  const plain = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const out = {};
  out.gap_ok = await gap(plain);
  await plain.close();
  out.barge = await overTalk(bargeWav, 0.9); // user talks over her (with her echo present too)
  out.echo = await overTalk(null);           // she talks; only her own echo reaches the mic
  out.barge_ok = out.barge.speakingAtOnset && out.barge.stop_ms !== null;
  out.echo_ok = out.echo.speakingAtOnset ? out.echo.stop_ms === null : null; // null = not measured
  out.errors = errors;
  console.log(JSON.stringify(out));
})().catch((e) => { console.log(JSON.stringify({ fatal: String(e), errors })); process.exit(1); });
