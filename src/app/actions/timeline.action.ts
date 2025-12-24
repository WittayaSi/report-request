"use server";

import { db } from "@/db/app.db";
import { auditLogs, localUsers } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, desc, and, or } from "drizzle-orm";

export async function getRequestTimeline(requestId: number) {
  const session = await auth();
  if (!session?.user) {
    return [];
  }

  // Get all audit log entries related to this request
  const events = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: localUsers.name,
    })
    .from(auditLogs)
    .leftJoin(localUsers, eq(auditLogs.userId, localUsers.id))
    .where(
      and(
        eq(auditLogs.resourceId, requestId.toString()),
        or(
          eq(auditLogs.resourceType, "REQUEST"),
          eq(auditLogs.resourceType, "ATTACHMENT"),
          eq(auditLogs.resourceType, "COMMENT")
        )
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return events.map((e) => ({
    ...e,
    details: e.details ? JSON.parse(e.details as string) : null,
    createdAt: e.createdAt,
  }));
}
