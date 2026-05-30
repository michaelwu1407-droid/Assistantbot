/**
 * Retries fn up to maxAttempts times with exponential backoff.
 * Client errors (4xx) are not retried — only transient/server/network errors.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === maxAttempts;
      const status = (err as { status?: number }).status;
      if (status && status >= 400 && status < 500) throw err;
      if (isLast) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("retryWithBackoff: unreachable");
}
