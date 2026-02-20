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
        }
    })

    if (workspace && workspace.callOutFee) {
        return { ...workspace, callOutFee: Number(workspace.callOutFee) }
    }

    return { ...workspace, callOutFee: 0 }
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
}) {
    const authUser = await getAuthUser()
    if (!authUser || !authUser.email) throw new Error("Unauthorized")
    const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
    if (!user) throw new Error("Unauthorized")
    const workspaceId = user.workspaceId

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
        }
    })

    if (workspace && workspace.callOutFee) {
        return { ...workspace, callOutFee: Number(workspace.callOutFee) }
    }

    return workspace ? { ...workspace, callOutFee: 0 } : null
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
