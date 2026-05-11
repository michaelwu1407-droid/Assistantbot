import "server-only";

import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { createGmailFilter, createOutlookRule } from "@/lib/email-filters";

export type EmailProvider = "gmail" | "outlook";

export function normalizeEmailProvider(provider: string | null | undefined): EmailProvider | null {
  const normalized = (provider || "").trim().toLowerCase();
  if (normalized === "gmail" || normalized === "outlook") return normalized;
  return null;
}

export function resolveMicrosoftUserEmail(userInfo: unknown): string | null {
  if (!userInfo || typeof userInfo !== "object") return null;
  const payload = userInfo as Record<string, unknown>;
  const directMail = typeof payload.mail === "string" ? payload.mail.trim() : "";
  if (directMail) return directMail;
  const upn = typeof payload.userPrincipalName === "string" ? payload.userPrincipalName.trim() : "";
  return upn || null;
}

export async function upsertEmailIntegrationFromOAuth(input: {
  userId: string;
  provider: EmailProvider;
  emailAddress: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
}) {
  const existing = await db.emailIntegration.findUnique({
    where: {
      userId_provider: {
        userId: input.userId,
        provider: input.provider,
      },
    },
    select: {
      id: true,
      refreshToken: true,
    },
  });

  const tokenExpiry = input.expiresInSeconds
    ? new Date(Date.now() + input.expiresInSeconds * 1000)
    : null;
  const encryptedRefreshToken =
    input.refreshToken && input.refreshToken.trim()
      ? encrypt(input.refreshToken)
      : existing?.refreshToken ?? null;

  return db.emailIntegration.upsert({
    where: {
      userId_provider: {
        userId: input.userId,
        provider: input.provider,
      },
    },
    update: {
      emailAddress: input.emailAddress,
      accessToken: encrypt(input.accessToken),
      refreshToken: encryptedRefreshToken,
      tokenExpiry,
      isActive: true,
      lastSyncAt: new Date(),
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      emailAddress: input.emailAddress,
      accessToken: encrypt(input.accessToken),
      refreshToken: encryptedRefreshToken,
      tokenExpiry,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });
}

export async function finalizeEmailIntegrationSetup(input: {
  userId: string;
  provider: EmailProvider;
  integrationId: string;
}) {
  if (input.provider === "gmail") {
    await createGmailFilter(input.userId, input.integrationId);
    return;
  }

  await createOutlookRule(input.userId, input.integrationId);
}
