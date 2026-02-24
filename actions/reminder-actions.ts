"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSubaccountClient, twilioMasterClient } from "@/lib/twilio";

// Simple phone formatting function
function formatPhoneE164(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Australian numbers should start with 61
  if (cleaned.startsWith('61')) {
    return cleaned;
  }
  
  // If starts with 0, replace with 61
  if (cleaned.startsWith('0')) {
    return '61' + cleaned.substring(1);
  }
  
  // Otherwise, assume it's already formatted
  return cleaned;
}

async function sendSms(phone: string, message: string, fromNumber: string, subaccountId: string, subaccountAuthToken: string) {
  const twilioClient = getSubaccountClient(subaccountId, subaccountAuthToken);
  await twilioClient.messages.create({
    body: message,
    from: fromNumber,
    to: phone,
  });
}

export async function sendJobReminder(dealId: string) {
  try {
    // Get deal and workspace settings
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        workspace: true,
      },
    });

    if (!deal || !deal.scheduledAt || !deal.contact.phone) {
      return { success: false, error: "Invalid deal or missing contact info" };
    }

    const workspace = deal.workspace;
    if (!workspace.enableJobReminders || !workspace.twilioPhoneNumber || !workspace.twilioSubaccountId || !workspace.twilioSubaccountAuthToken) {
      return { success: false, error: "Reminders disabled or no phone configured" };
    }

    // Check if reminder should be sent (within the configured hours)
    const scheduledTime = new Date(deal.scheduledAt!);
    const now = new Date();
    const hoursUntilJob = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const reminderHours = workspace.jobReminderHours || 24;

    if (hoursUntilJob > reminderHours || hoursUntilJob < 0) {
      return { success: false, error: "Not time to send reminder yet" };
    }

    // Send reminder SMS
    const customerName = deal.contact.name || "there";
    const jobDescription = deal.title || "your job";
    const scheduledTimeFormatted = scheduledTime.toLocaleString("en-AU", {
      weekday: "long",
      month: "long", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const message = `Hi ${customerName}, kind reminder about your ${jobDescription} scheduled for ${scheduledTimeFormatted}. Looking forward to seeing you!`;

    const formattedPhone = formatPhoneE164(deal.contact.phone);
    await sendSms(
      formattedPhone, 
      message, 
      workspace.twilioPhoneNumber,
      workspace.twilioSubaccountId,
      workspace.twilioSubaccountAuthToken
    );

    // Log the reminder as an activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Job Reminder Sent",
        content: `Automated reminder sent to ${customerName}: ${message}`,
        dealId,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, message: "Reminder sent successfully" };
  } catch (error) {
    console.error("Error sending job reminder:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send reminder" 
    };
  }
}

export async function sendTripSms(dealId: string) {
  try {
    // Get deal and workspace settings
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        workspace: true,
      },
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "Invalid deal or missing contact info" };
    }

    const workspace = deal.workspace;
    if (!workspace.enableTripSms || !workspace.twilioPhoneNumber || !workspace.twilioSubaccountId) {
      return { success: false, error: "Trip SMS disabled or no phone configured" };
    }

    // Send trip SMS
    const customerName = deal.contact.name || "there";
    const message = `Hi ${customerName}, kind reminder I'm on my way to yours now for the job`;

    const formattedPhone = formatPhoneE164(deal.contact.phone);
    await sendSms(
      formattedPhone,
      message,
      workspace.twilioPhoneNumber,
      workspace.twilioSubaccountId,
      workspace.twilioSubaccountAuthToken
    );

    // Log the trip SMS as an activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Trip SMS Sent",
        content: `Automated trip SMS sent to ${customerName}: ${message}`,
        dealId,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, message: "Trip SMS sent successfully" };
  } catch (error) {
    console.error("Error sending trip SMS:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send trip SMS" 
    };
  }
}

export async function checkAndSendReminders() {
  try {
    // Get all scheduled jobs in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingDeals = await db.deal.findMany({
      where: {
        scheduledAt: {
          gte: now,
          lte: tomorrow,
        },
        stage: "SCHEDULED",
      },
      include: {
        contact: true,
        workspace: true,
      },
    });

    const results = [];
    for (const deal of upcomingDeals) {
      const workspace = deal.workspace;
      if (!workspace.enableJobReminders || !workspace.twilioPhoneNumber || !workspace.twilioSubaccountId) {
        continue;
      }

      const scheduledTime = new Date(deal.scheduledAt);
      const hoursUntilJob = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const reminderHours = workspace.jobReminderHours || 24;

      // Check if it's time to send the reminder (within 1 hour window)
      if (Math.abs(hoursUntilJob - reminderHours) <= 1) {
        const result = await sendJobReminder(deal.id);
        results.push({ dealId: deal.id, result });
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error("Error checking reminders:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to check reminders" 
    };
  }
}

export async function sendSupportAlert(message: string, metadata?: Record<string, any>) {
  try {
    // Send support alert to Michael Wu
    const twilioClient = twilioMasterClient;
    if (!twilioClient) {
      console.warn("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing. Support alert skipped.");
      return { success: false, error: "Twilio not configured" };
    }

    await twilioClient.messages.create({
      body: `🚨 Earlymark Support Alert\n\n${message}\n\n${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}`,
      from: process.env.TWILIO_PHONE_NUMBER || "+614283123456",
      to: "+614283123456",
    });

    return { success: true, message: "Support alert sent" };
  } catch (error) {
    console.error("Error sending support alert:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send support alert" 
    };
  }
}
