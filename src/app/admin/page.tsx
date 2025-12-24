import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { reportRequests, localUsers } from "@/db/app.schema";
import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
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
  Users,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get stats
  const [totalRequests] = await db.select({ count: count() }).from(reportRequests);
  const [pendingRequests] = await db
    .select({ count: count() })
    .from(reportRequests)
    .where(eq(reportRequests.status, "pending"));
  const [inProgressRequests] = await db
    .select({ count: count() })
    .from(reportRequests)
    .where(eq(reportRequests.status, "in_progress"));
  const [totalUsers] = await db.select({ count: count() }).from(localUsers);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            จัดการคำขอรายงานและผู้ใช้งาน
          </p>
        </div>

        {/* Alert for pending */}
        {(pendingRequests?.count || 0) > 0 && (
          <Card className="mb-8 border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  มี {pendingRequests?.count} คำขอรอดำเนินการ
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  กรุณาตรวจสอบและดำเนินการ
                </p>
              </div>
              <Link href="/admin/requests?status=pending">
                <Button variant="outline">
                  ดูคำขอ
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">คำขอทั้งหมด</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests?.count || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {pendingRequests?.count || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {inProgressRequests?.count || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ผู้ใช้งาน</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers?.count || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/requests">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  จัดการคำขอ
                </CardTitle>
                <CardDescription>
                  ดู แก้ไข และเปลี่ยนสถานะคำขอรายงานทั้งหมด
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  จัดการผู้ใช้
                </CardTitle>
                <CardDescription>
                  ดูรายการผู้ใช้และเปลี่ยน Role
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
