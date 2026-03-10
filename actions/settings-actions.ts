"use server"

import { db } from "@/lib/db"
import { getAuthUser, getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { revalidatePath } from "next/cache"
import { AgentMode } from "@prisma/client"
import { getSubaccountClient, twilioMasterClient } from "@/lib/twilio"
import { buildCallForwardingSetupSmsBody, type CallForwardingCarrier } from "@/lib/call-forwarding"
import { normalizeWeeklyHours, type WeeklyHours } from "@/lib/working-hours"
import { normalizeAppAgentMode } from "@/lib/agent-mode"

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
        agentMode: normalizeAppAgentMode(base.agentMode),
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
        callForwardingDelaySec: (s.callForwardingDelaySec as number) ?? 12,
        callForwardingCarrier: (s.callForwardingCarrier as CallForwardingCarrier) ?? "other",
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
        weeklyHours: s.weeklyHours ? normalizeWeeklyHours(s.weeklyHours) : undefined,
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
    weeklyHours?: WeeklyHours
    callForwardingEnabled?: boolean
    callForwardingMode?: "full" | "backup" | "off"
    callForwardingDelaySec?: number
    callForwardingCarrier?: CallForwardingCarrier
}) {
    const workspaceId = await getWorkspaceId()

    const settingsKeys = [
        "agentScriptStyle", "agentBusinessName", "agentOpeningMessage", "agentClosingMessage",
        "textAllowedStart", "textAllowedEnd", "callAllowedStart", "callAllowedEnd",
        "softChase", "invoiceFollowUp",
        "callForwardingEnabled", "callForwardingMode", "callForwardingDelaySec", "callForwardingCarrier",
        "emergencyBypass", "emergencyHoursStart", "emergencyHoursEnd",
        "recordCalls", "transcriptionQuality", "agentPersonality", "agentResponseLength",
        "voiceEnabled", "voiceLanguage", "voiceType", "voiceSpeed",
        "voiceGreeting", "voiceAfterHoursMessage", "transcribeVoicemails", "autoRespondToMessages", "weeklyHours",
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
            agentMode: normalizeAppAgentMode(input.agentMode) as AgentMode,
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
        agentMode: normalizeAppAgentMode(base.agentMode),
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
        callForwardingDelaySec: (s.callForwardingDelaySec as number) ?? 12,
        callForwardingCarrier: (s.callForwardingCarrier as CallForwardingCarrier) ?? "other",
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
        weeklyHours: s.weeklyHours ? normalizeWeeklyHours(s.weeklyHours) : undefined,
    }
}

export async function getCallForwardingSettings(): Promise<{ enabled: boolean; mode: "full" | "backup" | "off"; delaySec: number; carrier: CallForwardingCarrier }> {
    const workspaceId = await getWorkspaceId()
    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
    })
    const s = (workspace?.settings as Record<string, unknown>) ?? {}
    const mode = (s.callForwardingMode as "full" | "backup" | "off") ?? "backup"
    const enabled = (s.callForwardingEnabled as boolean) ?? mode !== "off"
    const delaySec = Number(s.callForwardingDelaySec ?? 12)
    const carrier = (s.callForwardingCarrier as CallForwardingCarrier) ?? "other"
    return { enabled, mode, delaySec, carrier }
}

export async function updateCallForwardingSettings(input: { enabled: boolean; mode: "full" | "backup" | "off"; delaySec?: number; carrier?: CallForwardingCarrier }) {
    const workspaceId = await getWorkspaceId()
    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
    })
    const current = (workspace?.settings as Record<string, unknown>) ?? {}
    const nextMode = input.enabled ? (input.mode === "off" ? "backup" : input.mode) : "off"
    const nextDelay = Math.max(10, Math.min(45, Number(input.delaySec ?? 12)))
    const nextCarrier = input.carrier ?? (current.callForwardingCarrier as CallForwardingCarrier) ?? "other"
    await db.workspace.update({
        where: { id: workspaceId },
        data: {
            settings: {
                ...current,
                callForwardingEnabled: input.enabled,
                callForwardingMode: nextMode,
                callForwardingDelaySec: nextDelay,
                callForwardingCarrier: nextCarrier,
            },
        },
    })
    revalidatePath("/dashboard/settings")
    return { success: true, mode: nextMode, carrier: nextCarrier }
}

export async function sendCallForwardingSetupSms(input?: {
    mode?: "full" | "backup"
    delaySec?: number
    carrier?: CallForwardingCarrier
}) {
    const workspaceId = await getWorkspaceId()

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            id: true,
            name: true,
            settings: true,
            twilioPhoneNumber: true,
            twilioSubaccountId: true,
            twilioSubaccountAuthToken: true,
            ownerId: true,
        },
    })

    if (!workspace?.twilioPhoneNumber) {
        throw new Error("No provisioned Tracey number found")
    }

    const owner = workspace.ownerId
        ? await db.user.findUnique({
            where: { id: workspace.ownerId },
            select: { phone: true },
        })
        : null

    if (!owner?.phone) {
        throw new Error("Add your personal phone number first")
    }

    const settings = (workspace.settings as Record<string, unknown>) ?? {}
    const mode = input?.mode ?? ((settings.callForwardingMode as "full" | "backup" | "off") || "backup")
    if (mode === "off") {
        throw new Error("Turn call forwarding on before sending setup")
    }
    const delaySec = Math.max(10, Math.min(45, Number(input?.delaySec ?? settings.callForwardingDelaySec ?? 12)))
    const carrier = input?.carrier ?? (settings.callForwardingCarrier as CallForwardingCarrier) ?? "other"

    const client =
        workspace.twilioSubaccountId &&
        workspace.twilioSubaccountAuthToken &&
        twilioMasterClient &&
        workspace.twilioSubaccountId !== process.env.TWILIO_ACCOUNT_SID
            ? getSubaccountClient(workspace.twilioSubaccountId, workspace.twilioSubaccountAuthToken)
            : twilioMasterClient

    if (!client) {
        throw new Error("Twilio SMS client is not configured")
    }

    const messageBody = buildCallForwardingSetupSmsBody({
        businessName: workspace.name,
        agentPhoneNumber: workspace.twilioPhoneNumber,
        mode,
        delaySec,
        carrier,
    })

    await client.messages.create({
        to: owner.phone,
        from: workspace.twilioPhoneNumber,
        body: messageBody,
    })

    await db.workspace.update({
        where: { id: workspace.id },
        data: {
            settings: {
                ...settings,
                callForwardingEnabled: true,
                callForwardingMode: mode,
                callForwardingDelaySec: delaySec,
                callForwardingCarrier: carrier,
                callForwardingSetupSmsSentAt: new Date().toISOString(),
                callForwardingSetupSmsSentTo: owner.phone,
                callForwardingSetupSmsFrom: workspace.twilioPhoneNumber,
            },
        },
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
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
        const generatedEmail = await getOrAllocateLeadCaptureEmail()
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
    let workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            inboundEmailAlias: true,
            inboundEmail: true,
            name: true,
            settings: true,
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
    const legacyAlias = `${firstNameBase}-${businessSlug}`
    let uniqueAlias = businessSlug
    let aliasSuffix = 2

    while (true) {
        const aliasOwner = await db.workspace.findFirst({
            where: {
                inboundEmailAlias: uniqueAlias,
                id: { not: workspaceId },
            },
            select: { id: true },
        })

        if (!aliasOwner) {
            break
        }

        uniqueAlias = `${businessSlug}-${aliasSuffix}`
        aliasSuffix += 1
    }

    if (!workspace.inboundEmailAlias || workspace.inboundEmailAlias !== uniqueAlias || workspace.inboundEmail !== `${uniqueAlias}@${INBOUND_LEAD_DOMAIN}`) {
        const settings = (workspace.settings as Record<string, unknown>) ?? {}
        const existingLegacyAliases = Array.isArray(settings.legacyInboundLeadAliases)
            ? settings.legacyInboundLeadAliases.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : []
        workspace = await db.workspace.update({
            where: { id: workspaceId },
            data: {
                inboundEmailAlias: uniqueAlias,
                inboundEmail: `${uniqueAlias}@${INBOUND_LEAD_DOMAIN}`,
                settings: {
                    ...settings,
                    legacyInboundLeadAliases: Array.from(new Set([...existingLegacyAliases, legacyAlias].filter(Boolean))),
                },
            },
            select: {
                inboundEmailAlias: true,
                inboundEmail: true,
                name: true,
                settings: true,
                users: { select: { id: true, email: true, name: true }, orderBy: { id: "asc" } },
            },
        })
    }
    return `${uniqueAlias}@${INBOUND_LEAD_DOMAIN}`
}
