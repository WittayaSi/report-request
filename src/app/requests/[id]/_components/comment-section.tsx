"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, MessageSquare, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { addComment } from "@/app/actions/comment.action";
import { formatThaiDateTime } from "@/utils/date-format";

interface Comment {
  id: number;
  content: string;
  createdAt: Date;
  authorName: string | null;
  authorRole: "ADMIN" | "USER" | "SUPER_ADMIN";
}

interface CommentSectionProps {
  requestId: number;
  comments: Comment[];
  currentUserId: number;
  isLocked?: boolean;
  lockReason?: string;
  isAdmin?: boolean;
}

const QUICK_REPLIES = [
  "ได้รับเรื่องแล้ว กำลังตรวจสอบข้อมูลใน HOSxP ครับ",
  "รับทราบครับ กำลังดำเนินการให้ครับ",
  "รบกวนช่วยระบุเงื่อนไขวันที่ หรือ รูปแบบข้อมูลที่ต้องการ ให้ชัดเจนอีกนิดครับ",
  "ดึงข้อมูลเสร็จเรียบร้อยและอัพโหลดไฟล์ให้แล้วครับ รบกวนตรวจสอบและทำแบบประเมินด้วยครับ"
];

export function CommentSection({
  requestId,
  comments,
  currentUserId,
  isLocked = false,
  lockReason = "คำขอนี้ถูกปิดแล้ว",
  isAdmin = false,
}: CommentSectionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickReply = (text: string) => {
    setContent((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addComment(requestId, content);
      if (result.error) {
        toast.error("ไม่สามารถส่งคอมเมนต์ได้", { description: result.error });
      } else {
        setContent("");
        router.refresh();
        toast.success("ส่งคอมเมนต์แล้ว");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          ความคิดเห็น ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment List */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              ยังไม่มีความคิดเห็น
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={
                      comment.authorRole === "ADMIN"
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {getInitials(comment.authorName || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {comment.authorName}
                    </span>
                    {comment.authorRole === "ADMIN" && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        ADMIN
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatThaiDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-foreground/90 tiptap prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: comment.content }} />
                </div>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Locked message or Comment Form */}
        {isLocked ? (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground bg-muted/50 rounded-lg">
            <Lock className="h-4 w-4" />
            <p className="text-sm">{lockReason}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <RichTextEditor
                  placeholder="เขียนความคิดเห็น... (สามารถวางรูปภาพได้)"
                  value={content}
                  onChange={(val) => setContent(val)}
                />
                
                {isAdmin && (
                  <div className="flex flex-wrap gap-2 py-1">
                    <span className="text-xs text-muted-foreground self-center w-full mb-1">Quick Replies:</span>
                    {QUICK_REPLIES.map((reply, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickReply(reply)}
                        className="text-[10px] h-6 px-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]"
                        title={reply}
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !content.trim() || content === "<p></p>"}
                    size="sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    ส่ง
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
