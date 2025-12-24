import { auth } from "@/auth";
import { getRequests } from "@/app/actions/dashboard.action";
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
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, MessageSquare, Paperclip, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { formatThaiDateTime } from "@/utils/date-format";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id, 10);

  // Get all requests for current user
  const requests = await getRequests({ userId });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AutoRefresh interval={10000} /> {/* Auto-refresh every 10 seconds */}
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">คำขอของฉัน</h1>
              <p className="text-muted-foreground">
                คำขอรายงานทั้งหมด {requests.length} รายการ
              </p>
            </div>
          </div>
          <Link href="/requests/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างคำขอใหม่
            </Button>
          </Link>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>รายการคำขอ</CardTitle>
            <CardDescription>
              ทุกคำขอรายงานที่คุณสร้างไว้
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">ยังไม่มีคำขอรายงาน</p>
                <Link href="/requests/new">
                  <Button>สร้างคำขอแรกของคุณ</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
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
                        {request.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {request.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
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
