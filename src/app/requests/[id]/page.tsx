import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { reportRequests, localUsers, comments } from "@/db/app.schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";
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
  UserCheck,
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
import { DuplicateButton } from "@/components/duplicate-button";
import { PrintButton } from "@/components/print-button";
import { DeleteButton } from "@/components/delete-button";
import { SatisfactionRatingForm } from "@/components/satisfaction-rating-form";
import { SatisfactionDisplay } from "@/components/satisfaction-display";
import { getSatisfactionByRequestId } from "@/app/actions/satisfaction.action";
import { Star } from "lucide-react";
import { SaveAsTemplateButton } from "@/components/save-as-template-button";
import { AutoRefresh } from "@/components/auto-refresh";

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
  php: "PHP",
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

  // Get request with user info + assignee name
  const assignee = alias(localUsers, "assignee");

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
      isDeleted: reportRequests.isDeleted,
      slaDeadline: reportRequests.slaDeadline,
      userName: localUsers.name,
      userDepartment: localUsers.department,
      assigneeName: assignee.name,
    })
    .from(reportRequests)
    .leftJoin(localUsers, eq(reportRequests.requestedBy, localUsers.id))
    .leftJoin(assignee, eq(reportRequests.assignedTo, assignee.id))
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

  // Get satisfaction rating
  const existingSatisfaction = await getSatisfactionByRequestId(requestId);

  // Mark as viewed (Client Component)
  // await markRequestAsViewed(requestId);

  const data = request[0];
  const userId = parseInt(session.user.id, 10);
  const isOwner = data.requestedBy === userId;
  const isRated = !!existingSatisfaction;
  const isClosed = data.status === "cancelled" || data.status === "rejected";
  const isLocked = isRated || isClosed; // ล็อคเมื่อประเมินแล้ว หรือ ยกเลิก/ปฏิเสธ
  const canCancel = isOwner && data.status === "pending" && !isLocked;
  const canEdit = isOwner && data.status === "pending" && !isLocked;

  const isAdmin = session.user.role === "ADMIN";
  const backLink = isAdmin ? "/admin/requests" : "/requests";
  const backLabel = isAdmin ? "กลับไปหน้าจัดการคำขอ" : "กลับไปหน้าคำขอ";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AutoRefresh interval={15000} />
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href={backLink}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backLabel}
        </Link>

        {data.isDeleted && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">คำขอนี้ถูกลบไปแล้ว! </strong>
            <span className="block sm:inline">ข้อมูลนี้เป็นเพียงแค่สำหรับใช้อ้างอิง (Soft Deleted)</span>
          </div>
        )}

        <Card>
          <CardHeader className="space-y-4">
            {/* Title & Status Row */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={data.status} />
                <span className="text-sm text-muted-foreground">
                  #{data.id}
                </span>
                <Badge className={priorityConfig[data.priority]?.className}>
                  {priorityConfig[data.priority]?.label}
                </Badge>
                <SlaBadge slaDeadline={data.slaDeadline} status={data.status} />
              </div>
              <CardTitle className="text-2xl">{data.title}</CardTitle>
            </div>

            {/* Action Bar — แยกบรรทัด ดูสะอาดกว่า */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t print:hidden">
              <PrintButton title={data.title} />
              <DuplicateButton requestId={data.id} />
              <SaveAsTemplateButton
                requestData={{
                  title: data.title,
                  description: data.description,
                  outputType: data.outputType,
                  fileFormat: data.fileFormat,
                  dateRangeType: data.dateRangeType,
                  priority: data.priority,
                  sourceSystem: data.sourceSystem,
                  dataSource: data.dataSource,
                  additionalNotes: data.additionalNotes,
                }}
              />
              {canEdit && (
                <Link href={`/requests/${data.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    แก้ไข
                  </Button>
                </Link>
              )}
              {/* Delete — แยกไปขวาสุด */}
              {isOwner && data.status === "pending" && !isLocked && (
                <div className="ml-auto">
                  <DeleteButton requestId={data.id} requestTitle={data.title} />
                </div>
              )}
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
              {data.assigneeName && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                  <UserCheck className="h-4 w-4" />
                  <span>ผู้รับผิดชอบ: {data.assigneeName}</span>
                </div>
              )}
            </div>

            {/* Admin: Assignment Section */}
            {isAdmin && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-blue-700 dark:text-blue-300">
                      {data.assigneeName ? `ผู้รับผิดชอบ: ${data.assigneeName}` : "ยังไม่ได้มอบหมาย"}
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {data.assignedTo
                        ? "เปลี่ยน หรือ มอบหมายงานให้ Admin คนอื่น"
                        : "มอบหมายงานให้ Admin — หรือเปลี่ยนสถานะเป็น 'กำลังดำเนินการ' เพื่อรับงานอัตโนมัติ"}
                    </p>
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
              {data.outputType === "file" && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    รูปแบบไฟล์
                  </h4>
                  <p className="font-medium">
                    {data.fileFormat ? fileFormatLabels[data.fileFormat] : <span className="text-muted-foreground italic">ไม่ได้ระบุรูปแบบ</span>}
                  </p>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-primary border-b pb-2">
                <FileText className="h-5 w-5" />
                รายละเอียดการดำเนินงาน
              </h3>
              {data.description && data.description !== "<p></p>" ? (
                <div 
                  className="text-foreground/90 tiptap prose prose-sm dark:prose-invert max-w-none" 
                  dangerouslySetInnerHTML={{ __html: data.description }} 
                />
              ) : (
                <p className="text-muted-foreground italic text-sm">ไม่มีรายละเอียดระบุไว้</p>
              )}
            </div>

            {/* Additional Notes */}
            {data.additionalNotes && data.additionalNotes !== "<p></p>" && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-5 border border-blue-100 dark:border-blue-900 shadow-sm mt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800 pb-2">
                  <AlertCircle className="h-5 w-5" />
                  หมายเหตุเพิ่มเติม / ข้อควรระวัง
                </h3>
                <div 
                  className="text-foreground/90 tiptap prose prose-sm dark:prose-invert max-w-none" 
                  dangerouslySetInnerHTML={{ __html: data.additionalNotes }} 
                />
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
              isRequestRated={!!existingSatisfaction}
              isRequestCompleted={data.status === "completed"}
            />
            
            {/* Upload Section - Show based on status and role */}
            {(() => {
              const userCanUpload = isOwner && (data.status === "pending" || data.status === "in_progress") && !isLocked;
              const adminCanUpload = isAdmin && data.status === "completed" && !isLocked;
              
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
          isLocked={isLocked}
          isAdmin={isAdmin}
          lockReason={
            isRated
              ? "คำขอนี้ถูกปิดแล้ว (ประเมินความพึงพอใจเรียบร้อย)"
              : data.status === "cancelled"
              ? "คำขอนี้ถูกยกเลิกแล้ว"
              : data.status === "rejected"
              ? "คำขอนี้ถูกปฏิเสธแล้ว"
              : undefined
          }
        />

        {/* Satisfaction Rating Section - Show for completed requests */}
        {data.status === "completed" && (
          <Card className="mt-6 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                ประเมินความพึงพอใจ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {existingSatisfaction ? (
                <SatisfactionDisplay satisfaction={existingSatisfaction} />
              ) : isOwner ? (
                <SatisfactionRatingForm requestId={data.id} />
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  ยังไม่มีการประเมินความพึงพอใจ
                </p>
              )}
            </CardContent>
          </Card>
        )}

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
