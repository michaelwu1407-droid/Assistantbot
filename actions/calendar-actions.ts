"use server";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  attendees: string[];
  location?: string;
  description?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  synced: number;
  activitiesCreated: number;
  error?: string;
}

// ─── Google Calendar ────────────────────────────────────────────────

/**
 * Sync events from Google Calendar.
 *
 * STUB: In production, this would:
 * 1. Use OAuth2 token (same Google OAuth as Gmail)
 * 2. Call Calendar API to list recent/upcoming events
 * 3. Match attendees to CRM contacts by email
 * 4. Auto-log as MEETING activities
 *
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET + per-workspace OAuth token
 */
export async function syncGoogleCalendar(
  _workspaceId: string,
  _accessToken?: string
): Promise<CalendarSyncResult> {
  // TODO: Replace with actual Google Calendar API call
  // const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  // const events = await calendar.events.list({
  //   calendarId: 'primary',
  //   timeMin: new Date(Date.now() - 7 * 86400000).toISOString(),
  //   timeMax: new Date(Date.now() + 7 * 86400000).toISOString(),
  //   singleEvents: true,
  //   orderBy: 'startTime'
  // });

  return {
    success: true,
    synced: 0,
    activitiesCreated: 0,
    error: "Google Calendar sync not configured. Set up Google OAuth.",
  };
}

/**
 * Sync events from Outlook Calendar.
 *
 * STUB: Uses Microsoft Graph API.
 */
export async function syncOutlookCalendar(
  _workspaceId: string,
  _accessToken?: string
): Promise<CalendarSyncResult> {
  // TODO: Replace with actual Microsoft Graph API call
  // const response = await fetch(
  //   'https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=...&endDateTime=...',
  //   { headers: { Authorization: `Bearer ${accessToken}` } }
  // );

  return {
    success: true,
    synced: 0,
    activitiesCreated: 0,
    error: "Outlook Calendar sync not configured. Set up Azure OAuth.",
  };
}

/**
 * Create a calendar event from a CRM task.
 * Returns the event creation payload (stub — doesn't actually call API).
 */
export async function createCalendarEvent(
  taskId: string,
  _provider: "google" | "outlook" = "google"
): Promise<{
  success: boolean;
  event?: CalendarEvent;
  error?: string;
}> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      contact: true,
      deal: true,
    },
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  if (!task.dueAt) {
    return { success: false, error: "Task has no due date" };
  }

  const event: CalendarEvent = {
    id: `evt_${task.id}`,
    title: task.title,
    start: task.dueAt,
    end: new Date(task.dueAt.getTime() + 30 * 60 * 1000), // 30min default
    attendees: task.contact?.email ? [task.contact.email] : [],
    description: [
      task.description,
      task.deal ? `Deal: ${task.deal.title}` : null,
      task.contact ? `Contact: ${task.contact.name}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  // TODO: Actually create the event via API
  // if (provider === 'google') {
  //   await calendar.events.insert({ calendarId: 'primary', requestBody: { ... } });
  // }

  return { success: true, event };
}

/**
 * Process incoming calendar webhook (for real-time sync).
 * Called when a calendar event is created/updated that involves a CRM contact.
 */
export async function processCalendarWebhook(
  workspaceId: string,
  event: {
    title: string;
    start: string;
    attendeeEmails: string[];
    location?: string;
  }
): Promise<{ success: boolean; activityId?: string }> {
  // Match attendees to contacts
  for (const email of event.attendeeEmails) {
    const contact = await db.contact.findFirst({
      where: { workspaceId, email },
    });

    if (!contact) continue;

    // Find active deal
    const deal = await db.deal.findFirst({
      where: {
        contactId: contact.id,
        stage: { notIn: ["WON", "LOST"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Auto-log meeting
    const activity = await db.activity.create({
      data: {
        type: "MEETING",
        title: `Meeting: ${event.title}`,
        content: `Scheduled: ${new Date(event.start).toLocaleString()}${event.location ? ` at ${event.location}` : ""}`,
        contactId: contact.id,
        dealId: deal?.id,
      },
    });

    return { success: true, activityId: activity.id };
  }

  return { success: false };
}
