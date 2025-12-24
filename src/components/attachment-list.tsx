"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileIcon,
  FileSpreadsheet,
  FileText,
  Image,
  Download,
  Trash2,
  Loader2,
  Eye,
  Lock,
} from "lucide-react";
import { deleteAttachment } from "@/app/actions/attachment.action";
import { formatThaiDateTime } from "@/utils/date-format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Attachment {
  id: number;
  requestId: number;
  commentId: number | null;
  uploaderId: number;
  uploaderName: string | null;
  attachmentType: "reference" | "result";
  filename: string;
  storedFilename: string;
  fileType: string;
  fileSize: number;
  createdAt: Date | string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  currentUserId: number;
  isAdmin: boolean;
  showUploader?: boolean;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType === "text/csv") {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (fileType.includes("word") || fileType === "application/pdf") {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  if (fileType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-purple-600" />;
  }
  return <FileIcon className="h-5 w-5 text-gray-600" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export function AttachmentList({
  attachments,
  currentUserId,
  isAdmin,
  showUploader = true,
}: AttachmentListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        ยังไม่มีไฟล์แนบ
      </p>
    );
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const result = await deleteAttachment(id);
      if (result.error) {
        toast.error("ลบไม่สำเร็จ", { description: result.error });
      } else {
        toast.success("ลบไฟล์แล้ว");
        router.refresh();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => {
        // Only owner can delete (admin cannot delete user's files)
        const canDelete = attachment.uploaderId === currentUserId;
        
        // Check if file can be previewed in browser
        const isPreviewable = attachment.fileType.startsWith("image/") || 
                              attachment.fileType === "application/pdf";

        return (
          <div
            key={attachment.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
          >
            {/* File Icon */}
            {getFileIcon(attachment.fileType)}

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{attachment.filename}</p>
                {attachment.attachmentType === "result" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    ผลลัพธ์
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    ไฟล์อ้างอิง
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
                {showUploader && attachment.uploaderName && (
                  <> • โดย {attachment.uploaderName}</>
                )}
                {" • "}
                {formatThaiDateTime(attachment.createdAt)}
              </p>
              {(attachment.fileType === "application/zip" || attachment.filename.endsWith(".zip")) && (
                <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>รหัสผ่านคือ Username ของผู้ขอ</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* View in browser (for images and PDFs) */}
              {isPreviewable && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="ดูไฟล์"
                >
                  <a
                    href={`/uploads/${attachment.storedFilename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="ดาวน์โหลด"
              >
                <a
                  href={`/uploads/${attachment.storedFilename}`}
                  download={attachment.filename}
                  target="_blank"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>

              {/* Delete */}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={deletingId === attachment.id}
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันการลบไฟล์</AlertDialogTitle>
                      <AlertDialogDescription>
                        คุณแน่ใจหรือไม่ที่จะลบไฟล์ "{attachment.filename}"?
                        การกระทำนี้ไม่สามารถย้อนกลับได้
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        ลบ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
