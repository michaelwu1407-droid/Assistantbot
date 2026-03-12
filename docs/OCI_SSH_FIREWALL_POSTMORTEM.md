# OCI SSH Firewall Postmortem

Date: March 12, 2026

## Summary

`Deploy LiveKit Agent` was failing during `Preflight SSH` from GitHub Actions with:

- `Connection timed out during banner exchange`
- `Connection to <host> port 22 timed out`

The deploy workflow and GitHub secrets were correct. The failure was caused by the OCI Ubuntu host firewall silently dropping new inbound SSH sessions even though the external OCI VCN ingress rule for port `22` was already open.

## Diagnosis Performed

1. Verified the GitHub Actions deploy target was the OCI public IP `140.238.198.39`.
2. Verified OCI VCN ingress for TCP `22` was open.
3. Verified GitHub Actions was failing before authentication, copy, or remote deploy commands.
4. Authenticated from an already-working local SSH path and inspected the host firewall behavior.

## Root Cause

The Ubuntu host's internal `iptables` rules were dropping new inbound SSH connections from GitHub-hosted runners. This created a misleading symptom: OCI networking looked correct, but the host never completed the SSH banner exchange.

## Permanent Recovery

Restore SSH at the host firewall layer:

```bash
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo netfilter-persistent save
```

The first command reopens SSH immediately. The second command persists the allow rule across host reboots.

## Future Triage

Use this sequence for future SSH deploy failures:

1. Confirm `SSH_HOST_PRIMARY` / `SSH_HOST` still points at the intended OCI public IP.
2. Confirm OCI security lists / NSGs allow inbound TCP `22`.
3. Confirm the Ubuntu host firewall also allows TCP `22`.
4. Confirm `sshd` is running and listening on port `22`.
5. Only after the network path is healthy should you debug SSH credentials, package copy, or worker restart logic.

How to interpret the common failure modes:

- Raw TCP connect to port `22` fails:
  Check OCI ingress, Ubuntu `iptables`, or whether `sshd` is listening at all.
- TCP `22` connects but SSH times out during banner exchange:
  Treat it as an `sshd` health or host-firewall issue first. This was the March 12, 2026 production failure pattern.
- SSH reaches authentication and then fails:
  Check the configured username, private key, and authorized keys on the host.
