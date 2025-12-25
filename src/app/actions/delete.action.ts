"use server";

import { db } from "@/db/app.db";
import { reportRequests, attachments, comments, requestViews } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit.action";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function deleteRequest(requestId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  // Get request to verify ownership and status
  const [request] = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      status: reportRequests.status,
      requestedBy: reportRequests.requestedBy,
    })
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (!request) {
    return { error: "ไม่พบคำขอ" };
  }

  // Check if user is owner
  if (request.requestedBy !== userId) {
    return { error: "คุณไม่ใช่เจ้าของคำขอนี้" };
  }

  // Check if status is pending
  if (request.status !== "pending") {
    return { error: "สามารถลบได้เฉพาะคำขอที่สถานะ 'รอดำเนินการ' เท่านั้น" };
  }

  try {
    // Get all attachments to delete files
    const requestAttachments = await db
      .select({ storedFilename: attachments.storedFilename })
      .from(attachments)
      .where(eq(attachments.requestId, requestId));

    // Delete physical files
    for (const att of requestAttachments) {
      const filePath = join(UPLOAD_DIR, att.storedFilename);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    // Delete related records in order
    await db.delete(attachments).where(eq(attachments.requestId, requestId));
    await db.delete(comments).where(eq(comments.requestId, requestId));
    await db.delete(requestViews).where(eq(requestViews.requestId, requestId));

    // Delete the request
    await db.delete(reportRequests).where(eq(reportRequests.id, requestId));

    // Log audit
    await logAudit({
      userId,
      action: "DELETE_REQUEST",
      resourceType: "REQUEST",
      resourceId: requestId.toString(),
      details: { title: request.title },
    });

    revalidatePath("/requests");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error deleting request:", error);
    return { error: "เกิดข้อผิดพลาดในการลบคำขอ" };
  }
}
