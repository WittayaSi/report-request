"use server";

import { db } from "@/db/app.db";
import { inAppNotifications } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, and, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Get unread notification count for the current user
export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const userId = parseInt(session.user.id, 10);

  const [result] = await db
    .select({ count: count() })
    .from(inAppNotifications)
    .where(
      and(
        eq(inAppNotifications.userId, userId),
        eq(inAppNotifications.isRead, "false")
      )
    );

  return result?.count || 0;
}

// Get notifications for the current user
export async function getNotifications(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = parseInt(session.user.id, 10);

  const notifications = await db
    .select()
    .from(inAppNotifications)
    .where(eq(inAppNotifications.userId, userId))
    .orderBy(desc(inAppNotifications.createdAt))
    .limit(limit);

  return notifications;
}

// Mark a notification as read
export async function markNotificationAsRead(notificationId: number) {
  const session = await auth();
  if (!session?.user?.id) return;

  const userId = parseInt(session.user.id, 10);

  await db
    .update(inAppNotifications)
    .set({ isRead: "true" })
    .where(
      and(
        eq(inAppNotifications.id, notificationId),
        eq(inAppNotifications.userId, userId)
      )
    );

  revalidatePath("/");
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  const userId = parseInt(session.user.id, 10);

  await db
    .update(inAppNotifications)
    .set({ isRead: "true" })
    .where(
      and(
        eq(inAppNotifications.userId, userId),
        eq(inAppNotifications.isRead, "false")
      )
    );

  revalidatePath("/");
}

// Create an in-app notification (called from other actions)
export async function createInAppNotification({
  userId,
  title,
  message,
  link,
}: {
  userId: number;
  title: string;
  message: string;
  link?: string;
}) {
  await db.insert(inAppNotifications).values({
    userId,
    title,
    message,
    link: link || null,
  });
}

// Notify ALL admins (except excludeUserId) — used when user creates request or comments
export async function notifyAllAdmins({
  title,
  message,
  link,
  excludeUserId,
}: {
  title: string;
  message: string;
  link?: string;
  excludeUserId?: number;
}) {
  const { localUsers } = await import("@/db/app.schema");

  const admins = await db
    .select({ id: localUsers.id })
    .from(localUsers)
    .where(eq(localUsers.role, "ADMIN"));

  for (const admin of admins) {
    // Skip the excluded user (e.g., the commenter themselves if they are admin)
    if (excludeUserId && admin.id === excludeUserId) continue;

    await db.insert(inAppNotifications).values({
      userId: admin.id,
      title,
      message,
      link: link || null,
    });
  }
}
