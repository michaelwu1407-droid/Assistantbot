"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getWorkspaceTwilioClient, twilioMasterClient } from "@/lib/twilio";

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

async function sendSms(
  phone: string,
  message: string,
  fromNumber: string,
  workspace: { twilioSubaccountId?: string | null; twilioSubaccountAuthToken?: string | null }
) {
  const twilioClient = getWorkspaceTwilioClient(workspace);
  if (!twilioClient) {
    throw new Error("No usable Twilio messaging client is available for this workspace");
  }
  await twilioClient.messages.create({
    body: message,
    from: fromNumber,
    to: phone,
  });
}

export async function sendJobReminder(dealId: string) {
  try {
    console.log(`🔔 [JOB REMINDER] Starting reminder process for deal: ${dealId}`);
    
    // Get deal and workspace settings
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        workspace: true,
      },
    });

    if (!deal) {
      console.error(`❌ [JOB REMINDER] Deal not found: ${dealId}`);
      return { success: false, error: "Invalid deal" };
    }

    if (!deal.scheduledAt) {
      console.error(`❌ [JOB REMINDER] Deal has no scheduled time: ${dealId}`);
      return { success: false, error: "No scheduled time" };
    }

    if (!deal.contact.phone) {
      console.error(`❌ [JOB REMINDER] Deal has no contact phone: ${dealId}`);
      return { success: false, error: "No contact phone" };
    }

    console.log(`📋 [JOB REMINDER] Deal found: ${deal.title} for ${deal.contact.name}`);
    console.log(`📅 [JOB REMINDER] Scheduled time: ${deal.scheduledAt}`);

    const workspace = deal.workspace;
    if (!workspace.enableJobReminders) {
      console.log(`⚠️ [JOB REMINDER] Reminders disabled for workspace: ${workspace.id}`);
      return { success: false, error: "Reminders disabled" };
    }

    if (!workspace.twilioPhoneNumber) {
      console.log(`⚠️ [JOB REMINDER] No Twilio phone configured for workspace: ${workspace.id}`);
      return { success: false, error: "No phone configured" };
    }

    if (!workspace.twilioSubaccountId) {
      console.log(`⚠️ [JOB REMINDER] No Twilio subaccount configured for workspace: ${workspace.id}`);
      return { success: false, error: "No subaccount configured" };
    }

    console.log(`⚙️ [JOB REMINDER] Workspace settings - Hours: ${workspace.jobReminderHours}, Enabled: ${workspace.enableJobReminders}`);

    // Check if reminder should be sent (within the configured hours)
    const scheduledTime = new Date(deal.scheduledAt!);
    const now = new Date();
    const hoursUntilJob = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const reminderHours = workspace.jobReminderHours || 24;

    console.log(`⏰ [JOB REMINDER] Time check: ${hoursUntilJob.toFixed(2)} hours until job, reminder configured for ${reminderHours} hours before`);

    if (hoursUntilJob > reminderHours || hoursUntilJob < 0) {
      console.log(`⏭️ [JOB REMINDER] Not time to send reminder yet. Hours until: ${hoursUntilJob.toFixed(2)}, Reminder hours: ${reminderHours}`);
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

    console.log(`📱 [JOB REMINDER] Preparing SMS to ${customerName} at ${deal.contact.phone}`);
    console.log(`📝 [JOB REMINDER] Message: "${message}"`);

    const formattedPhone = formatPhoneE164(deal.contact.phone);
    console.log(`🔢 [JOB REMINDER] Formatted phone: ${formattedPhone}`);

    await sendSms(
      formattedPhone, 
      message, 
      workspace.twilioPhoneNumber,
      workspace
    );

    console.log(`✅ [JOB REMINDER] SMS sent successfully to ${customerName}`);

    // Log the reminder as an activity
    const activity = await db.activity.create({
      data: {
        type: "NOTE",
        title: "Job Reminder Sent",
        content: `Automated reminder sent to ${customerName}: ${message}`,
        dealId,
      },
    });

    console.log(`📊 [JOB REMINDER] Activity logged: ${activity.id}`);

    revalidatePath("/crm", "layout");
    console.log(`🔄 [JOB REMINDER] Dashboard revalidated`);
    
    return { success: true, message: "Reminder sent successfully" };
  } catch (error) {
    console.error(`💥 [JOB REMINDER] Error sending reminder for deal ${dealId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send reminder" 
    };
  }
}

export async function sendTripSms(dealId: string) {
  try {
    console.log(`🚗 [TRIP SMS] Starting trip SMS process for deal: ${dealId}`);
    
    // Get deal and workspace settings
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
        workspace: true,
      },
    });

    if (!deal) {
      console.error(`❌ [TRIP SMS] Deal not found: ${dealId}`);
      return { success: false, error: "Invalid deal" };
    }

    if (!deal.contact.phone) {
      console.error(`❌ [TRIP SMS] Deal has no contact phone: ${dealId}`);
      return { success: false, error: "No contact phone" };
    }

    console.log(`📋 [TRIP SMS] Deal found: ${deal.title} for ${deal.contact.name}`);

    const workspace = deal.workspace;
    if (!workspace.enableTripSms) {
      console.log(`⚠️ [TRIP SMS] Trip SMS disabled for workspace: ${workspace.id}`);
      return { success: false, error: "Trip SMS disabled" };
    }

    if (!workspace.twilioPhoneNumber) {
      console.log(`⚠️ [TRIP SMS] No Twilio phone configured for workspace: ${workspace.id}`);
      return { success: false, error: "No phone configured" };
    }

    if (!workspace.twilioSubaccountId) {
      console.log(`⚠️ [TRIP SMS] No Twilio subaccount configured for workspace: ${workspace.id}`);
      return { success: false, error: "No subaccount configured" };
    }

    console.log(`⚙️ [TRIP SMS] Trip SMS enabled for workspace: ${workspace.id}`);

    // Send trip SMS
    const customerName = deal.contact.name || "there";
    const message = `Hi ${customerName}, kind reminder I'm on my way to yours now for the job`;

    console.log(`📱 [TRIP SMS] Preparing SMS to ${customerName} at ${deal.contact.phone}`);
    console.log(`📝 [TRIP SMS] Message: "${message}"`);

    const formattedPhone = formatPhoneE164(deal.contact.phone);
    console.log(`🔢 [TRIP SMS] Formatted phone: ${formattedPhone}`);

    await sendSms(
      formattedPhone,
      message,
      workspace.twilioPhoneNumber,
      workspace
    );

    console.log(`✅ [TRIP SMS] SMS sent successfully to ${customerName}`);

    // Log the trip SMS as an activity
    const activity = await db.activity.create({
      data: {
        type: "NOTE",
        title: "Trip SMS Sent",
        content: `Automated trip SMS sent to ${customerName}: ${message}`,
        dealId,
      },
    });

    console.log(`📊 [TRIP SMS] Activity logged: ${activity.id}`);

    revalidatePath("/crm", "layout");
    console.log(`🔄 [TRIP SMS] Dashboard revalidated`);
    
    return { success: true, message: "Trip SMS sent successfully" };
  } catch (error) {
    console.error(`💥 [TRIP SMS] Error sending trip SMS for deal ${dealId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send trip SMS" 
    };
  }
}

export async function checkAndSendReminders() {
  try {
    console.log(`⏰ [CRON JOB] Starting reminder check process`);
    console.log(`🕐 [CRON JOB] Current time: ${new Date().toISOString()}`);
    
    // Get all scheduled jobs in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`📅 [CRON JOB] Checking jobs between ${now.toISOString()} and ${tomorrow.toISOString()}`);

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

    console.log(`📊 [CRON JOB] Found ${upcomingDeals.length} upcoming scheduled jobs`);

    const results = [];
    let processedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;

    for (const deal of upcomingDeals) {
      processedCount++;
      const workspace = deal.workspace;
      
      console.log(`\n🔍 [CRON JOB] Processing deal ${processedCount}/${upcomingDeals.length}: ${deal.title}`);
      console.log(`👤 [CRON JOB] Customer: ${deal.contact.name}`);
      console.log(`📅 [CRON JOB] Scheduled: ${deal.scheduledAt}`);
      
      if (!workspace.enableJobReminders) {
        console.log(`⚠️ [CRON JOB] Skipping - reminders disabled for workspace: ${workspace.id}`);
        skippedCount++;
        continue;
      }

      if (!workspace.twilioPhoneNumber || !workspace.twilioSubaccountId) {
        console.log(`⚠️ [CRON JOB] Skipping - no Twilio configured for workspace: ${workspace.id}`);
        skippedCount++;
        continue;
      }

      const scheduledTime = new Date(deal.scheduledAt!);
      const hoursUntilJob = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const reminderHours = workspace.jobReminderHours || 24;

      console.log(`⏰ [CRON JOB] Time analysis: ${hoursUntilJob.toFixed(2)} hours until job, reminder set for ${reminderHours} hours before`);

      // Check if it's time to send the reminder (within 1 hour window)
      const timeDiff = Math.abs(hoursUntilJob - reminderHours);
      if (timeDiff <= 1) {
        console.log(`🎯 [CRON JOB] TIME TO SEND REMINDER! Time diff: ${timeDiff.toFixed(2)} hours`);
        
        const result = await sendJobReminder(deal.id);
        results.push({ dealId: deal.id, result });
        
        if (result.success) {
          sentCount++;
          console.log(`✅ [CRON JOB] Reminder sent successfully for deal: ${deal.id}`);
        } else {
          console.log(`❌ [CRON JOB] Failed to send reminder for deal: ${deal.id} - ${result.error}`);
        }
      } else {
        console.log(`⏭️ [CRON JOB] Not time yet. Time diff: ${timeDiff.toFixed(2)} hours (need ≤ 1 hour)`);
      }
    }

    console.log(`\n📈 [CRON JOB] SUMMARY:`);
    console.log(`📊 [CRON JOB] Total jobs processed: ${processedCount}`);
    console.log(`📤 [CRON JOB] Reminders sent: ${sentCount}`);
    console.log(`⏭️ [CRON JOB] Jobs skipped: ${skippedCount}`);
    console.log(`⏰ [CRON JOB] Process completed at: ${new Date().toISOString()}`);

    return { success: true, results, summary: { processedCount, sentCount, skippedCount } };
  } catch (error) {
    console.error(`💥 [CRON JOB] Error in reminder check:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to check reminders" 
    };
  }
}

// Manual update functions for admin control
export async function manualSendJobReminder(dealId: string, adminId?: string) {
  console.log(`🔧 [MANUAL] Admin ${adminId || 'unknown'} manually triggering job reminder for: ${dealId}`);
  
  const result = await sendJobReminder(dealId);
  
  if (result.success) {
    console.log(`✅ [MANUAL] Manual reminder sent successfully`);
    // Log admin action
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Manual Job Reminder Sent",
        content: `Admin ${adminId || 'unknown'} manually sent job reminder`,
        dealId,
      },
    });
  } else {
    console.log(`❌ [MANUAL] Manual reminder failed: ${result.error}`);
  }
  
  return result;
}

export async function manualSendTripSms(dealId: string, adminId?: string) {
  console.log(`🚗 [MANUAL] Admin ${adminId || 'unknown'} manually triggering trip SMS for: ${dealId}`);
  
  const result = await sendTripSms(dealId);
  
  if (result.success) {
    console.log(`✅ [MANUAL] Manual trip SMS sent successfully`);
    // Log admin action
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Manual Trip SMS Sent",
        content: `Admin ${adminId || 'unknown'} manually sent trip SMS`,
        dealId,
      },
    });
  } else {
    console.log(`❌ [MANUAL] Manual trip SMS failed: ${result.error}`);
  }
  
  return result;
}

export async function getReminderStats(workspaceId?: string) {
  try {
    console.log(`📊 [STATS] Getting reminder statistics for workspace: ${workspaceId || 'all'}`);
    
    const whereClause = workspaceId ? { workspaceId } : {};
    
    // Get recent reminder activities
    const recentReminders = await db.activity.findMany({
      where: {
        ...whereClause,
        title: {
          contains: "Reminder Sent"
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      include: {
        deal: {
          include: {
            contact: true
          }
        }
      }
    });

    // Get recent trip SMS activities
    const recentTripSms = await db.activity.findMany({
      where: {
        ...whereClause,
        title: {
          contains: "Trip SMS Sent"
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      include: {
        deal: {
          include: {
            contact: true
          }
        }
      }
    });

    // Get upcoming jobs
    const now = new Date();
    const upcomingJobs = await db.deal.findMany({
      where: {
        ...whereClause,
        scheduledAt: {
          gte: now
        },
        stage: "SCHEDULED"
      },
      include: {
        contact: true,
        workspace: true
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: 20
    });

    console.log(`📊 [STATS] Found ${recentReminders.length} recent reminders, ${recentTripSms.length} trip SMS, ${upcomingJobs.length} upcoming jobs`);

    return {
      success: true,
      stats: {
        recentReminders: recentReminders.length,
        recentTripSms: recentTripSms.length,
        upcomingJobs: upcomingJobs.length
      },
      details: {
        recentReminders,
        recentTripSms,
        upcomingJobs
      }
    };
  } catch (error) {
    console.error(`💥 [STATS] Error getting reminder stats:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get stats"
    };
  }
}

export async function sendSupportAlert(message: string, metadata?: Record<string, unknown>) {
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
