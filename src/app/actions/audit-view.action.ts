"use server";

import { db } from "@/db/app.db";
import { auditLogs, localUsers } from "@/db/app.schema";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";

export async function getAuditLogs(page = 1, limit = 20) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const offset = (page - 1) * limit;

  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      userName: localUsers.name,
      userRole: localUsers.role,
    })
    .from(auditLogs)
    .leftJoin(localUsers, eq(auditLogs.userId, localUsers.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs);

  return {
    data: logs,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}
