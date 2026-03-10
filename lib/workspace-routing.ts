import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone, phoneMatches } from "@/lib/phone-utils";

export async function findWorkspaceByTwilioNumber(phone?: string) {
  if (!phone) return null;

  const normalizedPhone = normalizePhone(phone);
  const select = {
    id: true,
    name: true,
    ownerId: true,
    settings: true,
    twilioPhoneNumber: true,
    twilioPhoneNumberNormalized: true,
    twilioSubaccountId: true,
    twilioSubaccountAuthToken: true,
    twilioSipTrunkSid: true,
    voiceEnabled: true,
    inboundEmail: true,
  } as const;

  if (normalizedPhone) {
    const directMatch = await db.workspace.findFirst({
      where: { twilioPhoneNumberNormalized: normalizedPhone },
      select,
    });

    if (directMatch) {
      return directMatch;
    }
  }

  const workspaces = await db.workspace.findMany({
    where: { twilioPhoneNumber: { not: null } },
    select,
  });

  return workspaces.find((workspace) => phoneMatches(workspace.twilioPhoneNumber, phone)) ?? null;
}

export async function findWorkspaceByInboundEmail(email?: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const workspaces = await db.workspace.findMany({
    where: { inboundEmail: { not: null } },
    select: {
      id: true,
      ownerId: true,
      inboundEmail: true,
    },
  });

  return workspaces.find((workspace) => normalizeEmail(workspace.inboundEmail) === normalized) ?? null;
}

export async function findUserByPhone(phone?: string) {
  if (!phone) return null;

  const users = await db.user.findMany({
    where: { phone: { not: null } },
    select: {
      id: true,
      name: true,
      phone: true,
      workspaceId: true,
    },
  });

  return users.find((user) => phoneMatches(user.phone, phone)) ?? null;
}

export async function findContactByPhone(workspaceId: string, phone?: string) {
  if (!phone) return null;

  const contacts = await db.contact.findMany({
    where: {
      workspaceId,
      phone: { not: null },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  return contacts.find((contact) => phoneMatches(contact.phone, phone)) ?? null;
}
