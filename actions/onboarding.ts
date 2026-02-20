"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Validation ─────────────────────────────────────────────────────

const MenuItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
});

const OnboardingSchema = z.object({
  // Step 1: Trade Profile
  tradeType: z.string().min(1, "Trade type is required"),
  website: z.string().url().optional().or(z.literal("")),

  // Step 2: Money Rules
  pricingMode: z.enum(["BOOK_ONLY", "CALL_OUT", "STANDARD"]),
  callOutFee: z.number().min(0).optional(),
  waiveFee: z.boolean().optional(),
  menuItems: z.array(MenuItemSchema).optional(),

  // Step 3: Logistics
  baseSuburb: z.string().min(1, "Base suburb is required"),
  standardWorkHours: z.string().min(1),
  emergencyService: z.boolean(),
  emergencySurcharge: z.number().min(0).optional(),
});

export type OnboardingFormData = z.infer<typeof OnboardingSchema>;

// ─── Server Action ──────────────────────────────────────────────────

export async function saveOnboardingData(
  _userId: string, // kept for API compat; actual userId resolved from auth
  data: OnboardingFormData
): Promise<{ success: boolean; error?: string }> {
  const parsed = OnboardingSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const d = parsed.data;

  try {
    await db.$transaction([
      // Upsert BusinessProfile
      db.businessProfile.upsert({
        where: { userId },
        create: {
          userId,
          tradeType: d.tradeType,
          website: d.website || null,
          baseSuburb: d.baseSuburb,
          standardWorkHours: d.standardWorkHours,
          emergencyService: d.emergencyService,
          emergencySurcharge: d.emergencyService ? d.emergencySurcharge : null,
        },
        update: {
          tradeType: d.tradeType,
          website: d.website || null,
          baseSuburb: d.baseSuburb,
          standardWorkHours: d.standardWorkHours,
          emergencyService: d.emergencyService,
          emergencySurcharge: d.emergencyService ? d.emergencySurcharge : null,
        },
      }),

      // Upsert PricingSettings
      db.pricingSettings.upsert({
        where: { userId },
        create: {
          userId,
          mode: d.pricingMode,
          callOutFee: d.pricingMode === "BOOK_ONLY" ? null : d.callOutFee,
          waiveFee: d.waiveFee ?? true,
          menuItems: d.pricingMode === "BOOK_ONLY" ? [] : (d.menuItems ?? []),
        },
        update: {
          mode: d.pricingMode,
          callOutFee: d.pricingMode === "BOOK_ONLY" ? null : d.callOutFee,
          waiveFee: d.waiveFee ?? true,
          menuItems: d.pricingMode === "BOOK_ONLY" ? [] : (d.menuItems ?? []),
        },
      }),

      // Mark user as onboarded
      db.user.update({
        where: { id: userId },
        data: { hasOnboarded: true },
      }),
    ]);

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to save onboarding data:", error);
    return { success: false, error: "Failed to save onboarding data" };
  }
}
