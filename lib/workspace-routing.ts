import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeEmail, phoneMatches } from "@/lib/phone-utils";

export async function findWorkspaceByTwilioNumber<T extends Prisma.WorkspaceSelect>(
  phone: string | undefined,
  select: T,
): Promise<(Prisma.WorkspaceGetPayload<{ select: T }> & { twilioPhoneNumber: string | null }) | null> {
  if (!phone) return null;

  const workspaces = await db.workspace.findMany({
    where: { twilioPhoneNumber: { not: null } },
    // Cast to avoid complex generic conflicts between Prisma versions
    select: {
      ...(select as any),
      twilioPhoneNumber: true,
    } as any,
  });

  const match = workspaces.find((workspace) => phoneMatches((workspace as any).twilioPhoneNumber, phone));
  return (match as any) ?? null;
}

export async function findWorkspaceByInboundEmail<T extends Prisma.WorkspaceSelect>(
  email: string | undefined,
  select: T,
): Promise<(Prisma.WorkspaceGetPayload<{ select: T }> & { inboundEmail: string | null }) | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const workspaces = await db.workspace.findMany({
    where: { inboundEmail: { not: null } },
    select: {
      ...(select as any),
      inboundEmail: true,
    } as any,
  });

  const match = workspaces.find(
    (workspace) => normalizeEmail((workspace as any).inboundEmail) === normalizedEmail,
  );
  return (match as any) ?? null;
}

export async function findUserByPhone<T extends Prisma.UserSelect>(
  phone: string | undefined,
  select: T,
): Promise<(Prisma.UserGetPayload<{ select: T }> & { phone: string | null }) | null> {
  if (!phone) return null;

  const users = await db.user.findMany({
    where: { phone: { not: null } },
    select: {
      ...(select as any),
      phone: true,
    } as any,
  });

  const match = users.find((user) => phoneMatches((user as any).phone, phone));
  return (match as any) ?? null;
}

export async function findContactByPhone<T extends Prisma.ContactSelect>(
  workspaceId: string,
  phone: string | undefined,
  select: T,
): Promise<(Prisma.ContactGetPayload<{ select: T }> & { phone: string | null }) | null> {
  if (!phone) return null;

  const contacts = await db.contact.findMany({
    where: {
      workspaceId,
      phone: { not: null },
    },
    select: {
      ...(select as any),
      phone: true,
    } as any,
  });

  const match = contacts.find((contact) => phoneMatches((contact as any).phone, phone));
  return (match as any) ?? null;
}
