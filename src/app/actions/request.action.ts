"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/app.db";
import { reportRequests } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { logAudit } from "./audit.action";

// Validation Schema
const updateRequestSchema = z.object({
  title: z.string().min(3, "หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร"),
  description: z.string().optional(),
  outputType: z.enum(["file", "hosxp_report", "dashboard", "other"]).default("file"),
  fileFormat: z.enum(["excel", "pdf", "csv", "word"]).optional(),
  dateRangeType: z.enum(["specific", "fiscal_year", "custom"]).default("specific"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fiscalYearStart: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  sourceSystem: z.enum(["hosxp", "hosoffice", "php", "other"]).default("hosxp"),
  expectedDeadline: z.string().optional(),
  dataSource: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export async function updateReportRequest(requestId: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  // Verify ownership and pending status
  const existing = await db
    .select()
    .from(reportRequests)
    .where(
      and(
        eq(reportRequests.id, requestId),
        eq(reportRequests.requestedBy, userId),
        eq(reportRequests.status, "pending")
      )
    )
    .limit(1);

  if (existing.length === 0) {
    return { error: "ไม่สามารถแก้ไขได้ (อาจถูกดำเนินการแล้ว หรือไม่ใช่เจ้าของ)" };
  }

  // Parse and validate form data
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = updateRequestSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const data = validatedFields.data;

  await db
    .update(reportRequests)
    .set({
      title: data.title,
      description: data.description || null,
      outputType: data.outputType,
      fileFormat: data.outputType === "file" ? data.fileFormat : null,
      dateRangeType: data.dateRangeType,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      fiscalYearStart: data.fiscalYearStart || null,
      fiscalYearEnd: data.fiscalYearEnd || null,
      priority: data.priority,
      sourceSystem: data.sourceSystem,
      expectedDeadline: data.expectedDeadline ? new Date(data.expectedDeadline) : null,
      dataSource: data.dataSource || null,
      additionalNotes: data.additionalNotes || null,
    })
    .where(eq(reportRequests.id, requestId));

  // Log Audit
  await logAudit({
    userId,
    action: "UPDATE_REQUEST",
    resourceType: "REQUEST",
    resourceId: requestId.toString(),
    details: {
      requestId: requestId,
      updatedFields: Object.keys(data),
    },
  });

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}
