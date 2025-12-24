"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
import { updateReportStatus } from "@/app/actions/dashboard.action";
import { StatusBadge } from "@/components/status-badge";

type Status = "pending" | "in_progress" | "completed" | "rejected" | "cancelled";

interface StatusUpdateButtonProps {
  requestId: number;
  currentStatus: Status;
}

const statusOptions: { value: Status; label: string }[] = [
  { value: "pending", label: "รอดำเนินการ" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "rejected", label: "ปฏิเสธ" },
];

export function StatusUpdateButton({
  requestId,
  currentStatus,
}: StatusUpdateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleStatusChange = async (newStatus: Status, reason?: string) => {
    if (newStatus === currentStatus) return;

    if (newStatus === "rejected" && !reason && !isRejectDialogOpen) {
      setIsRejectDialogOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateReportStatus(requestId, newStatus, reason);

      if (result.error) {
        toast.error("ไม่สามารถเปลี่ยนสถานะได้", {
          description: result.error,
        });
      } else {
        toast.success("เปลี่ยนสถานะสำเร็จ");
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        router.refresh();
      }
    } catch (_error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRejection = () => {
    if (!rejectionReason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ปฏิเสธ");
      return;
    }
    handleStatusChange("rejected", rejectionReason);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading} className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <StatusBadge status={currentStatus} />
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={option.value === currentStatus}
              className={option.value === "rejected" ? "text-destructive focus:text-destructive" : ""}
            >
              {option.label}
              {option.value === currentStatus && " (ปัจจุบัน)"}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ระบุเหตุผลที่ปฏิเสธ</DialogTitle>
            <DialogDescription>
              โปรดระบุเหตุผลที่ปฏิเสธคำขอนี้ เพื่อให้ผู้ขอทราบ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reason">เหตุผล</Label>
            <Textarea
              id="reason"
              placeholder="เช่น ข้อมูลไม่เพียงพอ, อยู่นอกเหนือขอบเขตงาน..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ยืนยันการปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
