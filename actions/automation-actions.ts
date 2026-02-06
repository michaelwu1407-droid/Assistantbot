"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface AutomationView {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerConfig;
  action: ActionConfig;
  lastFiredAt: Date | null;
}

export interface TriggerConfig {
  event: "deal_stale" | "deal_stage_change" | "new_lead" | "task_overdue";
  threshold_days?: number;
  stage?: string;
}

export interface ActionConfig {
  type: "notify" | "email" | "create_task" | "move_stage";
  channel?: string;
  template?: string;
  message?: string;
  targetStage?: string;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateAutomationSchema = z.object({
  name: z.string().min(1),
  workspaceId: z.string(),
  trigger: z.object({
    event: z.enum(["deal_stale", "deal_stage_change", "new_lead", "task_overdue"]),
    threshold_days: z.number().optional(),
    stage: z.string().optional(),
  }),
  action: z.object({
    type: z.enum(["notify", "email", "create_task", "move_stage"]),
    channel: z.string().optional(),
    template: z.string().optional(),
    message: z.string().optional(),
    targetStage: z.string().optional(),
  }),
});

// ─── Pre-built Recipes ──────────────────────────────────────────────

export const PRESET_AUTOMATIONS = [
  {
    name: "Stale deal alert (5 days in Negotiation)",
    trigger: { event: "deal_stale" as const, threshold_days: 5, stage: "NEGOTIATION" },
    action: { type: "notify" as const, channel: "in_app", message: "Deal has been in Negotiation for 5+ days" },
  },
  {
    name: "Auto-welcome new leads",
    trigger: { event: "new_lead" as const },
    action: { type: "email" as const, template: "welcome_lead", message: "Thanks for your interest! We'll be in touch shortly." },
  },
  {
    name: "Create follow-up task on stage change",
    trigger: { event: "deal_stage_change" as const, stage: "CONTACTED" },
    action: { type: "create_task" as const, message: "Follow up within 48 hours" },
  },
  {
    name: "Overdue task escalation",
    trigger: { event: "task_overdue" as const, threshold_days: 2 },
    action: { type: "notify" as const, channel: "in_app", message: "Task overdue by 2+ days — needs attention" },
  },
];

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get all automations for a workspace.
 */
export async function getAutomations(workspaceId: string): Promise<AutomationView[]> {
  const automations = await db.automation.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return automations.map((a) => ({
    id: a.id,
    name: a.name,
    enabled: a.enabled,
    trigger: a.trigger as unknown as TriggerConfig,
    action: a.action as unknown as ActionConfig,
    lastFiredAt: a.lastFiredAt,
  }));
}

/**
 * Create a new automation rule.
 */
export async function createAutomation(input: z.infer<typeof CreateAutomationSchema>) {
  const parsed = CreateAutomationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const automation = await db.automation.create({
    data: {
      name: parsed.data.name,
      workspaceId: parsed.data.workspaceId,
      trigger: JSON.parse(JSON.stringify(parsed.data.trigger)),
      action: JSON.parse(JSON.stringify(parsed.data.action)),
    },
  });

  return { success: true, automationId: automation.id };
}

/**
 * Toggle an automation on/off.
 */
export async function toggleAutomation(automationId: string) {
  const automation = await db.automation.findUnique({ where: { id: automationId } });
  if (!automation) return { success: false, error: "Automation not found" };

  await db.automation.update({
    where: { id: automationId },
    data: { enabled: !automation.enabled },
  });

  return { success: true, enabled: !automation.enabled };
}

/**
 * Evaluate all automations for a workspace.
 * Called periodically or on events (deal update, new lead, etc).
 * Returns a list of triggered notifications/actions.
 */
export async function evaluateAutomations(
  workspaceId: string,
  event: { type: string; dealId?: string; stage?: string }
): Promise<{ triggered: string[] }> {
  const automations = await db.automation.findMany({
    where: { workspaceId, enabled: true },
  });

  const triggered: string[] = [];

  for (const automation of automations) {
    const trigger = automation.trigger as unknown as TriggerConfig;
    const action = automation.action as unknown as ActionConfig;
    let shouldFire = false;

    switch (trigger.event) {
      case "deal_stage_change":
        if (event.type === "stage_change" && event.stage === trigger.stage) {
          shouldFire = true;
        }
        break;

      case "new_lead":
        if (event.type === "new_lead") {
          shouldFire = true;
        }
        break;

      case "deal_stale": {
        if (event.type === "check_stale" && event.dealId) {
          const deal = await db.deal.findUnique({
            where: { id: event.dealId },
            include: { activities: { orderBy: { createdAt: "desc" }, take: 1 } },
          });
          if (deal) {
            const lastActivity = deal.activities[0]?.createdAt ?? deal.createdAt;
            const daysSince = Math.floor(
              (Date.now() - lastActivity.getTime()) / 86400000
            );
            const threshold = trigger.threshold_days ?? 7;
            if (
              daysSince >= threshold &&
              (!trigger.stage || deal.stage === trigger.stage)
            ) {
              shouldFire = true;
            }
          }
        }
        break;
      }

      case "task_overdue":
        if (event.type === "check_tasks") {
          shouldFire = true;
        }
        break;
    }

    if (shouldFire) {
      triggered.push(`[${automation.name}] → ${action.message ?? action.type}`);

      await db.automation.update({
        where: { id: automation.id },
        data: { lastFiredAt: new Date() },
      });

      // If action is create_task, actually create one
      if (action.type === "create_task" && event.dealId) {
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + 2);
        await db.task.create({
          data: {
            title: action.message ?? "Follow up",
            dueAt,
            dealId: event.dealId,
          },
        });
      }
    }
  }

  return { triggered };
}

/**
 * Delete an automation.
 */
export async function deleteAutomation(automationId: string) {
  await db.automation.delete({ where: { id: automationId } });
  return { success: true };
}
