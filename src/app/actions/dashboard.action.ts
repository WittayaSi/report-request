"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/app.db";
import { reportRequests } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { sendTelegramNotification } from "@/lib/notifications";
import { logAudit } from "./audit.action";

// Validation Schema
const requestSchema = z.object({
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

// Helper: Get user ID from session
async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return parseInt(session.user.id, 10);
}

// Priority labels for notification
const priorityLabels: Record<string, string> = {
  low: "ต่ำ",
  medium: "ปกติ",
  high: "สูง",
  urgent: "🔴 เร่งด่วน",
};

// Output type labels
const outputTypeLabels: Record<string, string> = {
  file: "ไฟล์",
  hosxp_report: "รายงาน HOSxP",
  dashboard: "Dashboard",
  other: "อื่นๆ",
};

// Create
export async function createReportRequest(formData: FormData) {
  try {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Unauthorized" };

  const session = await auth();
  
  // Parse form data
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = requestSchema.safeParse(rawData);
  
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const data = validatedFields.data;

  // Calculate SLA Deadline
  const slaDeadline = new Date();
  const priorityHours = {
    urgent: 6,
    high: 24, // 1 days
    medium: 48, // 2 days
    low: 72, // 3 days
  };
  slaDeadline.setHours(slaDeadline.getHours() + (priorityHours[data.priority] || 72));

  await db.insert(reportRequests).values({
    title: data.title,
    description: data.description || null,
    outputType: data.outputType,
    fileFormat: data.outputType === "file" ? (data.fileFormat || "excel") : null,
    dateRangeType: data.dateRangeType,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    fiscalYearStart: data.fiscalYearStart || null,
    fiscalYearEnd: data.fiscalYearEnd || null,
    priority: data.priority,
    sourceSystem: data.sourceSystem,
    expectedDeadline: data.expectedDeadline ? new Date(data.expectedDeadline) : null,
    slaDeadline: slaDeadline,
    dataSource: data.dataSource || null,
    additionalNotes: data.additionalNotes || null,
    requestedBy: userId,
  });

  // Log Audit
  await logAudit({
    userId,
    action: "CREATE_REQUEST",
    resourceType: "REQUEST",
    resourceId: data.title, // Use title as ID reference initially or fetch inserted ID if possible (but insert doesn't return ID easily in all drivers without returning)
    details: {
      title: data.title,
      priority: data.priority,
      outputType: data.outputType,
    },
  });

  // Build notification message
  let message = `📢 *มีคำขอรายงานใหม่!*\n`;
  message += `-------------------------\n`;
  message += `*หัวข้อ:* ${data.title}\n`;
  message += `*ผู้ขอ:* ${session?.user?.name}\n`;
  message += `*ประเภท:* ${outputTypeLabels[data.outputType]}\n`;
  message += `*ความเร่งด่วน:* ${priorityLabels[data.priority]}\n`;
  
  if (data.dateRangeType === "fiscal_year" && data.fiscalYearStart) {
    message += `*ปีงบ:* ${data.fiscalYearStart}`;
    if (data.fiscalYearEnd) message += ` - ${data.fiscalYearEnd}`;
    message += `\n`;
  }
  
  if (data.expectedDeadline) {
    message += `*กำหนดส่ง:* ${data.expectedDeadline}\n`;
  }
  
  message += `*Link:* ${process.env.NEXT_PUBLIC_BASE_URL}/admin/requests`;
  
  await sendTelegramNotification(message);

  // Create in-app notification for all admins
  const { notifyAllAdmins } = await import("./notification.action");
  await notifyAllAdmins({
    title: `📢 คำขอรายงานใหม่`,
    message: `${data.title} — โดย ${session?.user?.name}`,
    link: "/admin/requests",
    excludeUserId: userId, // Don't notify if the creator is also an admin
  });

  revalidatePath("/dashboard");
  revalidatePath("/requests");
  return { success: true };
  } catch (error) {
    console.error("[createReportRequest Error]", error);
    return { error: "เกิดข้อผิดพลาดในการสร้างคำขอ" };
  }
}

// Update Status (Admin only)
export async function updateReportStatus(
  requestId: number,
  newStatus: "pending" | "in_progress" | "completed" | "rejected" | "cancelled",
  rejectionReason?: string
) {
  try {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

  const userId = parseInt(session.user.id, 10);

  // Get current request info before update
  const [currentRequest] = await db
    .select({
      requestedBy: reportRequests.requestedBy,
      title: reportRequests.title,
      assignedTo: reportRequests.assignedTo,
    })
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  // Auto-assign: when changing to in_progress and not yet assigned, assign to current admin
  const shouldAutoAssign =
    newStatus === "in_progress" && (!currentRequest?.assignedTo || currentRequest.assignedTo === null);

  await db
    .update(reportRequests)
    .set({
      status: newStatus,
      rejectionReason: newStatus === "rejected" ? rejectionReason : null,
      ...(shouldAutoAssign ? { assignedTo: userId } : {}),
    })
    .where(eq(reportRequests.id, requestId));

  // Log Audit
  await logAudit({
    userId,
    action: "UPDATE_STATUS",
    resourceType: "REQUEST",
    resourceId: requestId.toString(),
    details: {
      newStatus,
      rejectionReason: newStatus === "rejected" ? rejectionReason : undefined,
      autoAssigned: shouldAutoAssign ? userId : undefined,
    },
  });

  // Send Telegram notification to request owner
  const { notifyStatusChange } = await import("./telegram.action");
  await notifyStatusChange(requestId, newStatus, rejectionReason);

  // Send Email notification to request owner
  const { sendStatusChangeEmail } = await import("./email.action");
  await sendStatusChangeEmail(requestId, newStatus, rejectionReason);

  // Create in-app notification for request owner
  if (currentRequest) {
    const statusLabels: Record<string, string> = {
      pending: "รอดำเนินการ",
      in_progress: "กำลังดำเนินการ",
      completed: "เสร็จสิ้น",
      rejected: "ปฏิเสธ",
      cancelled: "ยกเลิก",
    };
    const { createInAppNotification } = await import("./notification.action");
    await createInAppNotification({
      userId: currentRequest.requestedBy,
      title: `สถานะเปลี่ยนเป็น "${statusLabels[newStatus] || newStatus}"`,
      message: currentRequest.title,
      link: `/requests/${requestId}`,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/requests");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
  } catch (error) {
    console.error("[updateReportStatus Error]", error);
    return { error: "เกิดข้อผิดพลาดในการอัพเดทสถานะ" };
  }
}

// Cancel (User only - can only cancel own pending requests)
export async function cancelReportRequest(requestId: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Unauthorized" };

  // Get request and verify ownership
  const requests = await db
    .select()
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  const request = requests[0];
  if (!request) {
    return { error: "ไม่พบคำขอนี้" };
  }

  if (request.requestedBy !== userId) {
    return { error: "คุณไม่มีสิทธิ์ยกเลิกคำขอนี้" };
  }

  if (request.status !== "pending") {
    return { error: "ไม่สามารถยกเลิกคำขอที่ดำเนินการแล้ว" };
  }

  await db
    .update(reportRequests)
    .set({ status: "cancelled" })
    .where(eq(reportRequests.id, requestId));

  // Log Audit
  await logAudit({
    userId,
    action: "CANCEL_REQUEST",
    resourceType: "REQUEST",
    resourceId: requestId.toString(),
    details: {
      previousStatus: request.status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/requests");
  return { success: true };
}


// Get Requests with Unread Status — supports pagination, filter, and sort
export async function getRequests(
  filter: {
    status?: string;
    userId?: number;
    limit?: number;
    page?: number;
    pageSize?: number;
    query?: string;
    sortBy?: "date" | "priority";
    sortOrder?: "asc" | "desc";
  } = {}
) {
  const session = await auth();
  if (!session?.user?.id) return { data: [], totalCount: 0, totalPages: 0, currentPage: 1 };

  const currentUserId = parseInt(session.user.id, 10);
  const { db } = await import("@/db/app.db");
  const { reportRequests, localUsers, comments, requestViews } = await import(
    "@/db/app.schema"
  );
  const { eq, desc, asc, and, sql, like, count: countFn } = await import("drizzle-orm");

  // Build conditions
  const conditions = [eq(reportRequests.isDeleted, false)];
  if (filter.status && filter.status !== "all") {
    conditions.push(eq(reportRequests.status, filter.status as any));
  }
  if (filter.userId) {
    conditions.push(eq(reportRequests.requestedBy, filter.userId));
  }
  if (filter.query) {
    const escapedQuery = filter.query.replace(/[%_\\]/g, '\\$&');
    conditions.push(like(reportRequests.title, `%${escapedQuery}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const [totalResult] = await db
    .select({ count: countFn() })
    .from(reportRequests)
    .where(whereClause);
  const totalCount = totalResult?.count || 0;

  // Pagination
  const page = filter.page || 1;
  const pageSize = filter.limit || filter.pageSize || 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  // Sort
  let orderByClause;
  if (filter.sortBy === "priority") {
    orderByClause = filter.sortOrder === "asc"
      ? [sql`CASE 
          WHEN ${reportRequests.priority} = 'low' THEN 1
          WHEN ${reportRequests.priority} = 'medium' THEN 2
          WHEN ${reportRequests.priority} = 'high' THEN 3
          WHEN ${reportRequests.priority} = 'urgent' THEN 4
          ELSE 0 END ASC`, desc(reportRequests.createdAt)]
      : [sql`CASE 
          WHEN ${reportRequests.priority} = 'urgent' THEN 4
          WHEN ${reportRequests.priority} = 'high' THEN 3
          WHEN ${reportRequests.priority} = 'medium' THEN 2
          WHEN ${reportRequests.priority} = 'low' THEN 1
          ELSE 0 END DESC`, desc(reportRequests.createdAt)];
  } else {
    orderByClause = filter.sortOrder === "asc"
      ? [asc(reportRequests.createdAt)]
      : [desc(reportRequests.createdAt)];
  }

  const data = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      description: reportRequests.description,
      status: reportRequests.status,
      priority: reportRequests.priority,
      slaDeadline: reportRequests.slaDeadline,
      createdAt: reportRequests.createdAt,
      requestedBy: reportRequests.requestedBy,
      userName: localUsers.name,
      userDepartment: localUsers.department,
      lastViewedAt: requestViews.viewedAt,
      hasUnreadComments: sql<number>`(
        SELECT COUNT(*) FROM comments c
        WHERE c.request_id = ${reportRequests.id}
        AND c.author_id != ${currentUserId}
        AND (c.created_at > COALESCE(${requestViews.viewedAt}, '1970-01-01'))
      )`,
      attachmentCount: sql<number>`(
        SELECT COUNT(*) FROM attachments a
        WHERE a.request_id = ${reportRequests.id}
        AND a.attachment_type != 'result'
      )`,
      hasResultFile: sql<number>`(
        SELECT COUNT(*) FROM attachments a
        WHERE a.request_id = ${reportRequests.id}
        AND a.attachment_type = 'result'
      )`,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .leftJoin(
      requestViews,
      and(
        eq(requestViews.requestId, reportRequests.id),
        eq(requestViews.userId, currentUserId)
      )
    )
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(pageSize)
    .offset(offset);

  return { data, totalCount, totalPages, currentPage: page };
}

