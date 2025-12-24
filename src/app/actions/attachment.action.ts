"use server";

import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { attachments, localUsers, reportRequests } from "@/db/app.schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";
import { logAudit } from "./audit.action";

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword", // doc
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadAttachment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  const requestId = formData.get("requestId") as string;
  const commentId = formData.get("commentId") as string | null;
  const shouldZip = formData.get("shouldZip") === "true";

  if (!file || !requestId) {
    return { error: "ไม่พบไฟล์หรือ Request ID" };
  }

  const reqId = parseInt(requestId, 10);
  const userId = parseInt(session.user.id, 10);
  const isAdmin = session.user.role === "ADMIN";

  // Get request to check status
  const [request] = await db
    .select({ status: reportRequests.status, requestedBy: reportRequests.requestedBy })
    .from(reportRequests)
    .where(eq(reportRequests.id, reqId))
    .limit(1);

  if (!request) {
    return { error: "ไม่พบคำขอ" };
  }

  // Permission check based on status
  // User: can upload when status is pending or in_progress
  // Admin: can upload when status is completed
  const isOwner = request.requestedBy === userId;
  const userCanUpload = isOwner && (request.status === "pending" || request.status === "in_progress");
  const adminCanUpload = isAdmin && request.status === "completed";

  if (!userCanUpload && !adminCanUpload) {
    if (isAdmin) {
      return { error: "Admin สามารถอัพโหลดได้เมื่อสถานะเป็น 'เสร็จสิ้น' เท่านั้น" };
    } else {
      return { error: "สามารถอัพโหลดได้เมื่อสถานะเป็น 'รอดำเนินการ' หรือ 'กำลังดำเนินการ' เท่านั้น" };
    }
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type) && !shouldZip) { // Allow any type if zipping? No, stick to allowed types for source
    return { error: "ประเภทไฟล์ไม่รองรับ (รองรับ PDF, Excel, Word, CSV, รูปภาพ)" };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" };
  }

  try {
    await ensureUploadDir();

    let finalFilename = file.name;
    let finalStoredFilename = "";
    let finalFileType = file.type;
    let finalFileSize = file.size;

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    
    if (isAdmin && shouldZip) {
      // 1. Get owner's username for password
      const [owner] = await db
        .select({ username: localUsers.externalUsername })
        .from(localUsers)
        .where(eq(localUsers.id, request.requestedBy))
        .limit(1);

      if (!owner || !owner.username) {
        return { error: "ไม่พบ Username ของผู้ขอรายงาน (สำหรับตั้งรหัสผ่าน Zip)" };
      }

      const password = owner.username;
      
      // 2. Save temp file
      const tempFilename = `${uuidv4()}_temp.${ext}`;
      const tempFilePath = join(UPLOAD_DIR, tempFilename);
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(tempFilePath, buffer);

      // 3. Zip with password
      const zipStoredFilename = `${uuidv4()}.zip`;
      const zipFilePath = join(UPLOAD_DIR, zipStoredFilename);
      
      // Dynamic import for node-7z and 7zip-bin
      const sevenBin = (await import("7zip-bin")).default;
      const { add } = await import("node-7z");

      // Fix for Next.js/Webpack path issue where 7za path is incorrect
      let pathTo7za = sevenBin.path7za;
      if (!existsSync(pathTo7za)) {
        // Fallback to local node_modules path
        const localPath = join(process.cwd(), "node_modules", "7zip-bin", "win", "x64", "7za.exe");
        if (existsSync(localPath)) {
          pathTo7za = localPath;
        }
      }

      const myStream = add(zipFilePath, tempFilePath, {
        password: password,
        $bin: pathTo7za,
        recursive: false // Just add the file
      });

      await new Promise((resolve, reject) => {
        myStream.on('end', resolve);
        myStream.on('error', reject);
      });

      // 4. Cleanup temp file
      await unlink(tempFilePath);

      // 5. Update final variables
      finalFilename = `${file.name}.zip`;
      finalStoredFilename = zipStoredFilename;
      finalFileType = "application/zip";
      
      // Get zip file size
      const { stat } = await import("fs/promises");
      const fileStat = await stat(zipFilePath);
      finalFileSize = fileStat.size;

    } else {
      // Normal upload
      finalStoredFilename = `${uuidv4()}.${ext}`;
      const filePath = join(UPLOAD_DIR, finalStoredFilename);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
    }

    // Save to database
    // Admin uploads are "result" (ผลลัพธ์), User uploads are "reference" (ไฟล์ตัวอย่าง/อ้างอิง)
    await db.insert(attachments).values({
      requestId: reqId,
      commentId: commentId ? parseInt(commentId, 10) : null,
      uploaderId: userId,
      attachmentType: isAdmin ? "result" : "reference",
      filename: finalFilename,
      storedFilename: finalStoredFilename,
      fileType: finalFileType,
      fileSize: finalFileSize,
    });

    // Log Audit
    await logAudit({
      userId,
      action: "UPLOAD_FILE",
      resourceType: "ATTACHMENT",
      resourceId: finalStoredFilename,
      details: {
        requestId: reqId,
        filename: finalFilename,
        fileSize: finalFileSize,
        isZip: isAdmin && shouldZip,
      },
    });

    revalidatePath(`/requests/${requestId}`);
    return { success: true };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "เกิดข้อผิดพลาดในการอัพโหลด: " + (error as Error).message };
  }
}

export async function deleteAttachment(attachmentId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = parseInt(session.user.id, 10);

  // Get attachment
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!attachment) {
    return { error: "ไม่พบไฟล์" };
  }

  // Check permission - only owner can delete (admin cannot delete user's files)
  const isOwner = attachment.uploaderId === userId;

  if (!isOwner) {
    return { error: "เฉพาะผู้อัพโหลดเท่านั้นที่สามารถลบไฟล์ได้" };
  }

  try {
    // Delete file from disk
    const filePath = join(UPLOAD_DIR, attachment.storedFilename);
    console.log(`Attempting to delete file at: ${filePath}`);
    
    try {
      await unlink(filePath);
      console.log(`Successfully deleted file: ${filePath}`);
    } catch (fsError) {
      console.warn(`Failed to delete file from disk (might not exist): ${filePath}`, fsError);
      // Continue to delete from DB even if file delete fails (to keep DB clean)
    }

    // Delete from database
    await db.delete(attachments).where(eq(attachments.id, attachmentId));

    // Log Audit
    await logAudit({
      userId,
      action: "DELETE_FILE",
      resourceType: "ATTACHMENT",
      resourceId: attachment.storedFilename,
      details: {
        requestId: attachment.requestId,
        filename: attachment.filename,
        attachmentId: attachmentId,
      },
    });

    revalidatePath(`/requests/${attachment.requestId}`);
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { error: "เกิดข้อผิดพลาดในการลบ: " + (error as Error).message };
  }
}

export async function getAttachments(requestId: number) {
  const attachmentList = await db
    .select({
      id: attachments.id,
      requestId: attachments.requestId,
      commentId: attachments.commentId,
      uploaderId: attachments.uploaderId,
      uploaderName: localUsers.name,
      attachmentType: attachments.attachmentType,
      filename: attachments.filename,
      storedFilename: attachments.storedFilename,
      fileType: attachments.fileType,
      fileSize: attachments.fileSize,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .leftJoin(localUsers, eq(attachments.uploaderId, localUsers.id))
    .where(eq(attachments.requestId, requestId));

  return attachmentList;
}
