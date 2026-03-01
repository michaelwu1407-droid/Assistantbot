"use server"

import { db } from "@/lib/db"
import { getAuthUser, getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { revalidatePath } from "next/cache"
import { AgentMode } from "@prisma/client"

async function getWorkspaceId(): Promise<string> {
    const userId = await getAuthUserId()
    if (!userId) throw new Error("Not authenticated")
    const workspace = await getOrCreateWorkspace(userId)
    return workspace.id
}

export async function getWorkspaceSettings() {
    const workspaceId = await getWorkspaceId()

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
        agentOpeningMessage: (s.agentOpeningMessage as string) ?? "",
        agentClosingMessage: (s.agentClosingMessage as string) ?? "",
        textAllowedStart: (s.textAllowedStart as string) ?? "08:00",
        textAllowedEnd: (s.textAllowedEnd as string) ?? "20:00",
        callAllowedStart: (s.callAllowedStart as string) ?? "08:00",
        callAllowedEnd: (s.callAllowedEnd as string) ?? "20:00",
        softChase: (s.softChase as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 3, channel: "sms" },
        invoiceFollowUp: (s.invoiceFollowUp as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 7, channel: "email" },
        callForwardingEnabled: (s.callForwardingEnabled as boolean) ?? false,
        callForwardingMode: (s.callForwardingMode as "full" | "backup" | "off") ?? "backup",
        callForwardingDelaySec: (s.callForwardingDelaySec as number) ?? 20,
        emergencyBypass: (s.emergencyBypass as boolean) ?? false,
        emergencyHoursStart: (s.emergencyHoursStart as string) ?? "",
        emergencyHoursEnd: (s.emergencyHoursEnd as string) ?? "",
        recordCalls: (s.recordCalls as boolean) ?? true,
        transcriptionQuality: (s.transcriptionQuality as "standard" | "high") ?? "standard",
        agentPersonality: (s.agentPersonality as "Professional" | "Friendly") ?? "Professional",
        agentResponseLength: (s.agentResponseLength as number) ?? 50,
        voiceEnabled: (s.voiceEnabled as boolean) ?? false,
        voiceLanguage: (s.voiceLanguage as string) ?? "en-AU",
        voiceType: (s.voiceType as "female" | "male" | "neutral") ?? "female",
        voiceSpeed: (s.voiceSpeed as "0.8" | "1.0" | "1.2") ?? "1.0",
        voiceGreeting: (s.voiceGreeting as string) ?? "",
        voiceAfterHoursMessage: (s.voiceAfterHoursMessage as string) ?? "",
        transcribeVoicemails: (s.transcribeVoicemails as boolean) ?? true,
        autoRespondToMessages: (s.autoRespondToMessages as boolean) ?? true,
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
    agentOpeningMessage?: string
    agentClosingMessage?: string
    textAllowedStart?: string
    textAllowedEnd?: string
    callAllowedStart?: string
    callAllowedEnd?: string
    softChase?: { message?: string; triggerDays?: number; channel?: string }
    invoiceFollowUp?: { message?: string; triggerDays?: number; channel?: string }
    inboundEmailAlias?: string | null
    autoCallLeads?: boolean
    emergencyBypass?: boolean
    emergencyHoursStart?: string
    emergencyHoursEnd?: string
    recordCalls?: boolean
    transcriptionQuality?: "standard" | "high"
    agentPersonality?: "Professional" | "Friendly"
    agentResponseLength?: number
    voiceEnabled?: boolean
    voiceLanguage?: string
    voiceType?: "female" | "male" | "neutral"
    voiceSpeed?: "0.8" | "1.0" | "1.2"
    voiceGreeting?: string
    voiceAfterHoursMessage?: string
    transcribeVoicemails?: boolean
    autoRespondToMessages?: boolean
}) {
    const workspaceId = await getWorkspaceId()

    const settingsKeys = [
        "agentScriptStyle", "agentBusinessName", "agentOpeningMessage", "agentClosingMessage",
        "textAllowedStart", "textAllowedEnd", "callAllowedStart", "callAllowedEnd",
        "softChase", "invoiceFollowUp",
        "emergencyBypass", "emergencyHoursStart", "emergencyHoursEnd",
        "recordCalls", "transcriptionQuality", "agentPersonality", "agentResponseLength",
        "voiceEnabled", "voiceLanguage", "voiceType", "voiceSpeed",
        "voiceGreeting", "voiceAfterHoursMessage", "transcribeVoicemails", "autoRespondToMessages",
    ] as const
    let settingsUpdate: any = undefined
    const s = input as Record<string, unknown>
    for (const key of settingsKeys) {
        if (s[key] !== undefined) {
            if (!settingsUpdate) {
                const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } })
                settingsUpdate = ws && ws.settings ? { ...(ws.settings as Record<string, unknown>) } : {}
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
        agentOpeningMessage: (s.agentOpeningMessage as string) ?? "",
        agentClosingMessage: (s.agentClosingMessage as string) ?? "",
        textAllowedStart: (s.textAllowedStart as string) ?? "08:00",
        textAllowedEnd: (s.textAllowedEnd as string) ?? "20:00",
        callAllowedStart: (s.callAllowedStart as string) ?? "08:00",
        callAllowedEnd: (s.callAllowedEnd as string) ?? "20:00",
        softChase: (s.softChase as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 3, channel: "sms" },
        invoiceFollowUp: (s.invoiceFollowUp as { message?: string; triggerDays?: number; channel?: string }) ?? { message: "", triggerDays: 7, channel: "email" },
        callForwardingEnabled: (s.callForwardingEnabled as boolean) ?? false,
        callForwardingMode: (s.callForwardingMode as "full" | "backup" | "off") ?? "backup",
        callForwardingDelaySec: (s.callForwardingDelaySec as number) ?? 20,
        emergencyBypass: (s.emergencyBypass as boolean) ?? false,
        emergencyHoursStart: (s.emergencyHoursStart as string) ?? "",
        emergencyHoursEnd: (s.emergencyHoursEnd as string) ?? "",
        recordCalls: (s.recordCalls as boolean) ?? true,
        transcriptionQuality: (s.transcriptionQuality as "standard" | "high") ?? "standard",
        agentPersonality: (s.agentPersonality as "Professional" | "Friendly") ?? "Professional",
        agentResponseLength: (s.agentResponseLength as number) ?? 50,
        voiceEnabled: (s.voiceEnabled as boolean) ?? false,
        voiceLanguage: (s.voiceLanguage as string) ?? "en-AU",
        voiceType: (s.voiceType as "female" | "male" | "neutral") ?? "female",
        voiceSpeed: (s.voiceSpeed as "0.8" | "1.0" | "1.2") ?? "1.0",
        voiceGreeting: (s.voiceGreeting as string) ?? "",
        voiceAfterHoursMessage: (s.voiceAfterHoursMessage as string) ?? "",
        transcribeVoicemails: (s.transcribeVoicemails as boolean) ?? true,
        autoRespondToMessages: (s.autoRespondToMessages as boolean) ?? true,
    }
}

export async function getCallForwardingSettings(): Promise<{ enabled: boolean; mode: "full" | "backup" | "off"; delaySec: number }> {
    const workspaceId = await getWorkspaceId()
    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
    })
    const s = (workspace?.settings as Record<string, unknown>) ?? {}
    const mode = (s.callForwardingMode as "full" | "backup" | "off") ?? "backup"
    const enabled = (s.callForwardingEnabled as boolean) ?? mode !== "off"
    const delaySec = Number(s.callForwardingDelaySec ?? 20)
    return { enabled, mode, delaySec }
}

export async function updateCallForwardingSettings(input: { enabled: boolean; mode: "full" | "backup" | "off"; delaySec?: number }) {
    const workspaceId = await getWorkspaceId()
    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
    })
    const current = (workspace?.settings as Record<string, unknown>) ?? {}
    const nextMode = input.enabled ? (input.mode === "off" ? "backup" : input.mode) : "off"
    const nextDelay = Math.max(10, Math.min(45, Number(input.delaySec ?? 20)))
    await db.workspace.update({
        where: { id: workspaceId },
        data: {
            settings: {
                ...current,
                callForwardingEnabled: input.enabled,
                callForwardingMode: nextMode,
                callForwardingDelaySec: nextDelay,
            },
        },
    })
    revalidatePath("/dashboard/settings")
    return { success: true, mode: nextMode }
}

export async function getBusinessContact(): Promise<{ phone?: string; email?: string; address?: string } | null> {
    let workspaceId: string
    try {
        workspaceId = await getWorkspaceId()
    } catch {
        return null
    }
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } })
    const s = (workspace?.settings as Record<string, unknown>) ?? {}
    return (s.businessContact as { phone?: string; email?: string; address?: string }) ?? null
}

export async function updateBusinessContact(data: { phone?: string; email?: string; address?: string }) {
    const workspaceId = await getWorkspaceId()
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } })
    const current = (workspace?.settings as Record<string, unknown>) ?? {}
    const businessContact = { ...(current.businessContact as Record<string, string> || {}), ...data }
    await db.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...current, businessContact } },
    })
    revalidatePath("/dashboard/settings/my-business")
    return { success: true }
}

export async function getOrAllocateInboundEmail() {
    const workspaceId = await getWorkspaceId()

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

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function toFirstName(value?: string | null): string {
    const raw = (value || "").trim()
    const first = raw.split(/\s+/)[0] || ""
    const safe = first.toLowerCase().replace(/[^a-z0-9]/g, "")
    return safe || "user"
}

/** Get or allocate the lead-capture forwarding address [alias]@inbound.earlymark.ai for "Lead Won" emails. */
export async function getOrAllocateLeadCaptureEmail(): Promise<string> {
    const workspaceId = await getWorkspaceId()
    const authUser = await getAuthUser()
    if (!authUser) throw new Error("Not authenticated")
    const domainBase = process.env.RESEND_FROM_DOMAIN ?? "earlymark.ai"

    let workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            inboundEmailAlias: true,
            name: true,
            users: {
                select: { id: true, email: true, name: true },
                orderBy: { id: "asc" },
            },
        },
    })
    if (!workspace) throw new Error("Workspace not found")

    const businessSlug = toSlug(workspace.name || "business")
    const currentUser = workspace.users.find((u) => u.email === authUser.email)
    const firstNameBase = toFirstName(currentUser?.name || authUser.name || authUser.email?.split("@")[0])
    const sameFirstUsers = workspace.users.filter((u) => toFirstName(u.name || (u.email ? u.email.split("@")[0] : "")) === firstNameBase)
    const sameFirstIndex = Math.max(0, sameFirstUsers.findIndex((u) => u.email === authUser.email))
    const localPart = sameFirstIndex === 0 ? firstNameBase : `${firstNameBase}${sameFirstIndex}`
    const uniqueAlias = `${localPart}-${businessSlug}`

    if (!workspace.inboundEmailAlias || workspace.inboundEmailAlias !== uniqueAlias) {
        workspace = await db.workspace.update({
            where: { id: workspaceId },
            data: { inboundEmailAlias: uniqueAlias },
            select: {
                inboundEmailAlias: true,
                name: true,
                users: { select: { id: true, email: true, name: true }, orderBy: { id: "asc" } },
            },
        })
    }
    return `${localPart}@${businessSlug}.${domainBase}`
}
