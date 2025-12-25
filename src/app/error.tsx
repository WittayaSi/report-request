"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("Page Error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold">เกิดข้อผิดพลาด</h2>
          <p className="text-muted-foreground text-sm">
            ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            ลองใหม่
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับหน้าแรก
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
