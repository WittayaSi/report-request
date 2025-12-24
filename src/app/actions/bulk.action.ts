"use server";

import { db } from "@/db/app.db";
import { reportRequests } from "@/db/app.schema";
import { auth } from "@/auth";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit.action";

export async function bulkUpdateStatus(
  requestIds: number[],
  newStatus: "pending" | "in_progress" | "completed" | "rejected" | "cancelled"
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  await db
    .update(reportRequests)
    .set({ status: newStatus })
    .where(inArray(reportRequests.id, requestIds));

  // Log audit for each request
  for (const requestId of requestIds) {
    await logAudit({
      userId,
      action: "UPDATE_STATUS",
      resourceType: "REQUEST",
      resourceId: requestId.toString(),
      details: { newStatus, bulkAction: true },
    });
  }

  revalidatePath("/admin/requests");
  revalidatePath("/dashboard");

  return { success: true, count: requestIds.length };
}
