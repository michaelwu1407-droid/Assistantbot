import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { parseLeadFromEmail } from "@/lib/ai/lead-parser";
import { sendIntroSms } from "@/lib/sms";

// ─── Gmail Webhook Handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message) {
      return NextResponse.json({ error: "No message data" }, { status: 400 });
    }

    // Decode Gmail message data
    const emailData = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf-8")
    );

    const emailAddress = emailData.emailAddress;
    const historyId = emailData.historyId;

    // Find the email integration
    const integration = await db.emailIntegration.findFirst({
      where: {
        emailAddress,
        isActive: true,
      },
      include: {
        user: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    // Get recent emails since last history ID
    const emails = await getRecentGmailEmails(
      integration,
      historyId
    );

    // Process each email for lead capture
    for (const email of emails) {
      await processLeadEmail(email, integration);
    }

    return NextResponse.json({ processed: emails.length });

  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Lead Email Processing ─────────────────────────────────────────────────

async function processLeadEmail(email: any, integration: any) {
  try {
    // Check if this is from a lead provider
    const isLeadEmail = isFromLeadProvider(email.from, email.subject);
    if (!isLeadEmail) {
      return;
    }

    // Parse lead data using AI
    const leadData = await parseLeadFromEmail({
      from: email.from,
      subject: email.subject,
      body: email.body,
      provider: detectLeadProvider(email.from, email.subject),
    });

    if (!leadData || !leadData.isGenuineLead) {
      return;
    }

    // Find or create contact
    let contact = await db.contact.findFirst({
      where: {
        workspaceId: integration.user.workspace.id,
        email: { equals: leadData.customerEmail, mode: "insensitive" },
      },
    });

    if (!contact) {
      contact = await db.contact.create({
        data: {
          workspaceId: integration.user.workspace.id,
          name: leadData.customerName,
          email: leadData.customerEmail,
          phone: leadData.customerPhone,
          address: leadData.customerAddress,
        },
      });
    }

    // Create a new deal
    const deal = await db.deal.create({
      data: {
        title: leadData.jobTitle || `Lead from ${leadData.provider}`,
        stage: "NEW",
        contactId: contact.id,
        workspaceId: integration.user.workspace.id,
        value: leadData.estimatedValue ? parseFloat(leadData.estimatedValue) : null,
        metadata: {
          source: "email",
          provider: leadData.provider,
          originalEmail: email.body,
          jobDetails: leadData.jobDetails,
        },
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        type: "EMAIL",
        title: `New lead captured from ${leadData.provider}`,
        description: email.subject,
        content: email.body.substring(0, 10000),
        contactId: contact.id,
        dealId: deal.id,
      },
    });

    // Send intro SMS if enabled
    if (integration.user.workspace.twilioPhoneNumber && leadData.customerPhone) {
      try {
        await sendIntroSms({
          to: leadData.customerPhone,
          workspaceId: integration.user.workspace.id,
          dealId: deal.id,
          contactId: contact.id,
        });
      } catch (smsError) {
        console.error("Failed to send intro SMS:", smsError);
      }
    }

    // Create notification
    await db.notification.create({
      data: {
        userId: integration.user.id,
        title: "New Lead Captured",
        message: `${leadData.customerName} from ${leadData.provider}: ${leadData.jobTitle}`,
        type: "SUCCESS",
        link: `/dashboard/deals/${deal.id}`,
      },
    });

  } catch (error) {
    console.error("Error processing lead email:", error);
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function isFromLeadProvider(from: string, subject: string): boolean {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  for (const provider of Object.values(LEAD_PROVIDERS)) {
    const matchesDomain = provider.domains.some(domain => 
      fromLower.includes(domain.toLowerCase())
    );
    const matchesKeyword = provider.keywords.some(keyword => 
      subjectLower.includes(keyword.toLowerCase())
    );

    if (matchesDomain || matchesKeyword) {
      return true;
    }
  }

  return false;
}

function detectLeadProvider(from: string, subject: string): string {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  for (const [providerName, config] of Object.entries(LEAD_PROVIDERS)) {
    const matchesDomain = config.domains.some(domain => 
      fromLower.includes(domain.toLowerCase())
    );
    const matchesKeyword = config.keywords.some(keyword => 
      subjectLower.includes(keyword.toLowerCase())
    );

    if (matchesDomain || matchesKeyword) {
      return providerName;
    }
  }

  return "unknown";
}

async function getRecentGmailEmails(integration: any, historyId: string) {
  const accessToken = await refreshGmailToken(integration);

  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/history?historyId=${historyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Gmail history");
  }

  const history = await response.json();
  const emails = [];

  for (const record of history.history || []) {
    for (const message of record.messagesAdded || []) {
      const emailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        emails.push(parseGmailMessage(emailData));
      }
    }
  }

  return emails;
}

function parseGmailMessage(messageData: any) {
  const headers = messageData.payload.headers;
  const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
  const from = headers.find((h: any) => h.name === "From")?.value || "";
  
  const body = messageData.payload.parts?.[0]?.body?.data || 
               messageData.payload.body?.data || "";

  return {
    from,
    subject,
    body: Buffer.from(body, "base64").toString("utf-8"),
  };
}

// Token refresh functions
async function refreshGmailToken(integration: any): Promise<string> {
  if (!integration.refreshToken) {
    throw new Error("No refresh token available for Gmail");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: decrypt(integration.refreshToken),
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await response.json();

  if (tokenData.error) {
    throw new Error(`Failed to refresh Gmail token: ${tokenData.error}`);
  }

  // Update stored tokens
  const tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
  await db.emailIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(tokenData.access_token),
      tokenExpiry,
    },
  });

  return tokenData.access_token;
}

async function refreshOutlookToken(integration: any): Promise<string> {
  if (!integration.refreshToken) {
    throw new Error("No refresh token available for Outlook");
  }

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: decrypt(integration.refreshToken),
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await response.json();

  if (tokenData.error) {
    throw new Error(`Failed to refresh Outlook token: ${tokenData.error}`);
  }

  // Update stored tokens
  const tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
  await db.emailIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(tokenData.access_token),
      tokenExpiry,
    },
  });

  return tokenData.access_token;
}

// Import LEAD_PROVIDERS from email-filters
const LEAD_PROVIDERS = {
  hipages: {
    domains: ["hipages.com.au", "notifications@hipages.com.au"],
    keywords: ["hipages", "new job", "job request"],
  },
  airtasker: {
    domains: ["airtasker.com", "notifications@airtasker.com", "support@airtasker.com"],
    keywords: ["airtasker", "task", "job posted"],
  },
  oneflare: {
    domains: ["oneflare.com.au", "notifications@oneflare.com.au"],
    keywords: ["oneflare", "quote request", "job lead"],
  },
  serviceseeking: {
    domains: ["serviceseeking.com.au", "notifications@serviceseeking.com.au"],
    keywords: ["serviceseeking", "job request", "quote request"],
  },
  servicetasker: {
    domains: ["servicetasker.com.au", "notifications@servicetasker.com.au"],
    keywords: ["servicetasker", "job match", "task request"],
  },
  bark: {
    domains: ["bark.com", "notifications@bark.com"],
    keywords: ["bark", "new lead", "project request"],
  },
};
