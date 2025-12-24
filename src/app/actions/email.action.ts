"use server";

import nodemailer from "nodemailer";
import { db } from "@/db/app.db";
import { localUsers, reportRequests } from "@/db/app.schema";
import { eq } from "drizzle-orm";
import { externalAuthPool } from "@/db/external-auth.db";
import type { RowDataPacket } from "mysql2";

// Email Configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("Email not configured, skipping...");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Report Request System" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Get user email from hr_person (external database)
async function getUserEmail(userId: number): Promise<string | null> {
  // First get the externalUsername from localUsers
  const [user] = await db
    .select({ 
      email: localUsers.email,
      externalUsername: localUsers.externalUsername 
    })
    .from(localUsers)
    .where(eq(localUsers.id, userId))
    .limit(1);

  // If user has email set in localUsers, use it
  if (user?.email) {
    return user.email;
  }

  // Otherwise, fetch from hr_person.hr_email
  if (user?.externalUsername) {
    try {
      const [rows] = await externalAuthPool.execute<RowDataPacket[]>(
        `SELECT hr_email FROM hr_person WHERE hr_username = ?`,
        [user.externalUsername]
      );

      if (rows.length > 0 && rows[0].hr_email) {
        return rows[0].hr_email as string;
      }
    } catch (error) {
      console.error("Failed to fetch email from hr_person:", error);
    }
  }

  return null;
}

// Email: Notify user when request status changes
export async function sendStatusChangeEmail(
  requestId: number,
  newStatus: string,
  rejectionReason?: string
) {
  // Get request with owner info
  const [request] = await db
    .select({
      title: reportRequests.title,
      requestedBy: reportRequests.requestedBy,
    })
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (!request?.requestedBy) return;

  const email = await getUserEmail(request.requestedBy);
  if (!email) return;

  const statusLabels: Record<string, string> = {
    pending: "รอดำเนินการ",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
    cancelled: "ยกเลิก",
  };

  const statusLabel = statusLabels[newStatus] || newStatus;
  const requestUrl = `${BASE_URL}/requests/${requestId}`;

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">📋 สถานะคำขอรายงานเปลี่ยนแปลง</h2>
      <hr style="border: 1px solid #eee;">
      <p><strong>หัวข้อ:</strong> ${request.title}</p>
      <p><strong>สถานะใหม่:</strong> <span style="color: ${newStatus === 'completed' ? 'green' : newStatus === 'rejected' ? 'red' : 'blue'};">${statusLabel}</span></p>
      ${rejectionReason ? `<p><strong>เหตุผล:</strong> ${rejectionReason}</p>` : ''}
      <p style="margin-top: 20px;">
        <a href="${requestUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ดูรายละเอียด</a>
      </p>
      <hr style="border: 1px solid #eee; margin-top: 30px;">
      <p style="color: #666; font-size: 12px;">ส่งจาก: ระบบขอรายงาน (Report Request System)</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `[Report Request] สถานะคำขอ "${request.title}" เปลี่ยนเป็น ${statusLabel}`,
    html,
  });
}

// Email: Notify user when there's a new comment
export async function sendNewCommentEmail(
  requestId: number,
  commenterName: string
) {
  // Get request with owner info
  const [request] = await db
    .select({
      title: reportRequests.title,
      requestedBy: reportRequests.requestedBy,
    })
    .from(reportRequests)
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (!request?.requestedBy) return;

  const email = await getUserEmail(request.requestedBy);
  if (!email) return;

  const requestUrl = `${BASE_URL}/requests/${requestId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">💬 มีความคิดเห็นใหม่</h2>
      <hr style="border: 1px solid #eee;">
      <p><strong>หัวข้อ:</strong> ${request.title}</p>
      <p><strong>จาก:</strong> ${commenterName}</p>
      <p style="margin-top: 20px;">
        <a href="${requestUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ดูความคิดเห็น</a>
      </p>
      <hr style="border: 1px solid #eee; margin-top: 30px;">
      <p style="color: #666; font-size: 12px;">ส่งจาก: ระบบขอรายงาน (Report Request System)</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `[Report Request] มีความคิดเห็นใหม่ในคำขอ "${request.title}"`,
    html,
  });
}

// Email: Notify admins when there's a new request
export async function sendNewRequestEmailToAdmins(
  requestId: number,
  requesterName: string,
  title: string,
  priority: string
) {
  // Get all admin users with email
  const admins = await db
    .select({ email: localUsers.email })
    .from(localUsers)
    .where(eq(localUsers.role, "ADMIN"));

  const adminEmails = admins.filter((a) => a.email).map((a) => a.email!);
  if (adminEmails.length === 0) return;

  const priorityLabels: Record<string, string> = {
    low: "ต่ำ",
    medium: "ปกติ",
    high: "สูง",
    urgent: "🔴 เร่งด่วน",
  };

  const requestUrl = `${BASE_URL}/requests/${requestId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">📢 มีคำขอรายงานใหม่!</h2>
      <hr style="border: 1px solid #eee;">
      <p><strong>หัวข้อ:</strong> ${title}</p>
      <p><strong>ผู้ขอ:</strong> ${requesterName}</p>
      <p><strong>ความเร่งด่วน:</strong> ${priorityLabels[priority] || priority}</p>
      <p style="margin-top: 20px;">
        <a href="${requestUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ดูรายละเอียด</a>
      </p>
      <hr style="border: 1px solid #eee; margin-top: 30px;">
      <p style="color: #666; font-size: 12px;">ส่งจาก: ระบบขอรายงาน (Report Request System)</p>
    </div>
  `;

  // Send to all admins
  for (const email of adminEmails) {
    await sendEmail({
      to: email,
      subject: `[Report Request] คำขอใหม่: ${title}`,
      html,
    });
  }
}
