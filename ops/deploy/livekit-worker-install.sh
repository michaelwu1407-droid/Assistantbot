#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
hash -r

echo "[runtime-bootstrap] PATH=$PATH"
for bin in bash node npm sudo systemctl tar; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[runtime-bootstrap] missing required binary: $bin"
    exit 1
  fi
  echo "[runtime-bootstrap] ${bin}=$(command -v "$bin")"
done
echo "[runtime-bootstrap] node_version=$(node --version)"
echo "[runtime-bootstrap] npm_version=$(npm --version)"
echo "[runtime-bootstrap] systemd_version=$(systemctl --version | sed -n '1p')"

if [ -z "${REMOTE_ARCHIVE_PATH:-}" ] || [ -z "${DEPLOY_GIT_SHA:-}" ] || [ -z "${VOICE_HOST_ID:-}" ]; then
  echo "Missing REMOTE_ARCHIVE_PATH, DEPLOY_GIT_SHA, or VOICE_HOST_ID"
  exit 1
fi

LIVE_DIR="/opt/earlymark-agent"
PREV_DIR="/opt/earlymark-agent.prev"
FAILED_DIR="/opt/earlymark-agent.failed-${DEPLOY_GIT_SHA}"
RELEASE_DIR="/opt/earlymark-agent.release-${DEPLOY_GIT_SHA}"
SALES_UNIT="earlymark-sales-agent.service"
CUSTOMER_UNIT="earlymark-customer-agent.service"

upsert_env_value() {
  key="$1"
  value="$2"
  file="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

rollback_release() {
  if [ ! -d "$PREV_DIR" ]; then
    echo "[deploy] No previous release is available for rollback."
    return 1
  fi

  echo "[deploy] Rolling back to previous worker release."
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
fi

if [ ! -f "$RELEASE_DIR/.env.local" ]; then
  echo "Missing $RELEASE_DIR/.env.local"
  exit 1
fi
if grep -nE '^[[:space:]]*export[[:space:]]+' "$RELEASE_DIR/.env.local"; then
  echo "$RELEASE_DIR/.env.local must use plain KEY=value lines because systemd EnvironmentFile does not support export-prefixed entries."
  exit 1
fi

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
if [ -n "${SYNCED_NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  upsert_env_value "NEXT_PUBLIC_SUPABASE_URL" "$SYNCED_NEXT_PUBLIC_SUPABASE_URL" "$RELEASE_DIR/.env.local"
fi
if [ -n "${SYNCED_SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  upsert_env_value "SUPABASE_SERVICE_ROLE_KEY" "$SYNCED_SUPABASE_SERVICE_ROLE_KEY" "$RELEASE_DIR/.env.local"
fi
upsert_env_value "DEPLOY_GIT_SHA" "$DEPLOY_GIT_SHA" "$RELEASE_DIR/.env.local"
upsert_env_value "VOICE_HOST_ID" "$VOICE_HOST_ID" "$RELEASE_DIR/.env.local"

missing_env=()
for key in LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET CARTESIA_API_KEY DEEPGRAM_API_KEY; do
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

cd "$RELEASE_DIR"
npm ci --omit=dev --no-audit --no-fund

if [ ! -d "$RELEASE_DIR/node_modules/@livekit/agents" ]; then
  echo "npm ci completed but @livekit/agents is still missing from the staged release."
  exit 1
fi

if [ ! -f "$RELEASE_DIR/systemd/$SALES_UNIT" ] || [ ! -f "$RELEASE_DIR/systemd/$CUSTOMER_UNIT" ]; then
  echo "Missing committed systemd service files in $RELEASE_DIR/systemd"
  exit 1
fi

sudo systemctl disable --now tracey-sales-agent tracey-customer-agent || true
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete earlymark-agent earlymark-sales-agent earlymark-customer-agent || true
  pm2 save || true
fi
sudo rm -f /etc/systemd/system/tracey-sales-agent.service /etc/systemd/system/tracey-customer-agent.service

sudo rm -rf "$PREV_DIR"
if [ -d "$LIVE_DIR" ]; then
  sudo mv "$LIVE_DIR" "$PREV_DIR"
fi
sudo mv "$RELEASE_DIR" "$LIVE_DIR"

sudo install -m 0644 "$LIVE_DIR/systemd/$SALES_UNIT" "/etc/systemd/system/$SALES_UNIT"
sudo install -m 0644 "$LIVE_DIR/systemd/$CUSTOMER_UNIT" "/etc/systemd/system/$CUSTOMER_UNIT"
sudo systemctl daemon-reload
sudo systemctl enable earlymark-sales-agent earlymark-customer-agent
sudo systemctl restart earlymark-sales-agent earlymark-customer-agent

if ! sudo systemctl is-active --quiet earlymark-sales-agent; then
  sudo systemctl status earlymark-sales-agent --no-pager || true
  sudo journalctl -u earlymark-sales-agent -n 80 --no-pager || true
  rollback_release || true
  exit 1
fi
if ! sudo systemctl is-active --quiet earlymark-customer-agent; then
  sudo systemctl status earlymark-customer-agent --no-pager || true
  sudo journalctl -u earlymark-customer-agent -n 80 --no-pager || true
  rollback_release || true
  exit 1
fi

sudo systemctl status earlymark-sales-agent earlymark-customer-agent --no-pager
