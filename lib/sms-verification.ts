import twilio from "twilio";
import { db } from "@/lib/db";

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Send verification SMS for phone number change
 * Uses a third-party SMS service for personal number verification
 */
export async function sendVerificationSms(
  phoneNumber: string, 
  code: string, 
  businessName: string
) {
  if (!twilioClient) {
    throw new Error("Twilio not configured");
  }

  // Use a master Twilio number for sending verification codes
  const fromNumber = process.env.TWILIO_MASTER_NUMBER;
  
  if (!fromNumber) {
    throw new Error("No master Twilio number configured for verification");
  }

  const message = await twilioClient.messages.create({
    body: `${businessName}: Your verification code is ${code}. Valid for 10 minutes.`,
    from: fromNumber,
    to: phoneNumber,
  });

  return message;
}

/**
 * Verify SMS code from database
 */
export async function verifySmsCode(
  userId: string,
  phoneNumber: string,
  code: string
): Promise<boolean> {
  const verification = await db.verificationCode.findUnique({
    where: {
      userId_phoneNumber: {
        userId,
        phoneNumber,
      },
    },
  });

  if (!verification) {
    return false;
  }

  // Check if code matches and hasn't expired
  const isValid = verification.code === code && verification.expiresAt > new Date();
  
  if (isValid) {
    // Clean up the verification code
    await db.verificationCode.delete({
      where: { id: verification.id },
    });
  }

  return isValid;
}
