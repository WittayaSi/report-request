"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, MessageSquare, Send, RefreshCw } from "lucide-react";
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
}

const POLLING_INTERVAL = 10000; // 10 seconds

export function CommentSection({ requestId, comments, currentUserId }: CommentSectionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-refresh comments every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [router]);

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
                  <AvatarFallback className={comment.authorRole === "ADMIN" ? "bg-primary text-primary-foreground" : ""}>
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
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="เขียนความคิดเห็น..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !content.trim()} size="sm">
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
      </CardContent>
    </Card>
  );
}
