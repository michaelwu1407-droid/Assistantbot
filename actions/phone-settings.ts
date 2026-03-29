"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationSms, verifySmsCode } from "@/lib/sms-verification";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

const UpdatePhoneSchema = z.object({
  newPhoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  verificationCode: z.string().length(6, "Code must be 6 digits"),
});

const SendVerificationSchema = z.object({
  newPhoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
});

/**
 * Send verification code to new personal phone number
 */
export async function sendPhoneVerificationCode(data: {
  newPhoneNumber: string;
}) {
  const validated = SendVerificationSchema.parse(data);
  const actor = await requireCurrentWorkspaceAccess();

  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: { phone: true }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If user doesn't have a phone number yet, skip verification
  if (!user.phone) {
    // Update user phone directly
    await db.user.update({
      where: { id: actor.id },
      data: { phone: validated.newPhoneNumber }
    });

    return { 
      success: true, 
      skipVerification: true,
      message: "Personal phone number added successfully!"
    };
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store code temporarily (expires in 10 minutes)
  await db.verificationCode.upsert({
    where: { 
      userId_phoneNumber: {
        userId: actor.id,
        phoneNumber: validated.newPhoneNumber,
      }
    },
    update: {
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    create: {
      userId: actor.id,
      phoneNumber: validated.newPhoneNumber,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // Send verification SMS using a service (you'll need to configure this)
  try {
    await sendVerificationSms(validated.newPhoneNumber, code, "Earlymark");
    return { success: true };
  } catch (error) {
    console.error("Failed to send verification SMS:", error);
    throw new Error("Failed to send verification code. Please try again.");
  }
}

/**
 * Update personal phone number with verification
 */
export async function updatePhoneNumber(data: {
  newPhoneNumber: string;
  verificationCode: string;
}) {
  const validated = UpdatePhoneSchema.parse(data);
  const actor = await requireCurrentWorkspaceAccess();

  // Verify code
  const verification = await verifySmsCode(
    actor.id,
    validated.newPhoneNumber,
    validated.verificationCode
  );

  if (!verification) {
    throw new Error("Invalid or expired verification code");
  }

  // Update user phone number
  await db.user.update({
    where: { id: actor.id },
    data: { phone: validated.newPhoneNumber }
  });

  return { 
    success: true, 
    phoneNumber: validated.newPhoneNumber,
    message: "Personal phone number updated successfully"
  };
}

/**
 * Get current phone number status
 */
export async function getPhoneNumberStatus() {
  const actor = await requireCurrentWorkspaceAccess();

  const [user, workspace] = await Promise.all([
    db.user.findUnique({
      where: { id: actor.id },
      select: { phone: true }
    }),
    db.workspace.findUnique({
      where: { id: actor.workspaceId },
      select: {
        id: true,
        name: true,
        twilioPhoneNumber: true,
        twilioSubaccountId: true,
        twilioSipTrunkSid: true,
      },
    })
  ]);

  if (!user || !workspace) {
    throw new Error("User or workspace not found");
  }

  return {
    // Personal phone
    personalPhone: user.phone,
    hasPersonalPhone: !!user.phone,
    
    // AI Agent business number
    id: workspace.id,
    name: workspace.name,
    hasPhoneNumber: !!workspace.twilioPhoneNumber,
    phoneNumber: workspace.twilioPhoneNumber,
    hasSubaccount: !!workspace.twilioSubaccountId,
    hasVoiceAgent: !!workspace.twilioSipTrunkSid,
    setupComplete: !!workspace.twilioPhoneNumber && !!workspace.twilioSubaccountId,
  };
}
