"use server";

import { db } from "@/db/app.db";
import { reportRequests, localUsers } from "@/db/app.schema";
import { eq, sql, desc, and, gte, lte, isNotNull } from "drizzle-orm";
import { auth } from "@/auth";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) return null;

  const stats = await db
    .select({
      status: reportRequests.status,
      count: sql<number>`count(*)`,
    })
    .from(reportRequests)
    .groupBy(reportRequests.status);

  const total = stats.reduce((acc, curr) => acc + curr.count, 0);
  const pending = stats.find((s) => s.status === "pending")?.count || 0;
  const inProgress = stats.find((s) => s.status === "in_progress")?.count || 0;
  const completed = stats.find((s) => s.status === "completed")?.count || 0;
  const rejected = stats.find((s) => s.status === "rejected")?.count || 0;

  return { total, pending, inProgress, completed, rejected };
}

export async function getRequestsByDepartment() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const data = await db
    .select({
      department: localUsers.department,
      count: sql<number>`count(*)`,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .where(isNotNull(localUsers.department))
    .groupBy(localUsers.department)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return data.map((d) => ({
    name: d.department || "Unknown",
    value: d.count,
  }));
}

export async function getRequestsByStatus() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const data = await db
    .select({
      status: reportRequests.status,
      count: sql<number>`count(*)`,
    })
    .from(reportRequests)
    .groupBy(reportRequests.status);

  const statusLabels: Record<string, string> = {
    pending: "รอดำเนินการ",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
    cancelled: "ยกเลิก",
  };

  return data.map((d) => ({
    name: statusLabels[d.status || "pending"],
    value: d.count,
    status: d.status,
  }));
}

export async function getSLARequests() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);

  // Find requests that are pending or in_progress AND (overdue OR due within 3 days)
  const data = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      status: reportRequests.status,
      priority: reportRequests.priority,
      expectedDeadline: reportRequests.expectedDeadline,
      requestedBy: localUsers.name,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .where(
      and(
        isNotNull(reportRequests.expectedDeadline),
        sql`${reportRequests.status} IN ('pending', 'in_progress')`,
        lte(reportRequests.expectedDeadline, threeDaysFromNow)
      )
    )
    .orderBy(reportRequests.expectedDeadline)
    .limit(10);

  return data;
}
