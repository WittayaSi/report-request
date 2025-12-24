import { cn } from "@/lib/utils";

type StatusType =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected"
  | "cancelled";

const statusConfig: Record<
  StatusType,
  { label: string; className: string }
> = {
  pending: {
    label: "รอดำเนินการ",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  in_progress: {
    label: "กำลังดำเนินการ",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  completed: {
    label: "เสร็จสิ้น",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  rejected: {
    label: "ปฏิเสธ",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  cancelled: {
    label: "ยกเลิก",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: StatusType): string {
  return statusConfig[status]?.label || status;
}
