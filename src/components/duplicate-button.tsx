"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Check } from "lucide-react";
import { duplicateRequest } from "@/app/actions/duplicate.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DuplicateButtonProps {
  requestId: number;
}

export function DuplicateButton({ requestId }: DuplicateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleDuplicate = () => {
    startTransition(async () => {
      const result = await duplicateRequest(requestId);
      
      if (result.success && result.newId) {
        setSuccess(true);
        toast.success("สร้างสำเนาเรียบร้อย");
        setTimeout(() => {
          router.push(`/requests/${result.newId}`);
        }, 500);
      } else {
        toast.error(result.error || "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDuplicate} 
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : success ? (
        <Check className="h-4 w-4 mr-2" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      สร้างสำเนา
    </Button>
  );
}
