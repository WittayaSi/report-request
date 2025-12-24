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
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
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

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { success: true };
}
