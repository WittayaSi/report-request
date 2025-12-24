"use server";

import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { localUsers } from "@/db/app.schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUserRoleAction(
  userId: number,
  role: "ADMIN" | "USER"
) {
  const session = await auth();

  // Only ADMIN can change roles
  if (session?.user?.role !== "ADMIN") {
    return { error: "ไม่มีสิทธิ์ในการเปลี่ยน Role" };
  }

  // Prevent changing own role
  if (parseInt(session.user.id, 10) === userId) {
    return { error: "ไม่สามารถเปลี่ยน Role ตัวเองได้" };
  }

  try {
    await db.update(localUsers).set({ role }).where(eq(localUsers.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { error: "ไม่สามารถอัพเดท Role ได้" };
  }
}
