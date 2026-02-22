import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

// ─── Lead Provider Email Patterns ───────────────────────────────────────────

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

// ─── Gmail Filter Creation ─────────────────────────────────────────────────

export async function createGmailFilter(userId: string, integrationId: string) {
  const integration = await db.emailIntegration.findUnique({
    where: { id: integrationId, userId },
  });

  if (!integration || integration.provider !== "gmail") {
    throw new Error("Gmail integration not found");
  }

  // Refresh token if needed
  const accessToken = await refreshGmailToken(integration);

  // Create filter criteria for all lead providers
  const fromCriteria = Object.values(LEAD_PROVIDERS)
    .flatMap(provider => provider.domains)
    .map(domain => `from:${domain}`)
    .join(" OR ");

  const subjectCriteria = Object.values(LEAD_PROVIDERS)
    .flatMap(provider => provider.keywords)
    .map(keyword => `subject:${keyword}`)
    .join(" OR ");

  const filterQuery = `(${fromCriteria}) OR (${subjectCriteria})`;

  // Create Gmail filter
  const filterData = {
    criteria: {
      query: filterQuery,
    },
    action: {
      addLabelIds: ["Label_1"], // Create a "Pj-Buddy-Lead" label
      forward: `${integration.userId}-leads@pj-buddy.com`, // Forward to our webhook
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/settings/filters`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filterData),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Gmail filter: ${error}`);
  }

  const filter = await response.json();

  // Create the label if it doesn't exist
  await createGmailLabel(accessToken, "Pj-Buddy-Lead");

  // Set up Gmail watch for push notifications
  const watchResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: process.env.GMAIL_PUBSUB_TOPIC!,
        labelIds: ["Label_1"], // Watch only the lead label
      }),
    }
  );

  if (watchResponse.ok) {
    const watchData = await watchResponse.json();
    // Store the watch ID for later management
    await db.emailIntegration.update({
      where: { id: integrationId },
      data: { webhookId: watchData.historyId },
    });
  }

  return filter;
}

// ─── Outlook Rule Creation ─────────────────────────────────────────────────

export async function createOutlookRule(userId: string, integrationId: string) {
  const integration = await db.emailIntegration.findUnique({
    where: { id: integrationId, userId },
  });

  if (!integration || integration.provider !== "outlook") {
    throw new Error("Outlook integration not found");
  }

  // Refresh token if needed
  const accessToken = await refreshOutlookToken(integration);

  // Create rule criteria for all lead providers
  const conditions = Object.values(LEAD_PROVIDERS).map(provider => ({
    senderContains: provider.domains,
    subjectContains: provider.keywords,
  }));

  const ruleData = {
    displayName: "Pj-Buddy Lead Capture",
    sequence: 1,
    conditions: {
      and: conditions,
    },
    actions: {
      forwardTo: [`${integration.userId}-leads@pj-buddy.com`],
      markAsRead: false,
      categorizeInto: "Pj-Buddy-Lead",
    },
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ruleData),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Outlook rule: ${error}`);
  }

  const rule = await response.json();

  // Set up Graph subscription for push notifications
  const subscriptionData = {
    changeType: "created",
    notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/email-received`,
    resource: "me/mailFolders/inbox/messages",
    expirationDateTime: new Date(Date.now() + 4230000).toISOString(), // Max 24 hours
    clientState: integrationId,
  };

  const subscriptionResponse = await fetch(
    `https://graph.microsoft.com/v1.0/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionData),
    }
  );

  if (subscriptionResponse.ok) {
    const subscription = await subscriptionResponse.json();
    // Store the subscription ID for later management
    await db.emailIntegration.update({
      where: { id: integrationId },
      data: { webhookId: subscription.id },
    });
  }

  return rule;
}

// ─── Token Refresh Helpers ───────────────────────────────────────────────

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

// ─── Helper Functions ─────────────────────────────────────────────────────

async function createGmailLabel(accessToken: string, labelName: string) {
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/labels`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    }
  );

  // Label might already exist, which is fine
  if (!response.ok && !response.status.toString().startsWith("4")) {
    console.warn("Failed to create Gmail label:", await response.text());
  }
}
