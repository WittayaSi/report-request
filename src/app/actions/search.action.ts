"use server";

import { db } from "@/db/app.db";
import { reportRequests, localUsers } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, and, like, gte, lte, desc, sql } from "drizzle-orm";

import { alias } from "drizzle-orm/mysql-core";

export interface SearchFilters {
  query?: string;
  status?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
}

export async function searchRequests(filters: SearchFilters) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const conditions = [];

  if (filters.query) {
    conditions.push(like(reportRequests.title, `%${filters.query}%`));
  }

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(reportRequests.status, filters.status as any));
  }

  if (filters.department && filters.department !== "all") {
    conditions.push(eq(localUsers.department, filters.department));
  }

  if (filters.assignedTo && filters.assignedTo !== "all") {
    conditions.push(eq(reportRequests.assignedTo, parseInt(filters.assignedTo)));
  }

  if (filters.startDate) {
    conditions.push(gte(reportRequests.createdAt, new Date(filters.startDate)));
  }

  if (filters.endDate) {
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(lte(reportRequests.createdAt, endOfDay));
  }

  // Alias for assignee join
  const assignee = alias(localUsers, "assignee");

  const data = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      description: reportRequests.description,
      status: reportRequests.status,
      priority: reportRequests.priority,
      outputType: reportRequests.outputType,
      createdAt: reportRequests.createdAt,
      expectedDeadline: reportRequests.expectedDeadline,
      userName: localUsers.name,
      userDepartment: localUsers.department,
      assigneeName: assignee.name,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .leftJoin(assignee, eq(reportRequests.assignedTo, assignee.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reportRequests.createdAt))
    .limit(100);

  return { data };
}

export async function getDepartmentList() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const departments = await db
    .selectDistinct({ department: localUsers.department })
    .from(localUsers)
    .where(sql`${localUsers.department} IS NOT NULL AND ${localUsers.department} != ''`);

  return departments.map((d) => d.department).filter(Boolean) as string[];
}

export async function exportRequestsToExcel(filters: SearchFilters) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const { data } = await searchRequests(filters);

  if (!data || "error" in data) {
    return { error: "Failed to fetch data" };
  }

  // Format data for Excel
  const excelData = (data as any[]).map((row) => ({
    "ID": row.id,
    "หัวข้อ": row.title,
    "รายละเอียด": row.description || "",
    "สถานะ": getStatusLabel(row.status),
    "ความเร่งด่วน": getPriorityLabel(row.priority),
    "ประเภท": getOutputTypeLabel(row.outputType),
    "ผู้ขอ": row.userName || "",
    "แผนก": row.userDepartment || "",
    "วันที่สร้าง": row.createdAt ? new Date(row.createdAt).toLocaleDateString("th-TH") : "",
    "กำหนดส่ง": row.expectedDeadline ? new Date(row.expectedDeadline).toLocaleDateString("th-TH") : "",
  }));

  return { data: excelData };
}

function getStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    pending: "รอดำเนินการ",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
    cancelled: "ยกเลิก",
  };
  return labels[status || ""] || status || "";
}

function getPriorityLabel(priority: string | null): string {
  const labels: Record<string, string> = {
    low: "ต่ำ",
    medium: "ปกติ",
    high: "สูง",
    urgent: "เร่งด่วน",
  };
  return labels[priority || ""] || priority || "";
}

function getOutputTypeLabel(outputType: string | null): string {
  const labels: Record<string, string> = {
    file: "ไฟล์",
    hosxp_report: "รายงาน HOSxP",
    dashboard: "Dashboard",
    other: "อื่นๆ",
  };
  return labels[outputType || ""] || outputType || "";
}
