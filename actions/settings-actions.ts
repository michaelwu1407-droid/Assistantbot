"use server"

import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { AgentMode } from "@prisma/client"

export async function getWorkspaceSettings() {
    const authUser = await getAuthUser()
    if (!authUser || !authUser.email) throw new Error("Unauthorized")
    const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
    if (!user) throw new Error("Unauthorized")
    const workspaceId = user.workspaceId

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            agentMode: true,
            workingHoursStart: true,
            workingHoursEnd: true,
            agendaNotifyTime: true,
            wrapupNotifyTime: true,
            aiPreferences: true,
            autoUpdateGlossary: true,
            callOutFee: true,
            inboundEmail: true,
            inboundEmailAlias: true,
            autoCallLeads: true,
            jobReminderHours: true,
            enableJobReminders: true,
            enableTripSms: true,
            settings: true,
        }
    })

    const base = workspace ? { ...workspace, callOutFee: Number(workspace.callOutFee ?? 0) } : null
    if (!base) return null
    const s = (workspace?.settings as Record<string, unknown>) ?? {}
    return {
        ...base,
        agentScriptStyle: (s.agentScriptStyle as string) ?? "opening",
        agentBusinessName: (s.agentBusinessName as string) ?? "",
        textAllowedStart: (s.textAllowedStart as string) ?? "08:00",
        textAllowedEnd: (s.textAllowedEnd as string) ?? "20:00",
        callAllowedStart: (s.callAllowedStart as string) ?? "08:00",
        callAllowedEnd: (s.callAllowedEnd as string) ?? "20:00",
        softChase: (s.softChase as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 3, channel: "sms" },
        invoiceFollowUp: (s.invoiceFollowUp as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 7, channel: "email" },
    }
}

export async function updateWorkspaceSettings(input: {
    agentMode: string
    workingHoursStart: string
    workingHoursEnd: string
    agendaNotifyTime: string
    wrapupNotifyTime: string
    aiPreferences?: string
    autoUpdateGlossary?: boolean
    callOutFee?: number
    jobReminderHours?: number
    enableJobReminders?: boolean
    enableTripSms?: boolean
    agentScriptStyle?: "opening" | "closing"
    agentBusinessName?: string
    textAllowedStart?: string
    textAllowedEnd?: string
    callAllowedStart?: string
    callAllowedEnd?: string
    softChase?: { message?: string; triggerDays?: number; channel?: string }
    invoiceFollowUp?: { message?: string; triggerDays?: number; channel?: string }
    inboundEmailAlias?: string | null
    autoCallLeads?: boolean
}) {
    const authUser = await getAuthUser()
    if (!authUser || !authUser.email) throw new Error("Unauthorized")
    const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
    if (!user) throw new Error("Unauthorized")
    const workspaceId = user.workspaceId

    const settingsKeys = [
        "agentScriptStyle", "agentBusinessName",
        "textAllowedStart", "textAllowedEnd", "callAllowedStart", "callAllowedEnd",
        "softChase", "invoiceFollowUp",
    ] as const
    let settingsUpdate: Record<string, unknown> | undefined
    const s = input as Record<string, unknown>
    for (const key of settingsKeys) {
        if (s[key] !== undefined) {
            if (!settingsUpdate) {
                const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } })
                settingsUpdate = (ws?.settings as Record<string, unknown>) ? { ...(ws.settings as Record<string, unknown>) } : {}
            }
            settingsUpdate[key] = s[key]
        }
    }

    await db.workspace.update({
        where: { id: workspaceId },
        data: {
            agentMode: input.agentMode as AgentMode,
            workingHoursStart: input.workingHoursStart,
            workingHoursEnd: input.workingHoursEnd,
            agendaNotifyTime: input.agendaNotifyTime,
            wrapupNotifyTime: input.wrapupNotifyTime,
            ...(input.aiPreferences !== undefined && { aiPreferences: input.aiPreferences }),
            ...(input.autoUpdateGlossary !== undefined && { autoUpdateGlossary: input.autoUpdateGlossary }),
            ...(input.callOutFee !== undefined && { callOutFee: input.callOutFee }),
            ...(input.jobReminderHours !== undefined && { jobReminderHours: input.jobReminderHours }),
            ...(input.enableJobReminders !== undefined && { enableJobReminders: input.enableJobReminders }),
            ...(input.enableTripSms !== undefined && { enableTripSms: input.enableTripSms }),
            ...(settingsUpdate && { settings: settingsUpdate }),
            ...(input.inboundEmailAlias !== undefined && { inboundEmailAlias: input.inboundEmailAlias }),
            ...(input.autoCallLeads !== undefined && { autoCallLeads: input.autoCallLeads }),
        }
    })

    revalidatePath("/dashboard/settings/agent")
    return { success: true }
}

export async function updateAiPreferences(workspaceId: string, rule: string) {
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) return { success: false }

    const currentRules = workspace.aiPreferences ? workspace.aiPreferences + "\n- " : "- "

    await db.workspace.update({
        where: { id: workspaceId },
        data: {
            aiPreferences: currentRules + rule
        }
    })
    return { success: true }
}

/**
 * Fetch workspace settings by workspaceId directly (no session auth needed).
 * Used by API routes where cookies may not be available.
 */
export async function getWorkspaceSettingsById(workspaceId: string) {
    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            agentMode: true,
            workingHoursStart: true,
            workingHoursEnd: true,
            agendaNotifyTime: true,
            wrapupNotifyTime: true,
            aiPreferences: true,
            autoUpdateGlossary: true,
            callOutFee: true,
            inboundEmail: true,
            settings: true,
        }
    })

    if (!workspace) return null
    const base = { ...workspace, callOutFee: Number(workspace.callOutFee ?? 0) }
    const s = (workspace.settings as Record<string, unknown>) ?? {}
    return {
        ...base,
        agentScriptStyle: (s.agentScriptStyle as string) ?? "opening",
        agentBusinessName: (s.agentBusinessName as string) ?? "",
        textAllowedStart: (s.textAllowedStart as string) ?? "08:00",
        textAllowedEnd: (s.textAllowedEnd as string) ?? "20:00",
        callAllowedStart: (s.callAllowedStart as string) ?? "08:00",
        callAllowedEnd: (s.callAllowedEnd as string) ?? "20:00",
        softChase: (s.softChase as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 3, channel: "sms" },
        invoiceFollowUp: (s.invoiceFollowUp as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 7, channel: "email" },
    }
}

export async function getOrAllocateInboundEmail() {
    const authUser = await getAuthUser()
    if (!authUser || !authUser.email) throw new Error("Unauthorized")
    const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
    if (!user) throw new Error("Unauthorized")
    const workspaceId = user.workspaceId

    let workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { inboundEmail: true } })
    if (!workspace) throw new Error("Workspace not found")

    if (!workspace.inboundEmail) {
        // Generate a pseudo-random email alias for this tenant
        const randStr = Math.random().toString(36).substring(2, 8)
        const generatedEmail = `leads-${workspaceId.substring(0, 6)}-${randStr}@inbox.pjbuddy.com`
        workspace = await db.workspace.update({
            where: { id: workspaceId },
            data: { inboundEmail: generatedEmail },
            select: { inboundEmail: true }
        })
    }
    return workspace.inboundEmail
}

const INBOUND_LEAD_DOMAIN = process.env.INBOUND_LEAD_DOMAIN ?? "inbound.earlymark.ai"

/** Get or allocate the lead-capture forwarding address [alias]@inbound.earlymark.ai for "Lead Won" emails. */
export async function getOrAllocateLeadCaptureEmail(): Promise<string> {
    const authUser = await getAuthUser()
    if (!authUser || !authUser.email) throw new Error("Unauthorized")
    const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
    if (!user) throw new Error("Unauthorized")
    const workspaceId = user.workspaceId

    let workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { inboundEmailAlias: true },
    })
    if (!workspace) throw new Error("Workspace not found")

    if (!workspace.inboundEmailAlias) {
        const alias = `lead-${workspaceId.substring(0, 8)}-${Math.random().toString(36).substring(2, 6)}`
        workspace = await db.workspace.update({
            where: { id: workspaceId },
            data: { inboundEmailAlias: alias },
            select: { inboundEmailAlias: true },
        })
    }
    return `${workspace.inboundEmailAlias}@${INBOUND_LEAD_DOMAIN}`
}
