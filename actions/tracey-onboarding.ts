"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logging";

// ─── Australian Phone Validation ────────────────────────────────

const auPhoneRegex = /^(\+?61|0)[2-578]\d{8}$/;

function normaliseAuPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+61")) return cleaned;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  return cleaned;
}

// ─── Validation Schema ──────────────────────────────────────────

const ServiceItemSchema = z.object({
  serviceName: z.string().trim().min(1, "Service name is required"),
  callOutFee: z.number().min(0).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  traceyNotes: z.string().trim().optional(),
}).refine(data => {
  if (data.priceMin !== undefined && data.priceMax !== undefined) {
    return data.priceMin <= data.priceMax;
  }
  return true;
}, {
  message: "Minimum price cannot be greater than maximum price",
  path: ["priceMax"]
});

type ServiceItemInput = z.infer<typeof ServiceItemSchema>;

const TraceyOnboardingSchema = z.object({
  // Step 1: Draft Contact Card
  ownerName: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().transform(normaliseAuPhone).refine(val => auPhoneRegex.test(val), "Invalid Australian phone number"),
  email: z.string().trim().email("Valid email required"),
  businessName: z.string().trim().min(1, "Business name is required"),
  websiteUrl: z.preprocess((val) => {
    if (!val || typeof val !== "string") return "";
    const trimmed = val.trim();
    if (trimmed === "") return "";
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }, z.string().url("Invalid URL format").optional().or(z.literal(""))),

  // Step 2: Autonomy Selector
  agentMode: z.enum(["EXECUTION", "DRAFT", "INFO_ONLY"]),

  // Step 3: Scrape Review & Business Deep-Dive
  tradeType: z.string().trim().min(1, "Trade type is required"),
  publicPhone: z.string().trim().optional(),
  publicEmail: z.string().trim().optional(),
  physicalAddress: z.string().trim().optional(),
  baseSuburb: z.string().trim().min(1, "Location is required"),
  serviceRadius: z.number().min(1).max(200).default(20),
  standardWorkHours: z.string().trim().min(1),
  emergencyService: z.boolean().default(false),
  emergencySurcharge: z.number().min(0).optional(),
  emergencyHandling: z.string().trim().optional(),
  specialNotes: z.string().trim().optional(),

  // Step 4: Services & Pricing
  globalCallOutFee: z.number().min(0).optional(),
  services: z.array(ServiceItemSchema).optional(),

  // Step 6: Provisioning
  referralSource: z.string().trim().optional(),
}).transform(data => {
  // Enforce emergency consistency
  if (!data.emergencyService) {
    data.emergencySurcharge = undefined;
    data.emergencyHandling = undefined;
  }
  return data;
});

export type TraceyOnboardingData = z.infer<typeof TraceyOnboardingSchema>;

// ─── Server Action ──────────────────────────────────────────────

export async function saveTraceyOnboarding(
  data: TraceyOnboardingData
): Promise<{
  success: boolean;
  error?: string;
  workspaceId?: string;
  phoneNumber?: string;
  leadsEmail?: string;
  provisioningError?: string;
  readiness?: { scrapeConfigured: boolean; commsConfigured: boolean };
}> {
  const parsed = TraceyOnboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const d = parsed.data;
  
  // Readiness checks (non-blocking)
  const readiness = {
    scrapeConfigured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    commsConfigured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.LIVEKIT_API_KEY,
  };

  try {
    // Get or create workspace
    const { getOrCreateWorkspace } = await import("@/actions/workspace-actions");
    const workspace = await getOrCreateWorkspace(userId, {
      name: d.businessName,
      type: "TRADIE",
      industryType: "TRADES",
      location: d.baseSuburb,
    });

    // ── PHASE A: Transactional Core Writes ──
    await db.$transaction(async (tx) => {
      // 1. Update User record
      await tx.user.update({
        where: { id: userId },
        data: {
          name: d.ownerName,
          phone: d.phone,
          hasOnboarded: true,
        },
      });

      // 2. Update Workspace
      await tx.workspace.update({
        where: { id: workspace.id },
        data: {
          name: d.businessName,
          type: "TRADIE",
          industryType: "TRADES",
          location: d.baseSuburb,
          onboardingComplete: true,
          agentMode: d.agentMode,
          workingHoursStart: d.standardWorkHours.split("-")[0]?.trim() || "08:00",
          workingHoursEnd: d.standardWorkHours.split("-")[1]?.trim() || "17:00",
          callOutFee: d.globalCallOutFee ?? 0,
        },
      });

      // 3. Upsert BusinessProfile
      const profile = await tx.businessProfile.upsert({
        where: { userId },
        create: {
          userId,
          tradeType: d.tradeType,
          website: d.websiteUrl || null,
          businessName: d.businessName,
          publicPhone: d.publicPhone || null,
          publicEmail: d.publicEmail || null,
          physicalAddress: d.physicalAddress || null,
          baseSuburb: d.baseSuburb,
          serviceRadius: d.serviceRadius,
          standardWorkHours: d.standardWorkHours,
          emergencyService: d.emergencyService,
          emergencySurcharge: d.emergencySurcharge || null,
          emergencyHandling: d.emergencyHandling || null,
          specialNotes: d.specialNotes || null,
          referralSource: d.referralSource || null,
        },
        update: {
          tradeType: d.tradeType,
          website: d.websiteUrl || null,
          businessName: d.businessName,
          publicPhone: d.publicPhone || null,
          publicEmail: d.publicEmail || null,
          physicalAddress: d.physicalAddress || null,
          baseSuburb: d.baseSuburb,
          serviceRadius: d.serviceRadius,
          standardWorkHours: d.standardWorkHours,
          emergencyService: d.emergencyService,
          emergencySurcharge: d.emergencySurcharge || null,
          emergencyHandling: d.emergencyHandling || null,
          specialNotes: d.specialNotes || null,
          referralSource: d.referralSource || null,
        },
      });

      // 4. Persist Service Items
      if (d.services && d.services.length > 0) {
        const validServices = d.services.filter((s: ServiceItemInput) => s.serviceName);
        
        if (validServices.length > 0) {
          // Clear old service items for this profile
          await tx.serviceItem.deleteMany({
            where: { businessProfileId: profile.id },
          });

          await tx.serviceItem.createMany({
            data: validServices.map((s: ServiceItemInput) => ({
              businessProfileId: profile.id,
              serviceName: s.serviceName,
              callOutFee: s.callOutFee ?? d.globalCallOutFee ?? null,
              priceMin: s.priceMin ?? null,
              priceMax: s.priceMax ?? null,
              traceyNotes: s.traceyNotes || null,
            })),
          });

          // Idempotency: Clear old onboarding knowledge for this workspace
          await tx.businessKnowledge.deleteMany({
            where: {
              workspaceId: workspace.id,
              category: "SERVICE",
              source: "onboarding"
            }
          });

          // Add to knowledge base for AI triage
          await tx.businessKnowledge.createMany({
            data: validServices.map((s: ServiceItemInput) => {
              let priceRange = "";
              if (s.priceMin && s.priceMax) priceRange = `$${s.priceMin} - $${s.priceMax}`;
              else if (s.priceMin) priceRange = `From $${s.priceMin}`;
              else if (s.priceMax) priceRange = `Up to $${s.priceMax}`;

              return {
                workspaceId: workspace.id,
                category: "SERVICE" as const,
                ruleContent: s.serviceName,
                source: "onboarding",
                metadata: {
                  priceRange: priceRange || null,
                  traceyNotes: s.traceyNotes || null,
                },
              };
            }),
          });

          // Idempotency: Clear old repair items with matching titles
          const serviceNames = validServices.map(s => s.serviceName);
          await tx.repairItem.deleteMany({
            where: {
              workspaceId: workspace.id,
              title: { in: serviceNames }
            }
          });

          // Add to repair items / glossary for quoting
          await tx.repairItem.createMany({
            data: validServices.map((s: ServiceItemInput) => {
              let desc = "";
              if (s.priceMin && s.priceMax) desc = `$${s.priceMin} - $${s.priceMax}`;
              else if (s.priceMin) desc = `From $${s.priceMin}`;
              else if (s.priceMax) desc = `Up to $${s.priceMax}`;

              return {
                workspaceId: workspace.id,
                title: s.serviceName,
                description: desc || "Price varies on assessment",
              };
            }),
          });
        }
      }

      // 5. Create PricingSettings
      await tx.pricingSettings.upsert({
        where: { userId },
        create: {
          userId,
          mode: "STANDARD",
          callOutFee: d.globalCallOutFee || null,
          waiveFee: true,
        },
        update: {
          mode: "STANDARD",
          callOutFee: d.globalCallOutFee || null,
          waiveFee: true,
        },
      });
    });

    // ── PHASE B: Best-Effort External Side Effects ──
    
    // 6. Allocate leads email
    let leadsEmail: string | undefined;
    try {
      const { getOrAllocateLeadCaptureEmail } = await import("@/actions/settings-actions");
      leadsEmail = await getOrAllocateLeadCaptureEmail();
    } catch (err) {
      logger.error("Failed to allocate leads email", { error: String(err), workspaceId: workspace.id });
    }

    // 7. Provision Twilio phone number
    let phoneNumber: string | undefined;
    let provisioningError: string | undefined;
    try {
      const { initializeTradieComms } = await import("@/lib/comms");
      const result = await initializeTradieComms(
        workspace.id,
        d.businessName,
        d.phone
      );
      if (result.success && result.phoneNumber) {
        phoneNumber = result.phoneNumber;
      } else if (!result.success && result.error) {
        provisioningError = result.error;
        logger.error("Comms provisioning failed during Tracey onboarding", {
          workspaceId: workspace.id,
          error: result.error,
        });
      }
    } catch (err) {
      provisioningError = err instanceof Error ? err.message : "Unknown error";
      logger.error("Comms provisioning threw during Tracey onboarding", {
        workspaceId: workspace.id,
        error: provisioningError,
      });
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      workspaceId: workspace.id,
      phoneNumber,
      leadsEmail,
      provisioningError,
      readiness,
    };
  } catch (error) {
    logger.error("Failed to save Tracey onboarding data", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save onboarding data",
    };
  }
}
