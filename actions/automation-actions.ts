"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { createNotification } from "./notification-actions";
import { createTask } from "./task-actions";
import { runSendEmail } from "./chat-actions";
import { getTemplates, renderTemplate } from "./template-actions";
import { logActivity } from "./activity-actions";
import { DealStage } from "@prisma/client";

const DEAL_STAGE_VALUES = new Set<DealStage>([
  "NEW",
  "CONTACTED",
  "NEGOTIATION",
  "SCHEDULED",
  "PIPELINE",
  "INVOICED",
  "PENDING_COMPLETION",
  "WON",
  "LOST",
  "DELETED",
  "ARCHIVED",
]);

function parseDealStage(value: string): DealStage | null {
  const normalized = value.trim().toUpperCase();
  return DEAL_STAGE_VALUES.has(normalized as DealStage) ? (normalized as DealStage) : null;
}

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

const PRESET_AUTOMATIONS = [
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
  event: { type: string; dealId?: string; stage?: string; contactId?: string }
): Promise<{ triggered: string[] }> {
  type OverdueTaskRef = { id: string; title: string; deal?: { id: string } | null };
  type EventWithOverdue = typeof event & { _overdueTasks?: OverdueTaskRef[] };
  const eventWithOverdue = event as EventWithOverdue;

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

      case "task_overdue": {
        if (event.type === "check_tasks") {
          // Query for actually overdue tasks in this workspace
          const threshold = trigger.threshold_days ?? 2;
          const cutoff = new Date(Date.now() - threshold * 86400000);
          const overdueTasks = await db.task.findMany({
            where: {
              completed: false,
              dueAt: { lt: cutoff },
              deal: { workspaceId },
            },
            include: { deal: true },
          });
          if (overdueTasks.length > 0) {
            shouldFire = true;
            // Stash overdue tasks on the event so the action block can reference them
            eventWithOverdue._overdueTasks = overdueTasks as unknown as OverdueTaskRef[];
          }
        }
        break;
      }
    }

    if (shouldFire) {
      try {
        // ─── Atomic guard: claim this firing with optimistic lock ───
        // Only proceed if lastFiredAt hasn't changed since we read it,
        // preventing duplicate execution under concurrent webhook calls.
        const claimed = await db.automation.updateMany({
          where: {
            id: automation.id,
            lastFiredAt: automation.lastFiredAt, // optimistic lock
          },
          data: { lastFiredAt: new Date() },
        });
        if (claimed.count === 0) {
          console.log(`[Automation] Skipped ${automation.name}: concurrent execution detected`);
          continue;
        }

        triggered.push(`[${automation.name}] → ${action.message ?? action.type}`);

        // ─── Execute Actions ───

        // 1. Create Task (with dedup: skip if identical pending task exists)
        if (action.type === "create_task" && event.dealId) {
          const taskTitle = action.message ?? "Follow up";
          const existingTask = await db.task.findFirst({
            where: {
              dealId: event.dealId,
              title: taskTitle,
              completedAt: null,
            },
          });
          if (!existingTask) {
            const dueAt = new Date();
            dueAt.setDate(dueAt.getDate() + 2);
            await createTask({
              title: taskTitle,
              dueAt,
              dealId: event.dealId,
              contactId: event.contactId,
            });
          } else {
            console.log(`[Automation] Skipped duplicate task "${taskTitle}" for deal ${event.dealId}`);
          }
        }

        // 2. Notify Users
        if (action.type === "notify") {
          const users = await db.user.findMany({ where: { workspaceId } });
          const overdueTasks = eventWithOverdue._overdueTasks;

          if (overdueTasks && overdueTasks.length > 0) {
            // Send one notification per overdue task so each is actionable
            for (const task of overdueTasks) {
              for (const user of users) {
                await createNotification({
                  userId: user.id,
                  title: automation.name,
                  message: `${action.message ?? "Task overdue"}: "${task.title}"`,
                  type: "SYSTEM",
                  link: task.deal?.id ? `/crm?dealId=${task.deal.id}` : undefined,
                });
              }
            }
          } else {
            for (const user of users) {
              await createNotification({
                userId: user.id,
                title: automation.name,
                message: action.message ?? "Automation triggered",
                type: "SYSTEM",
                link: event.dealId ? `/crm?dealId=${event.dealId}` : undefined,
              });
            }
          }
        }

        // 3. Send Email (transactional: reserve activity first, send, then confirm)
        if (action.type === "email" && action.template && event.contactId) {
          try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const alreadySent = await db.activity.findFirst({
              where: {
                type: "EMAIL",
                contactId: event.contactId,
                title: { startsWith: `Automation: ${automation.name}` },
                createdAt: { gte: todayStart },
              },
            });
            if (alreadySent) {
              console.log(`[Automation] Skipped duplicate email for ${automation.name} to contact ${event.contactId}`);
              continue;
            }

            const deal = event.dealId
              ? await db.deal.findUnique({
                  where: { id: event.dealId },
                  include: {
                    contact: true,
                    workspace: {
                      select: {
                        id: true,
                        name: true,
                        ownerId: true,
                        inboundEmailAlias: true,
                      },
                    },
                  },
                })
              : null;

            if (!deal || !deal.contact || !deal.workspace) {
              console.log(`[Automation] Missing deal/contact/workspace data for email automation`);
              continue;
            }

            const owner = deal.workspace.ownerId
              ? await db.user.findUnique({
                  where: { id: deal.workspace.ownerId },
                  select: { email: true },
                })
              : null;

            const templateData = await renderTemplate(action.template, {
              contactName: deal.contact.name || "there",
              dealTitle: deal.title,
              amount: deal.value?.toString() || "0",
              companyName: deal.workspace.name,
            });

            if (!templateData) {
              console.log(`[Automation] Template ${action.template} not found`);
              continue;
            }

            // ── Transactional: create activity BEFORE send (acts as dedup guard) ──
            const pendingActivity = await logActivity({
              type: "EMAIL",
              title: `Automation: ${automation.name} - ${templateData.subject} [PENDING]`,
              content: templateData.body,
              contactId: deal.contact.id,
              dealId: event.dealId,
            });

            await runSendEmail(deal.workspace.id, {
              contactName: deal.contact.name || "there",
              subject: templateData.subject || "Automated Message",
              body: templateData.body,
              workspaceAlias: deal.workspace.inboundEmailAlias || undefined,
              workspaceName: deal.workspace.name,
              ownerEmail: owner?.email,
            });

            // ── Confirm: update activity title to remove [PENDING] ──
            if (pendingActivity?.activityId) {
              await db.activity.update({
                where: { id: pendingActivity.activityId },
                data: { title: `Automation: ${automation.name} - ${templateData.subject}` },
              }).catch(() => {}); // non-critical
            }

            console.log(`[Automation] Email sent: ${automation.name} → ${deal.contact.email}`);
          } catch (error) {
            console.error(`[Automation] Failed to send email for ${automation.name}:`, error);
          }
        }

        // 4. Move Stage
        if (action.type === "move_stage" && event.dealId && action.targetStage) {
          try {
            const STAGE_REVERSE: Record<string, DealStage> = {
              new: "NEW", new_request: "NEW", quote_sent: "CONTACTED",
              scheduled: "SCHEDULED", pipeline: "PIPELINE",
              ready_to_invoice: "INVOICED", pending_approval: "PENDING_COMPLETION",
              completed: "WON", lost: "LOST", deleted: "DELETED",
            };
            const prismaStage = STAGE_REVERSE[action.targetStage] ?? parseDealStage(action.targetStage);
            if (!prismaStage) {
              console.warn(`[Automation] Skipped invalid target stage: ${action.targetStage}`);
              continue;
            }
            await db.deal.update({
              where: { id: event.dealId },
              data: { stage: prismaStage, stageChangedAt: new Date() },
            });
            await logActivity({
              type: "NOTE",
              title: `Automation: ${automation.name} — moved to ${action.targetStage}`,
              content: action.message || `Deal automatically moved to ${action.targetStage}`,
              dealId: event.dealId,
            });
            console.log(`[Automation] Moved deal ${event.dealId} to stage ${prismaStage}`);
          } catch (error) {
            console.error(`[Automation] Failed to move stage for ${automation.name}:`, error);
          }
        }
      } catch (err) {
        console.error(`[Automation] Error executing automation ${automation.name}:`, err);
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
