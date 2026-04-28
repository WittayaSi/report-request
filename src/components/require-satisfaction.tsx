"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnratedRequest {
  id: number;
  title: string;
  createdAt: Date;
}

interface RequireSatisfactionProps {
  unratedRequests: UnratedRequest[];
  children: React.ReactNode;
}

export function RequireSatisfaction({ unratedRequests, children }: RequireSatisfactionProps) {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (unratedRequests.length > 0) {
      setShowDialog(true);
    }
  }, [unratedRequests]);

  if (unratedRequests.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <Dialog open={showDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              กรุณาประเมินความพึงพอใจก่อน
            </DialogTitle>
            <DialogDescription>
              คุณมีคำขอที่เสร็จสิ้นแล้วแต่ยังไม่ได้ประเมินความพึงพอใจ 
              กรุณาประเมินก่อนสร้างคำขอใหม่
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <p className="text-sm font-medium">คำขอที่รอประเมิน ({unratedRequests.length} รายการ):</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {unratedRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/requests/${request.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Star className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.title}</p>
                      <p className="text-xs text-muted-foreground">
                        คลิกเพื่อไปประเมิน
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Link href="/requests">
              <Button variant="outline">กลับหน้าคำขอ</Button>
            </Link>
            <Link href={`/requests/${unratedRequests[0]?.id}`}>
              <Button>
                <Star className="h-4 w-4 mr-2" />
                ไปประเมินเลย
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show blurred/blocked content behind the modal */}
      <div className="pointer-events-none opacity-30">
        {children}
      </div>
    </>
  );
}
