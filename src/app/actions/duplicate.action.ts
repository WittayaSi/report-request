"use server";

import { db } from "@/db/app.db";
import { reportRequests } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit.action";

export async function duplicateRequest(requestId: number) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  // Get original request
  const [original] = await db
    .select()
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (!original) {
    return { error: "Request not found" };
  }

  // Create duplicated request
  const [newRequest] = await db
    .insert(reportRequests)
    .values({
      title: `[สำเนา] ${original.title}`,
      description: original.description,
      outputType: original.outputType,
      fileFormat: original.fileFormat,
      dateRangeType: original.dateRangeType,
      startDate: original.startDate,
      endDate: original.endDate,
      fiscalYearStart: original.fiscalYearStart,
      fiscalYearEnd: original.fiscalYearEnd,
      priority: original.priority,
      expectedDeadline: original.expectedDeadline,
      sourceSystem: original.sourceSystem,
      dataSource: original.dataSource,
      additionalNotes: original.additionalNotes,
      requestedBy: userId,
      status: "pending",
    })
    .$returningId();

  await logAudit({
    userId,
    action: "CREATE_REQUEST",
    resourceType: "REQUEST",
    resourceId: newRequest.id.toString(),
    details: { duplicatedFrom: requestId },
  });

  revalidatePath("/requests");
  revalidatePath("/dashboard");

  return { success: true, newId: newRequest.id };
}
