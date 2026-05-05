# OCI legacy Redis sidecar cleanup

The OCI host currently runs a mixed LiveKit topology:

- Docker containers:
  - `livekit-livekit-1`
  - `livekit-sip`
- Host services:
  - `caddy`
  - `redis-server`

The canonical bind-mount root for the Dockerized core containers is `/home/ubuntu/livekit/live.earlymark.ai`.
Do **not** assume `/opt/livekit` is a safe Docker bind-mount root on this host; Snap Docker has produced misleading `read-only file system` failures there.

There is known infrastructure drift where a **legacy Redis sidecar container** is still present and crash-looping:

- `liveearlymarkai-redis-1`

This container is **not** part of the supported runtime for the Earlymark voice workers, but it can:

- create noisy alerts/log spam
- compete for ports/resources
- confuse operators about which Redis is authoritative

## What “good” looks like

- Only the canonical Dockerized core voice containers are running:
  - `livekit-livekit-1`
  - `livekit-sip`
- Host `caddy` and `redis-server` services remain healthy.
- Only the canonical worker containers are running for the voice workers:
  - `earlymark-sales-agent`
  - `earlymark-customer-agent`

## Cleanup steps (on the OCI host)

1) List containers and confirm the crash-looping name:

```bash
sudo docker ps -a --format 'table {{.Names}}\t{{.Status}}'
```

2) Capture logs once (optional, for audit):

```bash
sudo docker logs --tail 120 liveearlymarkai-redis-1
```

3) Remove the legacy container:

```bash
sudo docker rm -f liveearlymarkai-redis-1
```

4) If it comes back, it is being recreated by an old compose project or host service.
Search for and remove the legacy compose definition / systemd unit that owns it.

## Important caution

Do **not** remove the host `redis-server` service unless you are intentionally redesigning the LiveKit topology.
Also do **not** recreate `livekit-redis-1` or `livekit-caddy-1` just to match old docs; they are currently legacy drift, not part of the supported live setup.

