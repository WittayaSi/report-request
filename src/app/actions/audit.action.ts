"use server";

import { db } from "@/db/app.db";
import { auditLogs } from "@/db/app.schema";
import { headers } from "next/headers";

interface LogAuditParams {
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: string | number;
  details?: any;
}

export async function logAudit({
  userId,
  action,
  resourceType,
  resourceId,
  details,
}: LogAuditParams) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await db.insert(auditLogs).values({
      userId: userId || null,
      action,
      resourceType,
      resourceId: resourceId?.toString(),
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
    // Don't throw error to prevent disrupting main flow
  }
}
