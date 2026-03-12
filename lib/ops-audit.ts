import type { RuntimeStatus } from "@/lib/voice-fleet";

const DEFAULT_OPS_AUDIT_TIMEOUT_MS = 8_000;

export function getOpsAuditTimeoutMs() {
  const rawValue = Number(process.env.OPS_AUDIT_TIMEOUT_MS || DEFAULT_OPS_AUDIT_TIMEOUT_MS);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_OPS_AUDIT_TIMEOUT_MS;
}

export function formatOpsAuditError(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `${label} failed: ${message}`;
}

export function maxRuntimeStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

export async function runOpsAuditWithTimeout<T>(
  label: string,
  task: () => Promise<T>,
  onError: (message: string) => T,
) {
  const timeoutMs = getOpsAuditTimeoutMs();
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    return onError(formatOpsAuditError(label, error));
  } finally {
    if (timer) clearTimeout(timer);
  }
}
