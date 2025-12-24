"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCheck } from "lucide-react";
import { assignRequest, getAdminUsers } from "@/app/actions/assignment.action";
import { toast } from "sonner";

interface AssignmentSelectProps {
  requestId: number;
  currentAssignee: number | null;
}

interface AdminUser {
  id: number;
  name: string | null;
  username: string;
}

export function AssignmentSelect({ requestId, currentAssignee }: AssignmentSelectProps) {
  const [isPending, startTransition] = useTransition();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>(
    currentAssignee?.toString() || "unassigned"
  );

  useEffect(() => {
    async function fetchAdmins() {
      const data = await getAdminUsers();
      setAdmins(data);
    }
    fetchAdmins();
  }, []);

  const handleAssign = () => {
    startTransition(async () => {
      const assigneeId = selectedAdmin === "unassigned" ? null : parseInt(selectedAdmin, 10);
      const result = await assignRequest(requestId, assigneeId);
      
      if (result.success) {
        toast.success("มอบหมายงานสำเร็จ");
      } else {
        toast.error(result.error || "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">-- ยังไม่มอบหมาย --</SelectItem>
          {admins.map((admin) => (
            <SelectItem key={admin.id} value={admin.id.toString()}>
              {admin.name || admin.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button 
        size="sm" 
        onClick={handleAssign} 
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
