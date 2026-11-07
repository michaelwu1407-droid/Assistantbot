// Look + reliability checks. Spawns its own app instance (port 7861) and a fake LLM it can
// switch on and off. usage: node browser_app.js <project dir> <config.toml for 7861>  -> JSON
const { chromium, devices } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const [root, cfg] = process.argv.slice(2);
const URL_B = "http://127.0.0.1:7861/";
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startApp() {
  return spawn("python3", ["-m", "server"], { cwd: root, env: { ...process.env, VC_CONFIG: cfg }, stdio: "ignore" });
}
function fakeLLM() { // minimal OpenAI-compatible server on :18081
  return http.createServer((req, res) => {
    if (req.url.endsWith("/models")) return res.end(JSON.stringify({ data: [{ id: "fake" }] }));
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (const w of ["Hey ", "you, ", "finally!"]) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: w } }] })}\n\n`);
    res.end("data: [DONE]\n\n");
  }).listen(18081);
}
async function until(fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(250); }
  return false;
}
function watch(p) {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/favicon|WebSocket|ERR_CONNECTION_REFUSED/.test(m.text()) && errors.push(m.text()));
}

async function look(browser) {
  const out = {};
  for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["phone", devices["iPhone 13"]]]) {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    watch(p);
    await p.goto(URL_B);
    await p.waitForTimeout(800);
    out[name] = await p.evaluate(() => ({
      fits: document.documentElement.scrollHeight <= innerHeight + 1,
      hscroll: document.documentElement.scrollWidth > innerWidth,
    }));
    // visible feedback: user starts talking -> orb shows "hearing" within a frame or two
    out[name].feedback_ms = await p.evaluate(() => new Promise((res) => {
      const t = performance.now();
      window.__vc.vadCallbacks.onSpeechStart();
      const check = () => document.getElementById("orb").classList.contains("hearing")
        ? res(Math.round(performance.now() - t)) : requestAnimationFrame(check);
      check();
    }));
    await ctx.close();
  }
  return out;
}

(async () => {
  let app = startApp();
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const out = {};
  try {
    const p = await (await browser.newContext()).newPage();
    watch(p);
    await until(async () => { try { await p.goto(URL_B); return true; } catch { return false; } }, 30000);
    // 1. LLM down: a clear banner, then recovery on its own once the LLM appears
    out.llm_down_banner = await until(() => p.evaluate(() => !banner.hidden && /llama|Ollama/.test(banner.textContent)), 15000);
    const llm = fakeLLM();
    out.llm_recovers = await until(() => p.evaluate(() => banner.hidden), 15000);
    out.look = await look(browser);
    // 2. Server restart: the page reconnects and works again without a reload
    app.kill(); await sleep(1500); app = startApp();
    out.reconnects = await until(() => p.evaluate(() => !/Lost connection/.test(document.getElementById("status").textContent)
      && document.getElementById("status").textContent !== ""), 30000);
    await p.fill("#textInput", "hello?"); await p.click("button[type=submit]");
    out.works_after_restart = await until(() => p.evaluate(() => /finally/.test(document.getElementById("subtitle").textContent)), 15000);
    llm.close();
  } finally {
    app.kill();
    await browser.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out));
})().catch((e) => { console.log(JSON.stringify({ fatal: String(e), errors })); process.exit(1); });
