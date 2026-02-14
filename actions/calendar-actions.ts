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
  workspaceId: string,
  accessToken: string
): Promise<CalendarSyncResult> {
  try {
    const now = new Date().toISOString();

    // 1. Fetch from Google Calendar API
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=50&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      return {
        success: false,
        synced: 0,
        activitiesCreated: 0,
        error: `Google Calendar API error: ${res.statusText}`
      };
    }

    const data = await res.json();
    const events = data.items || [];
    let synced = 0;
    let activitiesCreated = 0;

    for (const event of events) {
      // 2. Match attendees to matched contacts
      const attendees: { email: string }[] = event.attendees || [];

      for (const attendee of attendees) {
        const contact = await db.contact.findFirst({
          where: { workspaceId, email: attendee.email }
        });

        if (contact) {
          // Check for existing meeting activity to avoid duplicates
          const existing = await db.activity.findFirst({
            where: {
              contactId: contact.id,
              title: event.summary,
              type: "MEETING"
            }
          });

          if (!existing) {
            await db.activity.create({
              data: {
                type: "MEETING",
                title: event.summary || "Calendar Event",
                content: `${event.start?.dateTime || event.start?.date} - ${event.end?.dateTime || event.end?.date}\nLocation: ${event.location || "N/A"}`,
                contactId: contact.id
              }
            });
            activitiesCreated++;
          }
        }
      }
      synced++;
    }

    return { success: true, synced, activitiesCreated };
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    return {
      success: false,
      synced: 0,
      activitiesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Sync events from Outlook Calendar.
 *
 * STUB: Uses Microsoft Graph API.
 */
export async function syncOutlookCalendar(
  workspaceId: string,
  accessToken: string
): Promise<CalendarSyncResult> {
  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Next 7 days

    // 1. Fetch from Microsoft Graph API
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=subject,start,end,location,attendees`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      return {
        success: false,
        synced: 0,
        activitiesCreated: 0,
        error: `Outlook Calendar API error: ${res.statusText}`
      };
    }

    const data = await res.json();
    const events = data.value || [];
    let synced = 0;
    let activitiesCreated = 0;

    for (const event of events) {
      // 2. Match attendees to matched contacts
      const attendees: { emailAddress: { address: string } }[] = event.attendees || [];

      for (const attendee of attendees) {
        const email = attendee.emailAddress?.address;
        if (!email) continue;

        const contact = await db.contact.findFirst({
          where: { workspaceId, email }
        });

        if (contact) {
          const existing = await db.activity.findFirst({
            where: {
              contactId: contact.id,
              title: event.subject,
              type: "MEETING"
            }
          });

          if (!existing) {
            await db.activity.create({
              data: {
                type: "MEETING",
                title: event.subject || "Calendar Event",
                content: `${event.start?.dateTime} - ${event.end?.dateTime}\nLocation: ${event.location?.displayName || "N/A"}`,
                contactId: contact.id
              }
            });
            activitiesCreated++;
          }
        }
      }
      synced++;
    }

    return { success: true, synced, activitiesCreated };
  } catch (error) {
    console.error("Outlook Calendar sync error:", error);
    return {
      success: false,
      synced: 0,
      activitiesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
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
    start: task.dueAt!,
    end: new Date(task.dueAt!.getTime() + 30 * 60 * 1000), // 30min default
    attendees: task.contact?.email ? [task.contact.email] : [],
    description: [
      task.description,
      task.deal ? `Deal: ${task.deal.title}` : null,
      task.contact ? `Contact: ${task.contact.name}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  // 2. Post to external calendar API
  try {
    if (_provider === 'google') {
      // Check for token (in real app, fetched from DB)
      const accessToken = "placeholder_token";

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
        attendees: event.attendees.map(email => ({ email })),
      };

      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEvent)
        }
      );

      if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);
      const data = await res.json();
      event.id = data.id || event.id; // Update ID if successful
    }
    else if (_provider === 'outlook') {
      const accessToken = "placeholder_token";

      const outlookEvent = {
        subject: event.title,
        body: { contentType: "text", content: event.description },
        start: { dateTime: event.start.toISOString(), timeZone: "UTC" },
        end: { dateTime: event.end.toISOString(), timeZone: "UTC" },
        attendees: event.attendees.map(email => ({ emailAddress: { address: email } })),
      };

      const res = await fetch(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(outlookEvent)
        }
      );

      if (!res.ok) throw new Error(`Outlook API error: ${res.statusText}`);
      const data = await res.json();
      event.id = data.id || event.id;
    }
  } catch (error) {
    console.error("Failed to create external calendar event:", error);
    // We still return success:true for the database task creation, but maybe note the sync failure?
    // For now, let's return error.
    return { success: false, error: error instanceof Error ? error.message : "External sync failed" };
  }

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
