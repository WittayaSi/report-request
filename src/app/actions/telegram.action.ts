"use server";

import { db } from "@/db/app.db";
import { localUsers, notificationLog, reportRequests } from "@/db/app.schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Admin bot settings from env (for admin group notifications)
const ADMIN_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BASE_URL = process.env.NEXTAUTH_URL || "http://127.0.0.1:3000";

// =====================
// Core Telegram Functions
// =====================

// Send message using specific bot token and chat ID
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  if (!botToken || !chatId) {
    console.error("Missing bot token or chat ID");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API error:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

// =====================
// Notification Functions
// =====================

// Status labels for Thai
const statusLabels: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  rejected: "ปฏิเสธ",
  cancelled: "ยกเลิก",
};

// Helper to escape HTML characters
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Notify user when request status changes (using user's own bot)
export async function notifyStatusChange(
  requestId: number,
  newStatus: string,
  rejectionReason?: string
) {
  // Get request with owner info including their bot token
  const [request] = await db
    .select({
      title: reportRequests.title,
      ownerId: reportRequests.requestedBy,
      ownerName: localUsers.name,
      telegramBotToken: localUsers.telegramBotToken,
      telegramChatId: localUsers.telegramChatId,
      telegramEnabled: localUsers.telegramNotificationsEnabled,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (!request || !request.telegramBotToken || !request.telegramChatId || request.telegramEnabled !== "true") {
    return; // No notification needed
  }

  const statusText = statusLabels[newStatus] || newStatus;
  const url = `${BASE_URL}/requests/${requestId}`;
  
  let message = `📋 <b>สถานะคำขอเปลี่ยนแปลง</b>\n\n`;
  message += `หัวข้อ: ${escapeHtml(request.title)}\n`;
  message += `สถานะใหม่: <b>${escapeHtml(statusText)}</b>\n`;
  
  if (newStatus === "rejected" && rejectionReason) {
    message += `\n❌ เหตุผล: ${escapeHtml(rejectionReason)}\n`;
  }
  
  message += `\n\n🔗 ${url}`;
  message += `\n\n<i style="color: #888888; font-size: 12px;">ส่งจาก: ระบบขอรายงาน</i>`;

  const success = await sendTelegramMessage(request.telegramBotToken, request.telegramChatId, message);

  // Log notification
  await db.insert(notificationLog).values({
    userId: request.ownerId,
    requestId,
    notificationType: "status_change",
    message,
    status: success ? "sent" : "failed",
    sentAt: success ? new Date() : null,
  });
}

// Notify request owner when there's a new comment (using user's own bot)
export async function notifyNewComment(
  requestId: number,
  commenterId: number,
  commenterName: string
) {
  // Get request with owner info including their bot token
  const [request] = await db
    .select({
      title: reportRequests.title,
      ownerId: reportRequests.requestedBy,
      telegramBotToken: localUsers.telegramBotToken,
      telegramChatId: localUsers.telegramChatId,
      telegramEnabled: localUsers.telegramNotificationsEnabled,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  // Don't notify if commenter is the owner
  if (!request || request.ownerId === commenterId) {
    return;
  }

  if (!request.telegramBotToken || !request.telegramChatId || request.telegramEnabled !== "true") {
    return; // No notification needed
  }

  const url = `${BASE_URL}/requests/${requestId}`;

  let message = `💬 <b>ความคิดเห็นใหม่</b>\n\n` +
    `หัวข้อ: ${escapeHtml(request.title)}\n` +
    `โดย: ${escapeHtml(commenterName)}\n\n` +
    `\n\n🔗 ${url}`;
  message += `\n\n<i style="color: #888888; font-size: 12px;">ส่งจาก: ระบบขอรายงาน</i>`;

  const success = await sendTelegramMessage(request.telegramBotToken, request.telegramChatId, message);

  // Log notification
  await db.insert(notificationLog).values({
    userId: request.ownerId,
    requestId,
    notificationType: "new_comment",
    message,
    status: success ? "sent" : "failed",
    sentAt: success ? new Date() : null,
  });
}

// Notify admin group when a new request is created (using admin's bot from env)
export async function notifyAdminsNewRequest(
  requestId: number,
  requestTitle: string,
  requesterName: string,
  priority: string
) {
  // Use admin bot from environment for admin group notification
  if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error("Admin bot token or chat ID not configured");
    return;
  }

  const priorityLabels: Record<string, string> = {
    low: "ต่ำ",
    medium: "ปกติ",
    high: "สูง",
    urgent: "🔴 เร่งด่วน",
  };

  const priorityText = priorityLabels[priority] || priority;
  const url = `${BASE_URL}/admin/requests`;
  
  let message = `📝 <b>คำขอรายงานใหม่</b>\n\n` +
    `หัวข้อ: ${escapeHtml(requestTitle)}\n` +
    `จาก: ${escapeHtml(requesterName)}\n` +
    `ความสำคัญ: ${escapeHtml(priorityText)}\n\n` +
    `\n\n🔗 ${url}`;
  message += `\n\n<i style="color: #888888; font-size: 12px;">ส่งจาก: ระบบขอรายงาน</i>`;

  const success = await sendTelegramMessage(ADMIN_BOT_TOKEN, ADMIN_CHAT_ID, message);

  // Log notification (use first admin ID or 0)
  await db.insert(notificationLog).values({
    userId: 1, // Admin ID placeholder
    requestId,
    notificationType: "new_request",
    message,
    status: success ? "sent" : "failed",
    sentAt: success ? new Date() : null,
  });
}

// =====================
// User Settings Functions
// =====================

export async function updateTelegramSettings(
  botToken: string | null,
  chatId: string | null,
  enabled: boolean
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  try {
    await db
      .update(localUsers)
      .set({
        telegramBotToken: botToken,
        telegramChatId: chatId,
        telegramNotificationsEnabled: enabled ? "true" : "false",
      })
      .where(eq(localUsers.id, userId));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating Telegram settings:", error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า" };
  }
}

export async function getTelegramSettings() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = parseInt(session.user.id, 10);

  const [user] = await db
    .select({
      telegramBotToken: localUsers.telegramBotToken,
      telegramChatId: localUsers.telegramChatId,
      telegramNotificationsEnabled: localUsers.telegramNotificationsEnabled,
    })
    .from(localUsers)
    .where(eq(localUsers.id, userId))
    .limit(1);

  return user || null;
}

// Test sending a message to verify user's bot token and chat ID
export async function testTelegramConnection(botToken: string, chatId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!botToken || !chatId) {
    return { error: "กรุณากรอก Bot Token และ Chat ID" };
  }

  const message = `✅ <b>ทดสอบการเชื่อมต่อสำเร็จ!</b>\n\n` +
    `บัญชี: ${session.user.name}\n` +
    `ระบบจะส่งการแจ้งเตือนมาที่นี่`;

  const success = await sendTelegramMessage(botToken, chatId, message);

  if (success) {
    return { success: true };
  } else {
    return { error: "ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบ Bot Token และ Chat ID" };
  }
}
