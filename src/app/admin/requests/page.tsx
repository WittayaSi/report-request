import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { reportRequests, localUsers, comments, requestViews } from "@/db/app.schema";
import { desc, eq, sql, and, like } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Eye, MessageSquare, Paperclip, CheckCircle2 } from "lucide-react";
import { StatusUpdateButton } from "./_components/status-update-button";
import { formatThaiDateTime } from "@/utils/date-format";
import { AutoRefresh } from "@/components/auto-refresh";
import { SearchFilters } from "./_components/search-filters";
import { ExportButton } from "./_components/export-button";
import { searchRequests, getDepartmentList, SearchFilters as SearchFiltersType } from "@/app/actions/search.action";
import { getAdminUsers } from "@/app/actions/assignment.action";

interface AdminRequestsPageProps {
  searchParams: Promise<{ 
    status?: string;
    q?: string;
    dept?: string;
    assigned?: string;
    start?: string;
    end?: string;
  }>;
}

export default async function AdminRequestsPage({
  searchParams,
}: AdminRequestsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const statusFilter = params.status;
  
  // Prepare search filters
  const filters: SearchFiltersType = {
    query: params.q,
    status: params.status,
    department: params.dept,
    assignedTo: params.assigned,
    startDate: params.start,
    endDate: params.end,
  };
  
  // Get department list for dropdown
  const departments = await getDepartmentList();
  
  // Get admin users for dropdown
  const rawAdmins = await getAdminUsers();
  const admins = rawAdmins.map(admin => ({
    id: admin.id,
    name: admin.name || admin.username
  }));

  // Get all requests with user info
  const currentUserId = Number(session.user.id);
  
  // Build filter conditions
  const filterConditions = [];
  
  if (filters.query) {
    // Escape special SQL LIKE characters to prevent injection
    const escapedQuery = filters.query.replace(/[%_\\]/g, '\\$&');
    const searchTerm = `%${escapedQuery}%`;
    filterConditions.push(like(reportRequests.title, searchTerm));
  }
  
  if (filters.status && filters.status !== "all") {
    filterConditions.push(eq(reportRequests.status, filters.status as any));
  }
  
  if (filters.department && filters.department !== "all") {
    filterConditions.push(eq(localUsers.department, filters.department));
  }

  if (filters.assignedTo && filters.assignedTo !== "all") {
    filterConditions.push(eq(reportRequests.assignedTo, parseInt(filters.assignedTo)));
  }
  
  if (filters.startDate) {
    filterConditions.push(sql`${reportRequests.createdAt} >= ${new Date(filters.startDate)}`);
  }
  
  if (filters.endDate) {
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    filterConditions.push(sql`${reportRequests.createdAt} <= ${endOfDay}`);
  }
  
  // Alias for assignee join
  const assignee = alias(localUsers, "assignee");

  const requests = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      description: reportRequests.description,
      status: reportRequests.status,
      createdAt: reportRequests.createdAt,
      userName: localUsers.name,
      userDepartment: localUsers.department,
      assigneeName: assignee.name,
      hasUnreadComments: sql<number>`(
        SELECT COUNT(*) FROM comments c
        WHERE c.request_id = ${reportRequests.id}
        AND c.author_id != ${currentUserId}
        AND (c.created_at > COALESCE(${requestViews.viewedAt}, '1970-01-01'))
      )`,
      attachmentCount: sql<number>`(
        SELECT COUNT(*) FROM attachments a
        WHERE a.request_id = ${reportRequests.id}
      )`,
      hasResultFile: sql<number>`(
        SELECT COUNT(*) FROM attachments a
        WHERE a.request_id = ${reportRequests.id}
        AND a.attachment_type = 'result'
      )`,
      priority: reportRequests.priority,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .leftJoin(assignee, eq(reportRequests.assignedTo, assignee.id))
    .leftJoin(
      requestViews,
      and(
        eq(requestViews.requestId, reportRequests.id),
        eq(requestViews.userId, currentUserId)
      )
    )
    .where(filterConditions.length > 0 ? and(...filterConditions) : undefined)
    .orderBy(
      sql`CASE 
        WHEN ${reportRequests.priority} = 'urgent' THEN 4
        WHEN ${reportRequests.priority} = 'high' THEN 3
        WHEN ${reportRequests.priority} = 'medium' THEN 2
        WHEN ${reportRequests.priority} = 'low' THEN 1
        ELSE 0
      END DESC`,
      desc(reportRequests.createdAt)
    );

  // Filter by status if specified (redundant with DB filter but kept for safety)
  const filteredRequests = statusFilter
    ? requests.filter((r) => r.status === statusFilter)
    : requests;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AutoRefresh interval={10000} /> {/* Auto-refresh every 10 seconds */}
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">จัดการคำขอ</h1>
            <p className="text-muted-foreground">
              คำขอทั้งหมด {filteredRequests.length} รายการ
              {statusFilter && ` (กรอง: ${statusFilter})`}
            </p>
          </div>
        </div>

        {/* Advanced Search Filters */}
        <div className="mb-6">
          <SearchFilters departments={departments} admins={admins} />
        </div>

        {/* Filter buttons and Export */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap gap-2 flex-1">
          <Link href="/admin/requests">
            <Button variant={!statusFilter ? "default" : "outline"} size="sm">
              ทั้งหมด
            </Button>
          </Link>
          <Link href="/admin/requests?status=pending">
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
            >
              รอดำเนินการ
            </Button>
          </Link>
          <Link href="/admin/requests?status=in_progress">
            <Button
              variant={statusFilter === "in_progress" ? "default" : "outline"}
              size="sm"
            >
              กำลังดำเนินการ
            </Button>
          </Link>
          <Link href="/admin/requests?status=completed">
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
            >
              เสร็จสิ้น
            </Button>
          </Link>
          </div>
          <ExportButton filters={filters} />
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>รายการคำขอ</CardTitle>
            <CardDescription>คลิกที่สถานะเพื่อเปลี่ยน</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>ไม่มีคำขอ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
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
                        โดย: {request.userName} ({request.userDepartment})
                        {request.assigneeName && (
                          <span className="ml-2 text-primary">
                            • ผู้รับผิดชอบ: {request.assigneeName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatThaiDateTime(request.createdAt)}
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
                      <Link href={`/requests/${request.id}`}>
                        <Button variant="ghost" size="icon" title="ดูรายละเอียด">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <StatusUpdateButton
                        requestId={request.id}
                        currentStatus={request.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
