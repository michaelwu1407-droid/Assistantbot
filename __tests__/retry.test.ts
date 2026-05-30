import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryWithBackoff } from "@/lib/retry";

// Speed up tests by bypassing real setTimeout delays
vi.useFakeTimers();

beforeEach(() => {
  vi.clearAllTimers();
});

async function flushTimers() {
  await vi.runAllTimersAsync();
}

describe("retryWithBackoff", () => {
  it("returns the result immediately when fn succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on a 5xx error and returns result on second attempt", async () => {
    const serverError = Object.assign(new Error("Server error"), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce("recovered");

    const promise = retryWithBackoff(fn, 3, 10);
    await flushTimers();
    const result = await promise;

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on a 4xx client error — throws immediately", async () => {
    const clientError = Object.assign(new Error("Bad Request"), { status: 400 });
    const fn = vi.fn().mockRejectedValue(clientError);

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow("Bad Request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on a 429 rate-limit error", async () => {
    const rateLimitError = Object.assign(new Error("Too Many Requests"), { status: 429 });
    const fn = vi.fn().mockRejectedValue(rateLimitError);

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow("Too Many Requests");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxAttempts and then throws", async () => {
    const serverError = Object.assign(new Error("Service Unavailable"), { status: 503 });
    const fn = vi.fn().mockRejectedValue(serverError);

    const promise = retryWithBackoff(fn, 3, 10);
    await flushTimers();

    await expect(promise).rejects.toThrow("Service Unavailable");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on network errors with no status property", async () => {
    const networkError = new Error("ETIMEDOUT");
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce("connected");

    const promise = retryWithBackoff(fn, 3, 10);
    await flushTimers();
    const result = await promise;

    expect(result).toBe("connected");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("succeeds on the last allowed attempt", async () => {
    const err = Object.assign(new Error("Server error"), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("last-chance");

    const promise = retryWithBackoff(fn, 3, 10);
    await flushTimers();

    expect(await promise).toBe("last-chance");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
