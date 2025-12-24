"use server";

import { db } from "@/db/app.db";
import { reportRequests, localUsers } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit.action";

export async function assignRequest(requestId: number, assigneeId: number | null) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  await db
    .update(reportRequests)
    .set({ assignedTo: assigneeId })
    .where(eq(reportRequests.id, requestId));

  // Log audit
  await logAudit({
    userId,
    action: "ASSIGN_REQUEST",
    resourceType: "REQUEST",
    resourceId: requestId.toString(),
    details: { assignedTo: assigneeId },
  });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/admin/requests");
  
  return { success: true };
}

export async function getAdminUsers() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return [];
  }

  const admins = await db
    .select({
      id: localUsers.id,
      name: localUsers.name,
      username: localUsers.externalUsername,
    })
    .from(localUsers)
    .where(eq(localUsers.role, "ADMIN"));

  return admins;
}
