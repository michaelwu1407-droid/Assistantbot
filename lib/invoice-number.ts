import { db } from "@/lib/db";

function workspacePrefix(workspaceName?: string | null): string {
  const compact = (workspaceName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return compact || "WS";
}

export async function allocateWorkspaceInvoiceNumber(workspaceId: string): Promise<string> {
  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, nextInvoiceSequence: true },
    });
    if (!workspace) {
      throw new Error("Workspace not found for invoice numbering.");
    }

    const next = workspace.nextInvoiceSequence;
    await tx.workspace.update({
      where: { id: workspace.id },
      data: { nextInvoiceSequence: { increment: 1 } },
    });

    const sequence = String(next).padStart(6, "0");
    return `INV-${workspacePrefix(workspace.name)}-${sequence}`;
  });
}
