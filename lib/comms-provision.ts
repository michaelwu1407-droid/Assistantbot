import { initializeTradieComms } from "@/lib/comms";
import { initializeSimpleComms } from "@/lib/comms-simple";

type ProvisionResult = {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  stageReached?: string;
};

const LATE_STAGES = new Set([
  "number-purchase",
  "sip-trunk",
  "db-update",
  "usage-trigger",
  "welcome-sms",
  "complete",
]);

function shouldFallbackToSimple(result: ProvisionResult): boolean {
  if (result.success) return false;
  if (!result.stageReached) return true;
  return !LATE_STAGES.has(result.stageReached);
}

export async function provisionTradieCommsWithFallback(
  workspaceId: string,
  businessName: string,
  ownerPhone: string
): Promise<ProvisionResult & { mode: "full" | "simple" }> {
  const full = await initializeTradieComms(workspaceId, businessName, ownerPhone);
  if (full.success || !shouldFallbackToSimple(full)) {
    return { ...full, mode: "full" };
  }

  const simple = await initializeSimpleComms(workspaceId, businessName, ownerPhone);
  return { ...simple, mode: "simple" };
}
