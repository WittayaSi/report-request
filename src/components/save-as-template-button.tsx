"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Loader2 } from "lucide-react";
import { createTemplate } from "@/app/actions/template.action";
import { toast } from "sonner";

interface SaveAsTemplateButtonProps {
  requestData: {
    title?: string;
    description?: string | null;
    outputType?: string;
    fileFormat?: string | null;
    dateRangeType?: string;
    priority?: string;
    sourceSystem?: string;
    dataSource?: string | null;
    additionalNotes?: string | null;
  };
}

export function SaveAsTemplateButton({ requestData }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      // Clean null values
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(requestData)) {
        if (value !== null && value !== undefined && value !== "") {
          cleanData[key] = value;
        }
      }
      // Remove title from template (user should enter new title each time)
      delete cleanData.title;

      const result = await createTemplate(name.trim(), cleanData);
      if (result.success) {
        toast.success("บันทึก Template สำเร็จ", {
          description: `"${name}" พร้อมใช้งานในหน้าสร้างคำขอใหม่แล้ว`,
        });
        setOpen(false);
        setName("");
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="h-4 w-4 mr-2" />
          บันทึกเป็น Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกเป็น Template</DialogTitle>
          <DialogDescription>
            บันทึกรายละเอียดของคำขอนี้เป็น Template เพื่อใช้สร้างคำขอใหม่ได้เร็วขึ้น
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">ชื่อ Template</Label>
            <Input
              id="template-name"
              placeholder="เช่น รายงานผู้ป่วยประจำเดือน"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  บันทึก
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
