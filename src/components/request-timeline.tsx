"use client";

import { formatThaiDateTime } from "@/utils/date-format";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileUp, 
  Trash2, 
  MessageSquare, 
  User, 
  UserCheck,
  LogIn,
  Edit
} from "lucide-react";

interface TimelineEvent {
  id: number;
  action: string;
  resourceType: string;
  details: any;
  createdAt: Date;
  userName: string | null;
}

interface RequestTimelineProps {
  events: TimelineEvent[];
}

const actionIcons: Record<string, any> = {
  CREATE_REQUEST: { icon: Clock, color: "text-blue-500" },
  UPDATE_REQUEST: { icon: Edit, color: "text-yellow-500" },
  UPDATE_STATUS: { icon: CheckCircle2, color: "text-green-500" },
  UPLOAD_ATTACHMENT: { icon: FileUp, color: "text-purple-500" },
  DELETE_ATTACHMENT: { icon: Trash2, color: "text-red-500" },
  ADD_COMMENT: { icon: MessageSquare, color: "text-indigo-500" },
  ASSIGN_REQUEST: { icon: UserCheck, color: "text-cyan-500" },
  LOGIN: { icon: LogIn, color: "text-gray-500" },
};

const actionLabels: Record<string, string> = {
  CREATE_REQUEST: "สร้างคำขอ",
  UPDATE_REQUEST: "แก้ไขคำขอ",
  UPDATE_STATUS: "เปลี่ยนสถานะ",
  UPLOAD_ATTACHMENT: "อัปโหลดไฟล์",
  DELETE_ATTACHMENT: "ลบไฟล์",
  ADD_COMMENT: "แสดงความคิดเห็น",
  ASSIGN_REQUEST: "มอบหมายงาน",
  LOGIN: "เข้าสู่ระบบ",
};

const statusLabels: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  rejected: "ปฏิเสธ",
  cancelled: "ยกเลิก",
};

export function RequestTimeline({ events }: RequestTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        ไม่มีประวัติการดำเนินการ
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const config = actionIcons[event.action] || { icon: Clock, color: "text-gray-500" };
        const Icon = config.icon;
        const label = actionLabels[event.action] || event.action;

        let detail = "";
        if (event.action === "UPDATE_STATUS" && event.details?.newStatus) {
          detail = `→ ${statusLabels[event.details.newStatus] || event.details.newStatus}`;
          if (event.details.rejectionReason) {
            detail += ` (${event.details.rejectionReason})`;
          }
        } else if (event.action === "UPLOAD_ATTACHMENT" && event.details?.filename) {
          detail = event.details.filename;
        }

        return (
          <div key={event.id} className="flex gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{label}</span>
                {detail && <span className="text-muted-foreground">{detail}</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{event.userName || "ระบบ"}</span>
                <span>•</span>
                <span>{formatThaiDateTime(event.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
