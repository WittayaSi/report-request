"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, FileIcon, X, Lock } from "lucide-react";
import { uploadAttachment } from "@/app/actions/attachment.action";

interface FileUploadProps {
  requestId: number;
  commentId?: number;
  onUploadComplete?: () => void;
  isAdmin?: boolean;
}

const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".docx", ".doc", ".csv", ".jpg", ".jpeg", ".png", ".gif", ".webp"];

export function FileUpload({ requestId, commentId, onUploadComplete, isAdmin }: FileUploadProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [shouldZip, setShouldZip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("ประเภทไฟล์ไม่รองรับ", {
        description: "รองรับ: PDF, Excel, Word, CSV, รูปภาพ",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป", { description: "สูงสุด 10MB" });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("requestId", requestId.toString());
      if (commentId) {
        formData.append("commentId", commentId.toString());
      }
      if (isAdmin && shouldZip) {
        formData.append("shouldZip", "true");
      }

      const result = await uploadAttachment(formData);

      if (result.error) {
        toast.error("อัพโหลดไม่สำเร็จ", { description: result.error });
      } else {
        toast.success("อัพโหลดสำเร็จ");
        setSelectedFile(null);
        setShouldZip(false);
        router.refresh();
        onUploadComplete?.();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              ลากไฟล์มาวางที่นี่ หรือ <span className="text-primary">คลิกเพื่อเลือกไฟล์</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Excel, Word, CSV, รูปภาพ (สูงสุด 10MB)
            </p>
          </>
        )}
      </div>

      {/* Zip Option (Admin Only) */}
      {isAdmin && selectedFile && (
        <div className="flex items-center space-x-2 p-2 rounded-md bg-muted/50">
          <Checkbox 
            id="zip-file" 
            checked={shouldZip}
            onCheckedChange={(checked) => setShouldZip(checked as boolean)}
          />
          <Label htmlFor="zip-file" className="text-sm cursor-pointer flex items-center gap-2">
            <Lock className="h-3 w-3" />
            Zip ไฟล์และตั้งรหัสผ่าน (ใช้ Username ของผู้ขอ)
          </Label>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              กำลังอัพโหลด...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              อัพโหลดไฟล์
            </>
          )}
        </Button>
      )}
    </div>
  );
}
