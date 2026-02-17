"use server"

import { db } from "@/lib/db"

export interface KeyAsset {
  id: string
  code: string
  description: string
  status: "AVAILABLE" | "CHECKED_OUT" | "LOST"
  holderId?: string
  holderName?: string
  checkedOutAt?: Date
  location?: string
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all keys for a workspace
 */
export async function getKeys(workspaceId: string): Promise<KeyAsset[]> {
  const keys = await db.key.findMany({
    where: { workspaceId },
    include: {
      holder: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return keys.map(key => ({
    id: key.id,
    code: key.code,
    description: key.description || '',
    status: key.status as KeyAsset['status'],
    holderId: key.holderId || undefined,
    holderName: key.holder?.name,
    checkedOutAt: key.checkedOutAt || undefined,
    location: key.status === 'AVAILABLE' ? 'Office' : key.status === 'CHECKED_OUT' && key.holder?.name 
      ? `With ${key.holder.name}` 
      : 'Unknown',
    workspaceId: key.workspaceId,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt
  }))
}

/**
 * Create a new key
 */
export async function createKey(
  workspaceId: string,
  data: {
    code: string
    description: string
    location?: string
  }
): Promise<{ success: boolean; error?: string; key?: KeyAsset }> {
  try {
    const existingKey = await db.key.findFirst({
      where: { 
        workspaceId,
        code: data.code 
      }
    })

    if (existingKey) {
      return { success: false, error: "Key code already exists" }
    }

    const key = await db.key.create({
      data: {
        code: data.code,
        description: data.description,
        workspaceId,
        status: "AVAILABLE"
      },
      include: {
        holder: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return { 
      success: true, 
      key: {
        id: key.id,
        code: key.code,
        description: key.description || '',
        status: key.status as KeyAsset['status'],
        holderId: key.holderId || undefined,
        holderName: key.holder?.name,
        checkedOutAt: key.checkedOutAt || undefined,
        location: 'Office',
        workspaceId: key.workspaceId,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt
      }
    }
  } catch (error) {
    console.error("Error creating key:", error)
    return { success: false, error: "Failed to create key" }
  }
}

/**
 * Check out a key to a contact
 */
export async function checkoutKey(
  keyId: string,
  holderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const key = await db.key.findUnique({
      where: { id: keyId }
    })

    if (!key) {
      return { success: false, error: "Key not found" }
    }

    if (key.status !== "AVAILABLE") {
      return { success: false, error: "Key is not available" }
    }

    await db.key.update({
      where: { id: keyId },
      data: {
        status: "CHECKED_OUT",
        holderId,
        checkedOutAt: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Error checking out key:", error)
    return { success: false, error: "Failed to check out key" }
  }
}

/**
 * Check in a key
 */
export async function checkinKey(keyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const key = await db.key.findUnique({
      where: { id: keyId }
    })

    if (!key) {
      return { success: false, error: "Key not found" }
    }

    await db.key.update({
      where: { id: keyId },
      data: {
        status: "AVAILABLE",
        holderId: null,
        checkedOutAt: null
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Error checking in key:", error)
    return { success: false, error: "Failed to check in key" }
  }
}

/**
 * Mark key as lost
 */
export async function markKeyLost(keyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.key.update({
      where: { id: keyId },
      data: {
        status: "LOST",
        holderId: null,
        checkedOutAt: null
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Error marking key as lost:", error)
    return { success: false, error: "Failed to mark key as lost" }
  }
}

/**
 * Mark key as found
 */
export async function markKeyFound(keyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.key.update({
      where: { id: keyId },
      data: {
        status: "AVAILABLE",
        holderId: null,
        checkedOutAt: null
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Error marking key as found:", error)
    return { success: false, error: "Failed to mark key as found" }
  }
}
