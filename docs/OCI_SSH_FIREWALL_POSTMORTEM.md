# OCI SSH and Runtime Deploy Postmortem

Date: March 12, 2026

## Summary

`Deploy LiveKit Agent` hit two separate blockers during `Preflight SSH` from GitHub Actions:

- `Connection timed out during banner exchange`
- `Connection to <host> port 22 timed out`

Stage 1 was real network-layer failure: the OCI Ubuntu host firewall was silently dropping inbound SSH even though the external OCI VCN ingress rule for port `22` was already open.

Stage 2 remained after that was fixed: sshd logs later proved GitHub Actions could authenticate and open sessions as `ubuntu`, so the remaining deploy blocker moved inside the remote non-interactive shell/runtime path after login.

## Diagnosis Performed

1. Verified the GitHub Actions deploy target was the OCI public IP `140.238.198.39`.
2. Verified OCI VCN ingress for TCP `22` was open.
3. Confirmed the host firewall had been dropping new inbound SSH sessions and restored port `22`.
4. Verified later sshd logs showed accepted GitHub publickey sessions for `ubuntu` from the GitHub runner IP after the firewall recovery.
5. Narrowed the remaining failure boundary to the remote non-interactive command path, because transport and authentication were both succeeding.

## Root Cause

Stage 1 root cause:

The Ubuntu host's internal `iptables` rules were dropping new inbound SSH connections from GitHub-hosted runners. This created a misleading symptom: OCI networking looked correct, but the host never completed the SSH banner exchange.

Stage 2 remaining blocker:

Once GitHub Actions could authenticate and open SSH sessions, the remaining deploy failure was no longer transport. It was in the remote non-interactive shell/runtime path after login. That class of failure includes dotfile-dependent shell behavior and missing runtime bootstrap for `PATH`, `node`, `npm`, or `pm2`.

## Stage 1 Recovery

Restore SSH at the host firewall layer:

```bash
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo netfilter-persistent save
```

The first command reopens SSH immediately. The second command persists the allow rule across host reboots.

## Stage 2 Recovery Direction

Treat remote deploy commands as non-interactive shells that must bootstrap their own runtime explicitly:

- run remote scripts with `bash --noprofile --norc -se`
- set a stable base `PATH`
- optionally source `~/.nvm/nvm.sh` when present
- print and validate `bash`, `node`, `npm`, and `pm2` before running deploy logic

## Future Triage

Use this sequence for future SSH deploy failures:

1. Confirm `SSH_HOST_PRIMARY` / `SSH_HOST` still points at the intended OCI public IP.
2. Confirm OCI security lists / NSGs allow inbound TCP `22`.
3. Confirm the Ubuntu host firewall also allows TCP `22`.
4. Confirm `sshd` is running and listening on port `22`.
5. Check `journalctl -u ssh` while rerunning the workflow.
6. If the logs show accepted GitHub publickey sessions for `ubuntu`, stop debugging network reachability and inspect the remote non-interactive runtime bootstrap path next.
7. Only after the runtime bootstrap is healthy should you debug package copy, worker restart, or heartbeat verification logic.

How to interpret the common failure modes:

- Raw TCP connect to port `22` fails:
  Check OCI ingress, Ubuntu `iptables`, or whether `sshd` is listening at all.
- TCP `22` connects but SSH times out during banner exchange:
  Treat it as an `sshd` health or host-firewall issue first. This was the first March 12, 2026 production failure pattern.
- sshd logs show accepted GitHub publickey sessions:
  Transport and authentication are working. Inspect the remote non-interactive shell/runtime path, including `PATH`, `nvm`, `node`, `npm`, and `pm2`.
- SSH reaches authentication and then fails:
  Check the configured username, private key, and authorized keys on the host.
