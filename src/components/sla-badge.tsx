import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface SlaBadgeProps {
  slaDeadline: Date | string | null;
  status: string;
}

export function SlaBadge({ slaDeadline, status }: SlaBadgeProps) {
  if (!slaDeadline) return null;
  // Don't show SLA warnings if request is completed, cancelled, or rejected
  if (['completed', 'cancelled', 'rejected'].includes(status)) return null;

  const deadline = new Date(slaDeadline);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
  let label = "";
  let colorClass = "";

  if (diffHours < 0) {
    variant = "destructive";
    label = `เกินกำหนด ${Math.abs(diffHours)} ชม.`;
  } else if (diffHours <= 24) {
    variant = "default";
    label = `เหลือ ${diffHours} ชม.`;
    colorClass = "bg-yellow-500 hover:bg-yellow-600";
  } else {
    variant = "outline";
    label = `SLA: ${Math.ceil(diffHours / 24)} วัน`;
    colorClass = "text-green-600 border-green-600";
  }

  return (
    <Badge variant={variant} className={`flex items-center gap-1 ${colorClass}`}>
      <Clock className="w-3 h-3" />
      {label}
    </Badge>
  );
}
