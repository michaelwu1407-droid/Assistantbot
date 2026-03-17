#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
hash -r

echo "[runtime-bootstrap] PATH=$PATH"
for bin in bash node sudo docker; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[runtime-bootstrap] missing required binary: $bin"
    exit 1
  fi
  echo "[runtime-bootstrap] ${bin}=$(command -v "$bin")"
done
if ! sudo docker compose version >/dev/null 2>&1; then
  echo "[runtime-bootstrap] missing docker compose plugin"
  exit 1
fi
echo "[runtime-bootstrap] node_version=$(node --version)"
echo "[runtime-bootstrap] docker_version=$(sudo docker --version)"
echo "[runtime-bootstrap] docker_compose_version=$(sudo docker compose version --short)"

LIVE_DIR="/opt/earlymark-worker"
PREV_DIR="/opt/earlymark-worker.prev"
FAILED_DIR="/opt/earlymark-worker.failed-${DEPLOY_GIT_SHA:-unknown}"
COMPOSE_FILE_RELATIVE="docker/worker-compose.yml"
SALES_CONTAINER="earlymark-sales-agent"
CUSTOMER_CONTAINER="earlymark-customer-agent"

compose_cmd() {
  compose_file="$1"
  shift
  sudo EARLYMARK_DEPLOY_GIT_SHA="${DEPLOY_GIT_SHA:-unknown}" docker compose --project-name earlymark-voice-workers -f "$compose_file" "$@"
}

log_container_details() {
  container_name="$1"
  sudo docker ps -a --filter "name=^/${container_name}$" || true
  sudo docker inspect --format '{{json .State}}' "$container_name" 2>/dev/null || true
  sudo docker logs --tail 120 "$container_name" 2>/dev/null || true
}

rollback_release() {
  if [ -d "$PREV_DIR" ] && [ -f "$PREV_DIR/$COMPOSE_FILE_RELATIVE" ]; then
    echo "[deploy] Rolling back worker release after failed verification."
    sudo rm -rf "$FAILED_DIR"
    if [ -d "$LIVE_DIR" ]; then
      sudo mv "$LIVE_DIR" "$FAILED_DIR"
    fi
    sudo mv "$PREV_DIR" "$LIVE_DIR"
    compose_cmd "$LIVE_DIR/$COMPOSE_FILE_RELATIVE" up -d --build --force-recreate --remove-orphans || true
    return 0
  fi

  echo "[deploy] No previous release is available for rollback."
  return 1
}

if [ -f "$LIVE_DIR/.env.local" ]; then
  set -a
  . "$LIVE_DIR/.env.local"
  set +a
fi

EFFECTIVE_APP_URL="${NEXT_PUBLIC_APP_URL:-${APP_URL:-}}"
EFFECTIVE_VOICE_AGENT_SECRET="${VOICE_AGENT_WEBHOOK_SECRET:-${LIVEKIT_API_SECRET:-}}"
EFFECTIVE_OPS_KEY="${TELEMETRY_ADMIN_KEY:-${CRON_SECRET:-}}"

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
if [ -z "$EFFECTIVE_OPS_KEY" ]; then
  echo "Missing TELEMETRY_ADMIN_KEY or CRON_SECRET for spoken canary verification."
  rollback_release || true
  exit 1
fi

wait_for_container_health() {
  container_name="$1"
  for _ in $(seq 1 24); do
    status="$(sudo docker inspect "$container_name" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
    if [ "$status" = "healthy" ]; then
      return 0
    fi
    sleep 5
  done
  return 1
}

if ! wait_for_container_health "$SALES_CONTAINER"; then
  echo "$SALES_CONTAINER did not reach healthy state after deploy."
  log_container_details "$SALES_CONTAINER"
  rollback_release || true
  exit 1
fi
if ! wait_for_container_health "$CUSTOMER_CONTAINER"; then
  echo "$CUSTOMER_CONTAINER did not reach healthy state after deploy."
  log_container_details "$CUSTOMER_CONTAINER"
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
  log_container_details "$SALES_CONTAINER"
  log_container_details "$CUSTOMER_CONTAINER"
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
  log_container_details "$SALES_CONTAINER"
  log_container_details "$CUSTOMER_CONTAINER"
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
  log_container_details "$SALES_CONTAINER"
  log_container_details "$CUSTOMER_CONTAINER"
  rollback_release || true
  exit 1
fi

CANARY_VERIFIED=0
for _ in 1 2 3 4; do
  if NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" OPS_KEY="$EFFECTIVE_OPS_KEY" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const opsKey = process.env.OPS_KEY || ''; const res = await fetch(base + '/api/cron/voice-synthetic-probe', { headers: { 'x-ops-key': opsKey }, cache: 'no-store' }); const text = await res.text(); let payload; try { payload = JSON.parse(text); } catch { process.exit(1); } if (payload?.status === 'healthy') process.exit(0); process.exit(2);"; then
    CANARY_VERIFIED=1
    break
  fi
  sleep 15
done

if [ "$CANARY_VERIFIED" -ne 1 ]; then
  echo "Spoken PSTN canary failed after deploy for host $VOICE_HOST_ID on SHA $DEPLOY_GIT_SHA."
  NEXT_PUBLIC_APP_URL="$EFFECTIVE_APP_URL" OPS_KEY="$EFFECTIVE_OPS_KEY" node --input-type=module -e "const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''); const opsKey = process.env.OPS_KEY || ''; const res = await fetch(base + '/api/cron/voice-synthetic-probe', { headers: { 'x-ops-key': opsKey }, cache: 'no-store' }); console.log(await res.text());"
  log_container_details "$SALES_CONTAINER"
  log_container_details "$CUSTOMER_CONTAINER"
  rollback_release || true
  exit 1
fi

sudo rm -rf "$PREV_DIR" "$FAILED_DIR"
