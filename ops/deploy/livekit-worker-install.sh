#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

echo "[runtime-bootstrap] PATH=$PATH"
for bin in bash sudo docker tar; do
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
echo "[runtime-bootstrap] docker_version=$(sudo docker --version)"
echo "[runtime-bootstrap] docker_compose_version=$(sudo docker compose version --short)"

if [ -z "${REMOTE_ARCHIVE_PATH:-}" ] || [ -z "${DEPLOY_GIT_SHA:-}" ] || [ -z "${VOICE_HOST_ID:-}" ]; then
  echo "Missing REMOTE_ARCHIVE_PATH, DEPLOY_GIT_SHA, or VOICE_HOST_ID"
  exit 1
fi

LIVE_DIR="/opt/earlymark-worker"
PREV_DIR="/opt/earlymark-worker.prev"
FAILED_DIR="/opt/earlymark-worker.failed-${DEPLOY_GIT_SHA}"
RELEASE_DIR="/opt/earlymark-worker.release-${DEPLOY_GIT_SHA}"
SHARED_DIR="/opt/earlymark-worker-shared"
SHARED_ENV_FILE="$SHARED_DIR/.env.local"
LEGACY_ENV_FILE="/opt/earlymark-agent/.env.local"
COMPOSE_FILE_RELATIVE="docker/worker-compose.yml"
SALES_CONTAINER="earlymark-sales-agent"
CUSTOMER_CONTAINER="earlymark-customer-agent"

upsert_env_value() {
  key="$1"
  value="$2"
  file="$3"
  tmp_file="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$file" > "$tmp_file"
  cat "$tmp_file" > "$file"
  rm -f "$tmp_file"
}

normalize_env_value() {
  value="${1:-}"
  value="${value//$'\r'/}"
  while [[ "$value" == *$'\n' ]]; do
    value="${value%$'\n'}"
  done
  printf '%s' "$value"
}

compose_cmd() {
  compose_file="$1"
  shift
  sudo EARLYMARK_DEPLOY_GIT_SHA="$DEPLOY_GIT_SHA" docker compose --project-name earlymark-voice-workers -f "$compose_file" "$@"
}

compose_up() {
  compose_file="$1"
  compose_cmd "$compose_file" up -d --build --force-recreate --remove-orphans
}

log_container_details() {
  container_name="$1"
  sudo docker ps -a --filter "name=^/${container_name}$" || true
  sudo docker inspect --format '{{json .State}}' "$container_name" 2>/dev/null || true
  sudo docker logs --tail 120 "$container_name" 2>/dev/null || true
}

rollback_release() {
  if [ -d "$PREV_DIR" ] && [ -f "$PREV_DIR/$COMPOSE_FILE_RELATIVE" ]; then
    echo "[deploy] Rolling back to previous Docker worker release."
    sudo rm -rf "$FAILED_DIR"
    if [ -d "$LIVE_DIR" ]; then
      sudo mv "$LIVE_DIR" "$FAILED_DIR"
    fi
    sudo mv "$PREV_DIR" "$LIVE_DIR"
    compose_up "$LIVE_DIR/$COMPOSE_FILE_RELATIVE" || true
    return 0
  fi

  echo "[deploy] No previous release is available for rollback."
  return 1
}

cleanup_release_dir() {
  sudo rm -rf "$RELEASE_DIR"
}

trap 'rm -f "$REMOTE_ARCHIVE_PATH" "${REMOTE_SYNC_ENV_PATH:-}"' EXIT

cleanup_release_dir
sudo rm -rf "$FAILED_DIR"
sudo mkdir -p "$RELEASE_DIR"
sudo chown -R "$USER":"$USER" "$RELEASE_DIR"
tar -xzf "$REMOTE_ARCHIVE_PATH" -C "$RELEASE_DIR"

if [ -f "$LIVE_DIR/.env.local" ]; then
  cp "$LIVE_DIR/.env.local" "$RELEASE_DIR/.env.local"
elif [ -f "$SHARED_ENV_FILE" ]; then
  cp "$SHARED_ENV_FILE" "$RELEASE_DIR/.env.local"
elif [ -f "$LEGACY_ENV_FILE" ]; then
  cp "$LEGACY_ENV_FILE" "$RELEASE_DIR/.env.local"
fi

if [ ! -f "$RELEASE_DIR/.env.local" ]; then
  echo "Missing $RELEASE_DIR/.env.local"
  exit 1
fi
if grep -nE '^[[:space:]]*export[[:space:]]+' "$RELEASE_DIR/.env.local"; then
  echo "$RELEASE_DIR/.env.local must use plain KEY=value lines."
  exit 1
fi

SYNCED_APP_URL="$(normalize_env_value "${SYNCED_APP_URL:-}")"
SYNCED_VOICE_AGENT_WEBHOOK_SECRET="$(normalize_env_value "${SYNCED_VOICE_AGENT_WEBHOOK_SECRET:-}")"
SYNCED_EARLYMARK_INBOUND_PHONE_NUMBER="$(normalize_env_value "${SYNCED_EARLYMARK_INBOUND_PHONE_NUMBER:-}")"
SYNCED_DEEPGRAM_API_KEY="$(normalize_env_value "${SYNCED_DEEPGRAM_API_KEY:-}")"
SYNCED_GROQ_API_KEY="$(normalize_env_value "${SYNCED_GROQ_API_KEY:-}")"
SYNCED_DEEPINFRA_API_KEY="$(normalize_env_value "${SYNCED_DEEPINFRA_API_KEY:-}")"
SYNCED_VOICE_TTS_VOICE_ID="$(normalize_env_value "${SYNCED_VOICE_TTS_VOICE_ID:-}")"
SYNCED_VOICE_TTS_LANGUAGE="$(normalize_env_value "${SYNCED_VOICE_TTS_LANGUAGE:-}")"
SYNCED_VOICE_SPECULATIVE_HEADS_ENABLED="$(normalize_env_value "${SYNCED_VOICE_SPECULATIVE_HEADS_ENABLED:-}")"
SYNCED_VOICE_SPECULATIVE_HEADS_SURFACES="$(normalize_env_value "${SYNCED_VOICE_SPECULATIVE_HEADS_SURFACES:-}")"
SYNCED_NEXT_PUBLIC_SUPABASE_URL="$(normalize_env_value "${SYNCED_NEXT_PUBLIC_SUPABASE_URL:-}")"
SYNCED_SUPABASE_SERVICE_ROLE_KEY="$(normalize_env_value "${SYNCED_SUPABASE_SERVICE_ROLE_KEY:-}")"

if [ -n "${SYNCED_APP_URL:-}" ]; then
  upsert_env_value "NEXT_PUBLIC_APP_URL" "$SYNCED_APP_URL" "$RELEASE_DIR/.env.local"
  upsert_env_value "APP_URL" "$SYNCED_APP_URL" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_VOICE_AGENT_WEBHOOK_SECRET:-}" ]; then
  upsert_env_value "VOICE_AGENT_WEBHOOK_SECRET" "$SYNCED_VOICE_AGENT_WEBHOOK_SECRET" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_EARLYMARK_INBOUND_PHONE_NUMBER:-}" ]; then
  upsert_env_value "EARLYMARK_INBOUND_PHONE_NUMBER" "$SYNCED_EARLYMARK_INBOUND_PHONE_NUMBER" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_DEEPGRAM_API_KEY:-}" ]; then
  upsert_env_value "DEEPGRAM_API_KEY" "$SYNCED_DEEPGRAM_API_KEY" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_GROQ_API_KEY:-}" ]; then
  upsert_env_value "GROQ_API_KEY" "$SYNCED_GROQ_API_KEY" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_DEEPINFRA_API_KEY:-}" ]; then
  upsert_env_value "DEEPINFRA_API_KEY" "$SYNCED_DEEPINFRA_API_KEY" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_VOICE_TTS_VOICE_ID:-}" ]; then
  upsert_env_value "VOICE_TTS_VOICE_ID" "$SYNCED_VOICE_TTS_VOICE_ID" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_VOICE_TTS_LANGUAGE:-}" ]; then
  upsert_env_value "VOICE_TTS_LANGUAGE" "$SYNCED_VOICE_TTS_LANGUAGE" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_VOICE_SPECULATIVE_HEADS_ENABLED:-}" ]; then
  upsert_env_value "VOICE_SPECULATIVE_HEADS_ENABLED" "$SYNCED_VOICE_SPECULATIVE_HEADS_ENABLED" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_VOICE_SPECULATIVE_HEADS_SURFACES:-}" ]; then
  upsert_env_value "VOICE_SPECULATIVE_HEADS_SURFACES" "$SYNCED_VOICE_SPECULATIVE_HEADS_SURFACES" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  upsert_env_value "NEXT_PUBLIC_SUPABASE_URL" "$SYNCED_NEXT_PUBLIC_SUPABASE_URL" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  upsert_env_value "SUPABASE_SERVICE_ROLE_KEY" "$SYNCED_SUPABASE_SERVICE_ROLE_KEY" "$RELEASE_DIR/.env.local"
fi
upsert_env_value "DEPLOY_GIT_SHA" "$DEPLOY_GIT_SHA" "$RELEASE_DIR/.env.local"
upsert_env_value "VOICE_HOST_ID" "$VOICE_HOST_ID" "$RELEASE_DIR/.env.local"

missing_env=()
for key in LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET CARTESIA_API_KEY DEEPGRAM_API_KEY VOICE_TTS_VOICE_ID VOICE_TTS_LANGUAGE; do
  if ! grep -Eq "^[[:space:]]*${key}=" "$RELEASE_DIR/.env.local"; then
    missing_env+=("$key")
  fi
done
if ! grep -Eq '^[[:space:]]*GROQ_API_KEY=' "$RELEASE_DIR/.env.local" && ! grep -Eq '^[[:space:]]*DEEPINFRA_API_KEY=' "$RELEASE_DIR/.env.local"; then
  missing_env+=("GROQ_API_KEY|DEEPINFRA_API_KEY")
fi
if ! grep -Eq '^[[:space:]]*NEXT_PUBLIC_APP_URL=' "$RELEASE_DIR/.env.local" && ! grep -Eq '^[[:space:]]*APP_URL=' "$RELEASE_DIR/.env.local"; then
  missing_env+=("NEXT_PUBLIC_APP_URL|APP_URL")
fi
if [ "${#missing_env[@]}" -ne 0 ]; then
  echo "Missing required production voice worker env in $RELEASE_DIR/.env.local: ${missing_env[*]}"
  exit 1
fi

if [ ! -f "$RELEASE_DIR/Dockerfile" ] || [ ! -f "$RELEASE_DIR/$COMPOSE_FILE_RELATIVE" ] || [ ! -f "$RELEASE_DIR/healthcheck.js" ]; then
  echo "Missing Docker worker runtime files in $RELEASE_DIR"
  exit 1
fi

sudo mkdir -p "$SHARED_DIR"
sudo cp "$RELEASE_DIR/.env.local" "$SHARED_ENV_FILE"

sudo systemctl disable --now earlymark-sales-agent earlymark-customer-agent || true
sudo systemctl disable --now tracey-sales-agent tracey-customer-agent livekit-agent || true
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete earlymark-agent earlymark-sales-agent earlymark-customer-agent || true
  pm2 save || true
fi

sudo rm -rf "$PREV_DIR"
if [ -d "$LIVE_DIR" ]; then
  sudo mv "$LIVE_DIR" "$PREV_DIR"
fi
sudo mv "$RELEASE_DIR" "$LIVE_DIR"

if ! compose_up "$LIVE_DIR/$COMPOSE_FILE_RELATIVE"; then
  echo "[deploy] Docker worker compose up failed."
  rollback_release || true
  exit 1
fi

if ! sudo docker ps --format '{{.Names}}' | grep -qx "$SALES_CONTAINER"; then
  echo "[deploy] Sales worker container is not running after compose up."
  log_container_details "$SALES_CONTAINER"
  rollback_release || true
  exit 1
fi
if ! sudo docker ps --format '{{.Names}}' | grep -qx "$CUSTOMER_CONTAINER"; then
  echo "[deploy] Customer worker container is not running after compose up."
  log_container_details "$CUSTOMER_CONTAINER"
  rollback_release || true
  exit 1
fi

sudo docker ps --filter "name=^/(earlymark-sales-agent|earlymark-customer-agent)$"
