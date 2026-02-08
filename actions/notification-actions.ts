"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface NotificationView {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  read: boolean;
  link: string | null;
  createdAt: Date;
}

/**
 * Get unread notifications for a user.
 */
export async function getNotifications(userId: string): Promise<NotificationView[]> {
  const notifications = await db.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt,
  }));
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Create a notification (Internal use).
 */
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  link?: string;
}) {
  await db.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      link: data.link,
    },
  });
  return { success: true };
}
