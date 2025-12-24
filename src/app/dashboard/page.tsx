import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { reportRequests, localUsers } from "@/db/app.schema";
import { eq, count, and } from "drizzle-orm";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getRequests } from "@/app/actions/dashboard.action";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardStats,
  getRequestsByDepartment,
  getRequestsByStatus,
  getSLARequests,
} from "@/app/actions/analytics.action";
import { AnalyticsCharts } from "./_components/analytics-charts";
import { SLATable } from "./_components/sla-table";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id, 10);

  // Get counts for current user
  const [pendingCount] = await db
    .select({ count: count() })
    .from(reportRequests)
    .where(
      and(
        eq(reportRequests.requestedBy, userId),
        eq(reportRequests.status, "pending")
      )
    );

  const [inProgressCount] = await db
    .select({ count: count() })
    .from(reportRequests)
    .where(
      and(
        eq(reportRequests.requestedBy, userId),
        eq(reportRequests.status, "in_progress")
      )
    );

  const [completedCount] = await db
    .select({ count: count() })
    .from(reportRequests)
    .where(
      and(
        eq(reportRequests.requestedBy, userId),
        eq(reportRequests.status, "completed")
      )
    );

  // Get recent requests
  const recentRequests = await getRequests({ userId, limit: 5 });

  // Admin stats
  let adminStats = null;
  let departmentData: any[] = [];
  let statusData: any[] = [];
  let slaRequests: any[] = [];

  if (session.user.role === "ADMIN") {
    const [totalPending] = await db
      .select({ count: count() })
      .from(reportRequests)
      .where(eq(reportRequests.status, "pending"));

    const [totalUsers] = await db.select({ count: count() }).from(localUsers);

    adminStats = {
      pendingRequests: totalPending?.count || 0,
      totalUsers: totalUsers?.count || 0,
    };

    departmentData = await getRequestsByDepartment();
    statusData = await getRequestsByStatus();
    slaRequests = await getSLARequests();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              ยินดีต้อนรับ, {session.user.name}
            </p>
          </div>
          <Link href="/requests/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างคำขอใหม่
            </Button>
          </Link>
        </div>

        {/* Admin Alert */}
        {session.user.role === "ADMIN" && adminStats && (
          <>
            <Card className="mb-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-700 dark:text-blue-300">
                  Admin Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8">
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {adminStats.pendingRequests}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      คำขอรอดำเนินการ
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {adminStats.totalUsers}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      ผู้ใช้ทั้งหมด
                    </p>
                  </div>
                  <Link href="/admin" className="ml-auto self-center">
                    <Button variant="outline" size="sm">
                      ไปหน้า Admin
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="mb-8">
              <AnalyticsCharts 
                departmentData={departmentData} 
                statusData={statusData} 
              />
            </div>

            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-destructive" />
                    งานที่ใกล้ถึงกำหนดส่ง / เกินกำหนด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SLATable requests={slaRequests} />
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount?.count || 0}</div>
              <p className="text-xs text-muted-foreground">คำขอที่รอ Admin รับงาน</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount?.count || 0}</div>
              <p className="text-xs text-muted-foreground">คำขอที่กำลังจัดทำ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">เสร็จสิ้น</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount?.count || 0}</div>
              <p className="text-xs text-muted-foreground">คำขอที่เสร็จแล้ว</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>คำขอล่าสุด</CardTitle>
              <CardDescription>คำขอรายงาน 5 รายการล่าสุดของคุณ</CardDescription>
            </div>
            <Link href="/requests">
              <Button variant="ghost" size="sm">
                ดูทั้งหมด
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีคำขอรายงาน</p>
                <Link href="/requests/new">
                  <Button variant="outline" className="mt-4">
                    สร้างคำขอแรกของคุณ
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{request.title}</p>
                          {/* Priority Badge */}
                          {request.priority === "urgent" && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              เร่งด่วน
                            </Badge>
                          )}
                          {request.priority === "high" && (
                            <Badge className="h-5 px-1.5 text-[10px] bg-orange-500 hover:bg-orange-600">
                              สูง
                            </Badge>
                          )}
                          {request.hasUnreadComments > 0 && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.createdAt?.toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Result file indicator (green) */}
                        {request.hasResultFile > 0 && (
                          <span title="มีไฟล์ผลลัพธ์">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </span>
                        )}
                        {/* Attachment indicator */}
                        {request.attachmentCount > 0 && request.hasResultFile === 0 && (
                          <span title="มีไฟล์แนบ">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
