import { db } from "@/db/app.db";
import { localUsers } from "@/db/app.schema";
import { eq } from "drizzle-orm";
import type { ExternalUser } from "./verify-external-user";

// Type for local user
export type LocalUser = typeof localUsers.$inferSelect;

/**
 * Get or Create local user from external user data
 * ถ้ายังไม่มี user ใน local DB จะสร้างใหม่ (default role = USER)
 * ถ้ามีแล้วจะ update name และ department
 */
export async function getOrCreateLocalUser(
  externalUser: ExternalUser
): Promise<LocalUser> {
  // หา user ที่มีอยู่
  const existingUsers = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.externalUsername, externalUser.hr_username))
    .limit(1);

  if (existingUsers.length > 0) {
    const user = existingUsers[0];

    // Update name, department, email, and Telegram info จาก external
    await db
      .update(localUsers)
      .set({
        name: `${externalUser.hr_fname} ${externalUser.hr_lname}`.trim(),
        department: externalUser.department_name,
        email: externalUser.hr_email || user.email, // Keep existing if no hr_email
        telegramBotToken: externalUser.telegram_bot_token,
        telegramChatId: externalUser.telegram_chat_id,
      })
      .where(eq(localUsers.id, user.id));

    return {
      ...user,
      name: `${externalUser.hr_fname} ${externalUser.hr_lname}`.trim(),
      department: externalUser.department_name,
      email: externalUser.hr_email || user.email,
      telegramBotToken: externalUser.telegram_bot_token,
      telegramChatId: externalUser.telegram_chat_id,
    };
  }

  // สร้าง user ใหม่
  await db.insert(localUsers).values({
    externalUsername: externalUser.hr_username,
    name: `${externalUser.hr_fname} ${externalUser.hr_lname}`.trim(),
    department: externalUser.department_name,
    email: externalUser.hr_email,
    role: "USER", // default role
    telegramBotToken: externalUser.telegram_bot_token,
    telegramChatId: externalUser.telegram_chat_id,
    telegramNotificationsEnabled: "true",
  });

  // Fetch the newly created user
  const newUsers = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.externalUsername, externalUser.hr_username))
    .limit(1);

  return newUsers[0];
}

/**
 * Get local user by ID
 */
export async function getLocalUserById(
  id: number
): Promise<LocalUser | null> {
  const users = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.id, id))
    .limit(1);

  return users.length > 0 ? users[0] : null;
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: number,
  role: "ADMIN" | "USER"
): Promise<void> {
  await db.update(localUsers).set({ role }).where(eq(localUsers.id, userId));
}
