# OCI legacy Redis sidecar cleanup

The OCI host is expected to run the LiveKit core stack via Docker under `/opt/livekit`.

There is known infrastructure drift where a **legacy Redis sidecar container** is still present and crash-looping:

- `liveearlymarkai-redis-1`

This container is **not** part of the supported runtime for the Earlymark voice workers, but it can:

- create noisy alerts/log spam
- compete for ports/resources
- confuse operators about which Redis is authoritative

## What “good” looks like

- Only the canonical LiveKit stack containers are running for core infra:
  - `livekit-livekit-1`
  - `livekit-redis-1`
  - `livekit-caddy-1`
  - `livekit-sip`
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

Do **not** remove `livekit-redis-1` (the canonical LiveKit Redis) unless you are intentionally tearing down the LiveKit stack.

