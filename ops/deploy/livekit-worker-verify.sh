#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
hash -r

echo "[runtime-bootstrap] PATH=$PATH"
for bin in bash node npm sudo systemctl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[runtime-bootstrap] missing required binary: $bin"
    exit 1
  fi
  echo "[runtime-bootstrap] ${bin}=$(command -v "$bin")"
done
echo "[runtime-bootstrap] node_version=$(node --version)"
echo "[runtime-bootstrap] npm_version=$(npm --version)"
echo "[runtime-bootstrap] systemd_version=$(systemctl --version | sed -n '1p')"

LIVE_DIR="/opt/earlymark-agent"
PREV_DIR="/opt/earlymark-agent.prev"
FAILED_DIR="/opt/earlymark-agent.failed-${DEPLOY_GIT_SHA:-unknown}"
SALES_UNIT="earlymark-sales-agent.service"
CUSTOMER_UNIT="earlymark-customer-agent.service"

rollback_release() {
  if [ ! -d "$PREV_DIR" ]; then
    echo "[deploy] No previous release is available for rollback."
    return 1
  fi

  echo "[deploy] Rolling back worker release after failed heartbeat verification."
  sudo systemctl stop earlymark-sales-agent earlymark-customer-agent || true
  sudo rm -rf "$FAILED_DIR"
  if [ -d "$LIVE_DIR" ]; then
    sudo mv "$LIVE_DIR" "$FAILED_DIR"
  fi
  sudo mv "$PREV_DIR" "$LIVE_DIR"
  sudo install -m 0644 "$LIVE_DIR/systemd/$SALES_UNIT" "/etc/systemd/system/$SALES_UNIT"
  sudo install -m 0644 "$LIVE_DIR/systemd/$CUSTOMER_UNIT" "/etc/systemd/system/$CUSTOMER_UNIT"
  sudo systemctl daemon-reload
  sudo systemctl restart earlymark-sales-agent earlymark-customer-agent
  sudo systemctl status earlymark-sales-agent earlymark-customer-agent --no-pager || true
}

if [ -f "$LIVE_DIR/.env.local" ]; then
  set -a
  . "$LIVE_DIR/.env.local"
  set +a
fi

EFFECTIVE_APP_URL="${NEXT_PUBLIC_APP_URL:-${APP_URL:-}}"
EFFECTIVE_VOICE_AGENT_SECRET="${VOICE_AGENT_WEBHOOK_SECRET:-${LIVEKIT_API_SECRET:-}}"

if [ -z "$EFFECTIVE_APP_URL" ]; then
  echo "Missing NEXT_PUBLIC_APP_URL or APP_URL for heartbeat verification."
  rollback_release || true
  exit 1
fi
if [ -z "$EFFECTIVE_VOICE_AGENT_SECRET" ]; then
  echo "Missing VOICE_AGENT_WEBHOOK_SECRET or LIVEKIT_API_SECRET for heartbeat verification."
  rollback_release || true
  exit 1
fi

if ! sudo systemctl is-active --quiet earlymark-sales-agent; then
  echo "earlymark-sales-agent is not active after deploy."
  sudo systemctl status earlymark-sales-agent --no-pager || true
  sudo journalctl -u earlymark-sales-agent -n 80 --no-pager || true
  rollback_release || true
  exit 1
fi
if ! sudo systemctl is-active --quiet earlymark-customer-agent; then
  echo "earlymark-customer-agent is not active after deploy."
  sudo systemctl status earlymark-customer-agent --no-pager || true
  sudo journalctl -u earlymark-customer-agent -n 80 --no-pager || true
  rollback_release || true
  exit 1
fi

VERIFIED=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" VOICE_AGENT_WEBHOOK_SECRET="$EFFECTIVE_VOICE_AGENT_SECRET" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || ''; const hostId = process.env.VOICE_HOST_ID || ''; const sha = process.env.DEPLOY_GIT_SHA || ''; const res = await fetch(base + '/api/internal/voice-fleet-health', { headers: { 'x-voice-agent-secret': secret } }); const text = await res.text(); let payload; try { payload = JSON.parse(text); } catch { process.exit(1); } const workers = payload?.fleet?.hosts?.find((host) => host.hostId === hostId)?.workers || []; const sales = workers.find((worker) => worker.workerRole === 'tracey-sales-agent'); const customer = workers.find((worker) => worker.workerRole === 'tracey-customer-agent'); const isReady = sales && customer && sales.deployGitSha === sha && customer.deployGitSha === sha && sales.status !== 'unhealthy' && customer.status !== 'unhealthy'; if (isReady) process.exit(0); process.exit(2);"; then
    VERIFIED=1
    break
  fi
  sleep 6
done

if [ "$VERIFIED" -ne 1 ]; then
  echo "Voice worker heartbeats did not converge for host $VOICE_HOST_ID on SHA $DEPLOY_GIT_SHA."
  NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" VOICE_AGENT_WEBHOOK_SECRET="$EFFECTIVE_VOICE_AGENT_SECRET" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || ''; const res = await fetch(base + '/api/internal/voice-fleet-health', { headers: { 'x-voice-agent-secret': secret } }); console.log(await res.text());"
  sudo systemctl status earlymark-sales-agent earlymark-customer-agent --no-pager || true
  sudo journalctl -u earlymark-sales-agent -u earlymark-customer-agent -n 80 --no-pager || true
  rollback_release || true
  exit 1
fi

DRIFT_VERIFIED=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" VOICE_AGENT_WEBHOOK_SECRET="$EFFECTIVE_VOICE_AGENT_SECRET" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || ''; const res = await fetch(base + '/api/internal/customer-agent-drift', { headers: { 'x-voice-agent-secret': secret } }); const text = await res.text(); let payload; try { payload = JSON.parse(text); } catch { process.exit(1); } if (payload?.voiceWorker?.status === 'healthy') process.exit(0); process.exit(2);"; then
    DRIFT_VERIFIED=1
    break
  fi
  sleep 10
done

if [ "$DRIFT_VERIFIED" -ne 1 ]; then
  NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" VOICE_AGENT_WEBHOOK_SECRET="$EFFECTIVE_VOICE_AGENT_SECRET" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || ''; const res = await fetch(base + '/api/internal/customer-agent-drift', { headers: { 'x-voice-agent-secret': secret } }); console.log(await res.text());"
  rollback_release || true
  exit 1
fi

LAUNCH_GATE_VERIFIED=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" VOICE_AGENT_WEBHOOK_SECRET="$EFFECTIVE_VOICE_AGENT_SECRET" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || ''; const hostId = process.env.VOICE_HOST_ID || ''; const sha = process.env.DEPLOY_GIT_SHA || ''; const url = new URL(base + '/api/internal/launch-readiness'); if (sha) url.searchParams.set('expectedWorkerSha', sha); if (hostId) url.searchParams.set('hostId', hostId); const res = await fetch(url, { headers: { 'x-voice-agent-secret': secret } }); const text = await res.text(); let payload; try { payload = JSON.parse(text); } catch { process.exit(1); } if (payload?.voiceCritical?.status === 'healthy') process.exit(0); process.exit(2);"; then
    LAUNCH_GATE_VERIFIED=1
    break
  fi
  sleep 10
done

if [ "$LAUNCH_GATE_VERIFIED" -ne 1 ]; then
  echo "Launch-critical voice gate did not converge for host $VOICE_HOST_ID on SHA $DEPLOY_GIT_SHA."
  NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" VOICE_AGENT_WEBHOOK_SECRET="$EFFECTIVE_VOICE_AGENT_SECRET" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || ''; const hostId = process.env.VOICE_HOST_ID || ''; const sha = process.env.DEPLOY_GIT_SHA || ''; const url = new URL(base + '/api/internal/launch-readiness'); if (sha) url.searchParams.set('expectedWorkerSha', sha); if (hostId) url.searchParams.set('hostId', hostId); const res = await fetch(url, { headers: { 'x-voice-agent-secret': secret } }); console.log(await res.text());"
  rollback_release || true
  exit 1
fi

sudo rm -rf "$PREV_DIR" "$FAILED_DIR"
