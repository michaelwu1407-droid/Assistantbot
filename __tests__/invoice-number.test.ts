import { describe, it, expect, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db }));

import { allocateWorkspaceInvoiceNumber } from "@/lib/invoice-number";

function makeTx(name: string, nextInvoiceSequence: number) {
  return {
    workspace: {
      findUnique: vi.fn().mockResolvedValue({ id: "ws-1", name, nextInvoiceSequence }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

beforeEach(() => {
  db.$transaction.mockImplementation((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
    return fn(makeTx("Acme Plumbing", 1));
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("allocateWorkspaceInvoiceNumber", () => {
  it("formats invoice number with workspace prefix and zero-padded sequence", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) =>
      fn(makeTx("Acme Plumbing", 1))
    );
    const result = await allocateWorkspaceInvoiceNumber("ws-1");
    expect(result).toBe("INV-ACME-000001");
  });

  it("strips non-alphanumeric characters from workspace name for prefix", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) =>
      fn(makeTx("Bob's Tiles & Co.", 5))
    );
    const result = await allocateWorkspaceInvoiceNumber("ws-1");
    expect(result).toBe("INV-BOBS-000005");
  });

  it("truncates prefix to 4 characters", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) =>
      fn(makeTx("Melbourne Electric", 10))
    );
    const result = await allocateWorkspaceInvoiceNumber("ws-1");
    expect(result).toBe("INV-MELB-000010");
  });

  it("falls back to WS prefix for empty workspace name", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) =>
      fn(makeTx("", 1))
    );
    const result = await allocateWorkspaceInvoiceNumber("ws-1");
    expect(result).toBe("INV-WS-000001");
  });

  it("falls back to WS prefix for null workspace name", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      const tx = {
        workspace: {
          findUnique: vi.fn().mockResolvedValue({ id: "ws-1", name: null, nextInvoiceSequence: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx as ReturnType<typeof makeTx>);
    });
    const result = await allocateWorkspaceInvoiceNumber("ws-1");
    expect(result).toBe("INV-WS-000001");
  });

  it("pads sequence to 6 digits", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) =>
      fn(makeTx("Test Co", 999999))
    );
    const result = await allocateWorkspaceInvoiceNumber("ws-1");
    expect(result).toBe("INV-TEST-999999");
  });

  it("throws if workspace is not found", async () => {
    db.$transaction.mockImplementationOnce((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      const tx = {
        workspace: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      };
      return fn(tx as ReturnType<typeof makeTx>);
    });
    await expect(allocateWorkspaceInvoiceNumber("missing-ws")).rejects.toThrow(
      "Workspace not found for invoice numbering."
    );
  });

  it("increments the sequence on the workspace record", async () => {
    const tx = makeTx("Solar Co", 42);
    db.$transaction.mockImplementationOnce((fn: (t: ReturnType<typeof makeTx>) => Promise<unknown>) => fn(tx));
    await allocateWorkspaceInvoiceNumber("ws-1");
    expect(tx.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nextInvoiceSequence: { increment: 1 } },
      })
    );
  });
});
