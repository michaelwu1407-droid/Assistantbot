# Single-host disaster recovery (OCI voice)

This runbook is for the **single OCI voice host** setup, where **all voice workers run on one machine**.

If that OCI instance dies, you are restoring voice by bringing up a replacement instance and re-deploying the worker containers.

## What must be preserved

The critical piece of host-local state is the **shared worker env file**:

- `/opt/earlymark-worker-shared/.env.local`

This file contains the runtime secrets/config needed for the Dockerized voice workers to start and phone home correctly.

## Routine backup (recommended)

On the OCI host, create a local backup copy:

```bash
sudo mkdir -p /opt/earlymark-worker-shared/backups
sudo /opt/earlymark-worker/scripts/backup-worker-env.sh
```

Then copy the created backup file **off the host** to a secure location (password manager attachment, encrypted drive, etc).

## Recovery (new OCI instance)

### 1) Provision a replacement OCI VM

- Ubuntu VM (same shape or bigger than the old one)
- Open required ports (SSH + LiveKit/voice ports as per `AGENTS.md`)

### 2) Install Docker + Docker Compose

Follow your standard host bootstrap steps (the repo assumes Docker is the runtime for both LiveKit core and the voice workers).

### 3) Restore the shared worker env

Copy your backed up `.env.local` file onto the new host and put it at:

- `/opt/earlymark-worker-shared/.env.local`

Permissions should be restricted:

```bash
sudo chmod 600 /opt/earlymark-worker-shared/.env.local
```

### 4) Deploy the worker runtime

Run the normal worker deploy path (GitHub Actions) or the install script on the host, depending on your current ops practice:

- `ops/deploy/livekit-worker-install.sh`
- `ops/deploy/livekit-worker-verify.sh`

### 5) Verify recovery

Use the operator surfaces and the canary:

- `/admin/ops-status`
- `/api/internal/launch-readiness`
- deploy/recovery spoken PSTN canary (must persist `VoiceCall` and transcripts)

