import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { reportRequests, localUsers, comments } from "@/db/app.schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  FileText,
  Database,
  AlertCircle,
  Clock,
  Pencil,
  Paperclip,
} from "lucide-react";
import { CancelRequestButton } from "./_components/cancel-button";
import { CommentSection } from "./_components/comment-section";
import { MarkAsViewed } from "./_components/mark-as-viewed";
import { getAttachments } from "@/app/actions/attachment.action";
import { formatThaiDate, formatThaiDateTime } from "@/utils/date-format";
import { FileUpload } from "@/components/file-upload";
import { AttachmentList } from "@/components/attachment-list";
import { AssignmentSelect } from "@/components/assignment-select";
import { RequestTimeline } from "@/components/request-timeline";
import { getRequestTimeline } from "@/app/actions/timeline.action";

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

// Labels
const outputTypeLabels: Record<string, string> = {
  file: "ไฟล์รายงาน",
  hosxp_report: "รายงานในระบบ",
  dashboard: "Dashboard",
  other: "อื่นๆ",
};

const fileFormatLabels: Record<string, string> = {
  excel: "Excel (.xlsx)",
  pdf: "PDF",
  csv: "CSV",
  word: "Word (.docx)",
};

const dateRangeTypeLabels: Record<string, string> = {
  specific: "กำหนดวันที่",
  fiscal_year: "ปีงบประมาณ",
  custom: "กำหนดเอง",
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "ต่ำ", className: "bg-gray-100 text-gray-700" },
  medium: { label: "ปกติ", className: "bg-blue-100 text-blue-700" },
  high: { label: "สูง", className: "bg-orange-100 text-orange-700" },
  urgent: { label: "เร่งด่วน", className: "bg-red-100 text-red-700" },
};

const sourceSystemLabels: Record<string, string> = {
  hosxp: "HOSxP",
  hosoffice: "HosOffice",
  php: "PHP (ระบบอื่น)",
  other: "อื่นๆ",
};

export default async function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) {
    notFound();
  }

  // Get request with user info
  const request = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      description: reportRequests.description,
      outputType: reportRequests.outputType,
      fileFormat: reportRequests.fileFormat,
      dateRangeType: reportRequests.dateRangeType,
      startDate: reportRequests.startDate,
      endDate: reportRequests.endDate,
      fiscalYearStart: reportRequests.fiscalYearStart,
      fiscalYearEnd: reportRequests.fiscalYearEnd,
      priority: reportRequests.priority,
      expectedDeadline: reportRequests.expectedDeadline,
      dataSource: reportRequests.dataSource,
      additionalNotes: reportRequests.additionalNotes,
      sourceSystem: reportRequests.sourceSystem,
      rejectionReason: reportRequests.rejectionReason,
      status: reportRequests.status,
      createdAt: reportRequests.createdAt,
      updatedAt: reportRequests.updatedAt,
      requestedBy: reportRequests.requestedBy,
      assignedTo: reportRequests.assignedTo,
      userName: localUsers.name,
      userDepartment: localUsers.department,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .where(eq(reportRequests.id, requestId))
    .limit(1);

  if (request.length === 0) {
    notFound();
  }

  // Fetch comments
  const requestComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorName: localUsers.name,
      authorRole: localUsers.role,
    })
    .from(comments)
    .leftJoin(localUsers, eq(comments.authorId, localUsers.id))
    .where(eq(comments.requestId, requestId))
    .orderBy(desc(comments.createdAt));

  const formattedComments = requestComments.map((comment) => ({
    ...comment,
    authorRole: (comment.authorRole || "USER") as "ADMIN" | "USER" | "SUPER_ADMIN",
  }));

  // Get attachments
  const requestAttachments = await getAttachments(requestId);
  
  // Get timeline events
  const timelineEvents = await getRequestTimeline(requestId);

  // Mark as viewed (Client Component)
  // await markRequestAsViewed(requestId);

  const data = request[0];
  const userId = parseInt(session.user.id, 10);
  const isOwner = data.requestedBy === userId;
  const canCancel = isOwner && data.status === "pending";
  const canEdit = isOwner && data.status === "pending";

  const isAdmin = session.user.role === "ADMIN";
  const backLink = isAdmin ? "/admin/requests" : "/requests";
  const backLabel = isAdmin ? "กลับไปหน้าจัดการคำขอ" : "กลับไปหน้าคำขอ";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href={backLink}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backLabel}
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <StatusBadge status={data.status} />
                  <span className="text-sm text-muted-foreground">
                    #{data.id}
                  </span>
                  <Badge className={priorityConfig[data.priority]?.className}>
                    {priorityConfig[data.priority]?.label}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{data.title}</CardTitle>
              </div>
            </div>

            {/* Rejection Reason Alert */}
            {data.status === "rejected" && data.rejectionReason && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                <h4 className="font-semibold flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  ถูกปฏิเสธเนื่องจาก
                </h4>
                <p>{data.rejectionReason}</p>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{data.userName}</span>
              </div>
              {data.userDepartment && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{data.userDepartment}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>สร้างเมื่อ {formatThaiDateTime(data.createdAt)}</span>
              </div>
            </div>

            {/* Admin: Assignment Section */}
            {isAdmin && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">ผู้รับผิดชอบ</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">มอบหมายงานให้ Admin</p>
                  </div>
                  <AssignmentSelect 
                    requestId={data.id} 
                    currentAssignee={data.assignedTo} 
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Output Type */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  ประเภทผลลัพธ์
                </h4>
                <p className="font-medium">{outputTypeLabels[data.outputType]}</p>
              </div>
              {data.fileFormat && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    รูปแบบไฟล์
                  </h4>
                  <p className="font-medium">{fileFormatLabels[data.fileFormat]}</p>
                </div>
              )}
            </div>

            {/* Source System */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Database className="h-4 w-4" />
                ระบบต้นทาง
              </h4>
              <p className="font-medium">{sourceSystemLabels[data.sourceSystem]}</p>
            </div>

            {/* Date Range */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                ช่วงเวลาข้อมูล
              </h4>
              <p className="font-medium mb-1">{dateRangeTypeLabels[data.dateRangeType]}</p>
              {data.dateRangeType === "specific" && (data.startDate || data.endDate) && (
                <p className="text-sm">
                  {formatThaiDate(data.startDate)} - {formatThaiDate(data.endDate)}
                </p>
              )}
              {data.dateRangeType === "fiscal_year" && data.fiscalYearStart && (
                <p className="text-sm">
                  ปีงบประมาณ {data.fiscalYearStart}
                  {data.fiscalYearEnd && ` - ${data.fiscalYearEnd}`}
                </p>
              )}
            </div>

            {/* Deadline */}
            {data.expectedDeadline && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  กำหนดส่ง
                </h4>
                <p className="font-medium">{formatThaiDate(data.expectedDeadline)}</p>
              </div>
            )}

            {/* Data Source */}
            {data.dataSource && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  แหล่งข้อมูล
                </h4>
                <p>{data.dataSource}</p>
              </div>
            )}

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">รายละเอียด</h3>
              {data.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {data.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">ไม่มีรายละเอียด</p>
              )}
            </div>

            {/* Additional Notes */}
            {data.additionalNotes && (
              <div>
                <h3 className="font-medium mb-2">หมายเหตุเพิ่มเติม</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {data.additionalNotes}
                </p>
              </div>
            )}

            {/* Actions */}
            {(canEdit || canCancel) && (
              <>
                <Separator />
                <div className="flex justify-end gap-3">
                  {canEdit && (
                    <Link href={`/requests/${data.id}/edit`}>
                      <Button variant="outline">
                        <Pencil className="mr-2 h-4 w-4" />
                        แก้ไข
                      </Button>
                    </Link>
                  )}
                  {canCancel && <CancelRequestButton requestId={data.id} />}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attachments Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-5 w-5" />
              ไฟล์แนบ ({requestAttachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AttachmentList
              attachments={requestAttachments}
              currentUserId={userId}
              isAdmin={isAdmin}
            />
            
            {/* Upload Section - Show based on status and role */}
            {(() => {
              const userCanUpload = isOwner && (data.status === "pending" || data.status === "in_progress");
              const adminCanUpload = isAdmin && data.status === "completed";
              
              if (userCanUpload || adminCanUpload) {
                return (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {isAdmin ? "อัพโหลดไฟล์รายงาน" : "อัพโหลดไฟล์เพิ่มเติม"}
                      </p>
                      <FileUpload requestId={data.id} isAdmin={isAdmin} />
                    </div>
                  </>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>

        <CommentSection
          requestId={data.id}
          comments={formattedComments}
          currentUserId={userId}
        />

        {/* Timeline */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              ประวัติการดำเนินการ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RequestTimeline events={timelineEvents} />
          </CardContent>
        </Card>

        <MarkAsViewed requestId={data.id} />
      </main>
    </div>
  );
}
