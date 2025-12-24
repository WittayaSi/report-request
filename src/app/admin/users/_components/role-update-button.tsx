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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, Loader2, Shield, User } from "lucide-react";
import { updateUserRoleAction } from "@/app/actions/user.action";

type Role = "ADMIN" | "USER";

interface RoleUpdateButtonProps {
  userId: number;
  currentRole: Role;
  username: string;
}

export function RoleUpdateButton({
  userId,
  currentRole,
  username,
}: RoleUpdateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: Role) => {
    if (newRole === currentRole) return;

    setIsLoading(true);
    try {
      const result = await updateUserRoleAction(userId, newRole);

      if (result.error) {
        toast.error("ไม่สามารถเปลี่ยน Role ได้", {
          description: result.error,
        });
      } else {
        toast.success(`เปลี่ยน Role สำเร็จ`, {
          description: `${username} เป็น ${newRole} แล้ว`,
        });
        router.refresh();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading} className="gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Badge
                variant={currentRole === "ADMIN" ? "default" : "secondary"}
                className="gap-1"
              >
                {currentRole === "ADMIN" ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {currentRole}
              </Badge>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleRoleChange("USER")}
          disabled={currentRole === "USER"}
        >
          <User className="h-4 w-4 mr-2" />
          USER {currentRole === "USER" && "(ปัจจุบัน)"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRoleChange("ADMIN")}
          disabled={currentRole === "ADMIN"}
        >
          <Shield className="h-4 w-4 mr-2" />
          ADMIN {currentRole === "ADMIN" && "(ปัจจุบัน)"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
