"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface TemplateView {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  body: string;
  variables: string[];
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.string().default("general"),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
  workspaceId: z.string(),
});

const UpdateTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get all templates for a workspace.
 */
export async function getTemplates(
  workspaceId: string,
  category?: string
): Promise<TemplateView[]> {
  const templates = await db.messageTemplate.findMany({
    where: {
      workspaceId,
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    body: t.body,
    variables: JSON.parse(t.variables || "[]"),
  }));
}

/**
 * Get a single template by ID.
 */
export async function getTemplate(templateId: string): Promise<TemplateView | null> {
  const t = await db.messageTemplate.findUnique({ where: { id: templateId } });
  if (!t) return null;

  return {
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    body: t.body,
    variables: JSON.parse(t.variables || "[]"),
  };
}

/**
 * Create a new message template.
 */
export async function createTemplate(input: z.infer<typeof CreateTemplateSchema>) {
  const parsed = CreateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const template = await db.messageTemplate.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
      variables: JSON.stringify(parsed.data.variables),
      workspaceId: parsed.data.workspaceId,
    },
  });

  return { success: true as const, templateId: template.id };
}

/**
 * Update an existing template.
 */
export async function updateTemplate(input: z.infer<typeof UpdateTemplateSchema>) {
  const parsed = UpdateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { templateId, variables, ...rest } = parsed.data;

  await db.messageTemplate.update({
    where: { id: templateId },
    data: {
      ...rest,
      ...(variables ? { variables: JSON.stringify(variables) } : {}),
    },
  });

  return { success: true };
}

/**
 * Delete a template.
 */
export async function deleteTemplate(templateId: string) {
  await db.messageTemplate.delete({ where: { id: templateId } });
  return { success: true };
}

/**
 * Render a template with variable substitution.
 * Variables in the template body use {{variableName}} syntax.
 */
export async function renderTemplate(
  templateId: string,
  values: Record<string, string>
): Promise<{ subject: string | null; body: string } | null> {
  const template = await db.messageTemplate.findUnique({ where: { id: templateId } });
  if (!template) return null;

  let body = template.body;
  let subject = template.subject;

  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    body = body.replace(pattern, value);
    if (subject) subject = subject.replace(pattern, value);
  }

  return { subject, body };
}

// ─── Preset Templates ───────────────────────────────────────────────

/**
 * Seed preset templates for a workspace.
 * Call this once when a workspace is first created.
 */
export async function seedPresetTemplates(workspaceId: string) {
  const presets = [
    {
      name: "Follow-up after meeting",
      category: "follow-up",
      subject: "Great meeting, {{contactName}}!",
      body: "Hi {{contactName}},\n\nThanks for taking the time to meet today. As discussed, I'll be sending through the {{dealTitle}} proposal by end of week.\n\nLet me know if you have any questions in the meantime.\n\nCheers",
      variables: ["contactName", "dealTitle"],
    },
    {
      name: "Quote sent",
      category: "quote",
      subject: "Your quote for {{dealTitle}}",
      body: "Hi {{contactName}},\n\nPlease find attached your quote for {{dealTitle}} totalling {{amount}}.\n\nThis quote is valid for 30 days. Happy to walk through any line items if needed.\n\nCheers",
      variables: ["contactName", "dealTitle", "amount"],
    },
    {
      name: "Meeting booked",
      category: "meeting",
      subject: "Meeting confirmed: {{dealTitle}}",
      body: "Hi {{contactName}},\n\nJust confirming our meeting for {{dealTitle}}.\n\nLooking forward to it.\n\nCheers",
      variables: ["contactName", "dealTitle"],
    },
    {
      name: "Welcome new lead",
      category: "welcome",
      subject: "Welcome to {{companyName}}!",
      body: "Hi {{contactName}},\n\nThanks for reaching out! I'd love to learn more about what you're looking for.\n\nAre you free for a quick 15-minute call this week?\n\nCheers",
      variables: ["contactName", "companyName"],
    },
    {
      name: "Stale deal nudge",
      category: "follow-up",
      subject: "Checking in on {{dealTitle}}",
      body: "Hi {{contactName}},\n\nJust checking in on {{dealTitle}}. It's been a little while since we last spoke.\n\nAre you still interested in moving forward? Happy to answer any questions or adjust the proposal.\n\nCheers",
      variables: ["contactName", "dealTitle"],
    },
    {
      name: "Invoice reminder",
      category: "reminder",
      subject: "Invoice reminder: {{invoiceNumber}}",
      body: "Hi {{contactName}},\n\nFriendly reminder that invoice {{invoiceNumber}} for {{amount}} is due.\n\nPlease let me know if you have any questions about the invoice.\n\nCheers",
      variables: ["contactName", "invoiceNumber", "amount"],
    },
    {
      name: "Job completed",
      category: "general",
      subject: "Job completed: {{dealTitle}}",
      body: "Hi {{contactName}},\n\nJust letting you know that the work on {{dealTitle}} has been completed.\n\nIf you're happy with everything, I'll send through the final invoice. Would really appreciate a review if you have a moment!\n\nCheers",
      variables: ["contactName", "dealTitle"],
    },
  ];

  const results = await Promise.all(
    presets.map((p) =>
      db.messageTemplate.create({
        data: { ...p, variables: JSON.stringify(p.variables), workspaceId },
      })
    )
  );

  return { success: true, count: results.length };
}
