#!/usr/bin/env bash
set -euo pipefail

SOURCE_ENV="/opt/earlymark-worker-shared/.env.local"
BACKUP_DIR="/opt/earlymark-worker-shared/backups"

if [[ ! -f "$SOURCE_ENV" ]]; then
  echo "Missing $SOURCE_ENV"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_path="$BACKUP_DIR/worker-env.$timestamp.env.local"

cp "$SOURCE_ENV" "$backup_path"
chmod 600 "$backup_path" || true

echo "Backed up to $backup_path"

