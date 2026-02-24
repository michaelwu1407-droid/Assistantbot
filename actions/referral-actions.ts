import { db } from "@/lib/db";
import { nanoid } from "nanoid";

export interface CreateReferralLinkParams {
  userId: string;
  programId?: string;
}

export interface TrackReferralClickParams {
  referralCode: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalEarned: number;
  referralCode: string;
  referralLink: string;
}

// Generate a unique referral code
export function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

// Create or get user's referral link
export async function createReferralLink({ userId, programId }: CreateReferralLinkParams) {
  try {
    // Get or create default referral program
    let program;
    if (programId) {
      program = await db.referralProgram.findUnique({
        where: { id: programId },
      });
    } else {
      program = await db.referralProgram.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!program) {
      throw new Error("No active referral program found");
    }

    // Check if user already has a referral for this program
    let referral = await db.referral.findFirst({
      where: {
        userId,
        programId: program.id,
      },
      include: {
        program: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create new referral if it doesn't exist
    if (!referral) {
      const referralCode = generateReferralCode();
      
      referral = await db.referral.create({
        data: {
          userId,
          programId: program.id,
          referralCode,
        },
        include: {
          program: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://earlymark.ai';
    const referralLink = `${baseUrl}?ref=${referral.referralCode}`;

    return {
      referral,
      referralLink,
    };
  } catch (error) {
    console.error("Error creating referral link:", error);
    throw new Error("Failed to create referral link");
  }
}

// Track referral click
export async function trackReferralClick(params: TrackReferralClickParams) {
  try {
    const referral = await db.referral.findUnique({
      where: { referralCode: params.referralCode },
    });

    if (!referral) {
      return { success: false, error: "Invalid referral code" };
    }

    // Create click tracking record
    await db.referralClick.create({
      data: {
        referralId: referral.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        referrer: params.referrer,
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
      },
    });

    // Update click count
    await db.referral.update({
      where: { id: referral.id },
      data: {
        clicksCount: {
          increment: 1,
        },
      },
    });

    return { success: true, referral };
  } catch (error) {
    console.error("Error tracking referral click:", error);
    return { success: false, error: "Failed to track click" };
  }
}

// Get user's referral stats
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    const referral = await db.referral.findFirst({
      where: { userId },
      include: {
        program: true,
      },
    });

    if (!referral) {
      throw new Error("No referral found for user");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://earlymark.ai';
    const referralLink = `${baseUrl}?ref=${referral.referralCode}`;

    return {
      totalReferrals: referral.conversionsCount,
      totalClicks: referral.clicksCount,
      totalSignups: referral.signupsCount,
      totalConversions: referral.conversionsCount,
      totalEarned: referral.referrerRewardEarned,
      referralCode: referral.referralCode,
      referralLink,
    };
  } catch (error) {
    console.error("Error getting referral stats:", error);
    throw new Error("Failed to get referral stats");
  }
}

// Process successful referral (called when referred user completes key action)
export async function processReferralConversion(referralCode: string, referredUserId: string) {
  try {
    const referral = await db.referral.findUnique({
      where: { referralCode },
      include: { program: true },
    });

    if (!referral) {
      return { success: false, error: "Invalid referral code" };
    }

    // Update referral record
    const updatedReferral = await db.referral.update({
      where: { id: referral.id },
      data: {
        referredById: referral.userId, // Set who referred this user
        status: "completed",
        signupsCount: {
          increment: 1,
        },
        conversionsCount: {
          increment: 1,
        },
        referrerRewardEarned: {
          increment: referral.program.rewardValue,
        },
        referredRewardEarned: {
          increment: referral.program.referredRewardValue,
        },
      },
    });

    return { success: true, referral: updatedReferral };
  } catch (error) {
    console.error("Error processing referral conversion:", error);
    return { success: false, error: "Failed to process conversion" };
  }
}

// Get active referral program
export async function getActiveReferralProgram() {
  try {
    return await db.referralProgram.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error("Error getting active referral program:", error);
    return null;
  }
}
