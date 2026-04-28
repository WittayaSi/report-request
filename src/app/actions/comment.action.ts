"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/app.db";
import { comments, reportRequests } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { logAudit } from "./audit.action";

const commentSchema = z.object({
  content: z.string().min(1, "กรุณาระบุข้อความ"),
});

export async function addComment(requestId: number, content: string) {
  try {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Rate limit
  const { commentLimiter } = await import("@/lib/rate-limit");
  const rateCheck = commentLimiter(session.user.id);
  if (!rateCheck.success) {
    return { error: "ส่ง comment เร็วเกินไป กรุณารอสักครู่" };
  }

  const userId = parseInt(session.user.id, 10);
  const validatedFields = commentSchema.safeParse({ content });

  if (!validatedFields.success) {
    return { error: "ข้อมูลไม่ถูกต้อง" };
  }

  // Verify request exists
  const request = await db
    .select()
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (request.length === 0) {
    return { error: "ไม่พบคำขอ" };
  }

  // Block comments if request has been rated
  const { satisfactionRatings } = await import("@/db/app.schema");
  const [rating] = await db
    .select({ id: satisfactionRatings.id })
    .from(satisfactionRatings)
    .where(eq(satisfactionRatings.requestId, requestId))
    .limit(1);
  if (rating) {
    return { error: "ไม่สามารถ comment ได้ เนื่องจากคำขอนี้ถูกประเมินแล้ว" };
  }

  // Insert comment
  await db.insert(comments).values({
    requestId: requestId,
    authorId: userId,
    content: validatedFields.data.content,
  });

  // Log Audit
  await logAudit({
    userId,
    action: "ADD_COMMENT",
    resourceType: "COMMENT",
    resourceId: requestId.toString(),
    details: {
      requestId: requestId,
      contentLength: validatedFields.data.content.length,
    },
  });

  // Send Telegram notification to request owner (if not self-commenting)
  const { notifyNewComment } = await import("./telegram.action");
  await notifyNewComment(requestId, userId, session.user.name || "Unknown");

  // Send Email notification to request owner
  const { sendNewCommentEmail } = await import("./email.action");
  await sendNewCommentEmail(requestId, session.user.name || "Unknown");

  // Create in-app notification for request owner (if not self-commenting)
  const reqData = request[0];
  if (reqData.requestedBy !== userId) {
    const { createInAppNotification } = await import("./notification.action");
    await createInAppNotification({
      userId: reqData.requestedBy,
      title: `ความคิดเห็นใหม่จาก ${session.user.name || "Unknown"}`,
      message: reqData.title,
      link: `/requests/${requestId}`,
    });
  }

  // Create in-app notification for all admins
  const { notifyAllAdmins } = await import("./notification.action");
  await notifyAllAdmins({
    title: `💬 ความคิดเห็นใหม่`,
    message: `${reqData.title} — โดย ${session.user.name || "Unknown"}`,
    link: `/requests/${requestId}`,
    excludeUserId: userId, // Don't notify the commenter themselves
  });

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { success: true };
  } catch (error) {
    console.error("[addComment Error]", error);
    return { error: "เกิดข้อผิดพลาดในการส่ง comment" };
  }
}
