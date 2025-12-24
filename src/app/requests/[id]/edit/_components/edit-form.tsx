"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Calendar, FileText, Database, AlertCircle } from "lucide-react";
import { updateReportRequest } from "@/app/actions/request.action";

const requestSchema = z.object({
  title: z.string().min(3, "หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร"),
  description: z.string().optional(),
  outputType: z.enum(["file", "hosxp_report", "dashboard", "other"]),
  fileFormat: z.enum(["excel", "pdf", "csv", "word"]).optional(),
  dateRangeType: z.enum(["specific", "fiscal_year", "custom"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fiscalYearStart: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  sourceSystem: z.enum(["hosxp", "hosoffice", "php", "other"]),
  expectedDeadline: z.string().optional(),
  dataSource: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface RequestData {
  id: number;
  title: string;
  description: string | null;
  outputType: "file" | "hosxp_report" | "dashboard" | "other";
  fileFormat: "excel" | "pdf" | "csv" | "word" | null;
  dateRangeType: "specific" | "fiscal_year" | "custom";
  startDate: string | null;
  endDate: string | null;
  fiscalYearStart: string | null;
  fiscalYearEnd: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  sourceSystem: "hosxp" | "hosoffice" | "php" | "other";
  expectedDeadline: string | null;
  dataSource: string | null;
  additionalNotes: string | null;
}

// สร้าง options ปีงบประมาณ (พ.ศ.)
function getFiscalYearOptions() {
  const currentYear = new Date().getFullYear() + 543;
  const years: string[] = [];
  for (let i = currentYear + 1; i >= currentYear - 10; i--) {
    years.push(String(i));
  }
  return years;
}

interface EditRequestFormProps {
  request: RequestData;
}

export function EditRequestForm({ request }: EditRequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fiscalYears = getFiscalYearOptions();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: request.title,
      description: request.description || "",
      outputType: request.outputType,
      fileFormat: request.fileFormat || undefined,
      dateRangeType: request.dateRangeType,
      startDate: request.startDate || "",
      endDate: request.endDate || "",
      fiscalYearStart: request.fiscalYearStart || "",
      fiscalYearEnd: request.fiscalYearEnd || "",
      priority: request.priority,
      sourceSystem: request.sourceSystem,
      expectedDeadline: request.expectedDeadline || "",
      dataSource: request.dataSource || "",
      additionalNotes: request.additionalNotes || "",
    },
  });

  const outputType = watch("outputType");
  const dateRangeType = watch("dateRangeType");

  const onSubmit = async (data: RequestFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      formData.append("outputType", data.outputType);
      if (data.fileFormat) formData.append("fileFormat", data.fileFormat);
      formData.append("dateRangeType", data.dateRangeType);
      if (data.startDate) formData.append("startDate", data.startDate);
      if (data.endDate) formData.append("endDate", data.endDate);
      if (data.fiscalYearStart) formData.append("fiscalYearStart", data.fiscalYearStart);
      if (data.fiscalYearEnd) formData.append("fiscalYearEnd", data.fiscalYearEnd);
      formData.append("priority", data.priority);
      formData.append("sourceSystem", data.sourceSystem);
      if (data.expectedDeadline) formData.append("expectedDeadline", data.expectedDeadline);
      if (data.dataSource) formData.append("dataSource", data.dataSource);
      if (data.additionalNotes) formData.append("additionalNotes", data.additionalNotes);

      const result = await updateReportRequest(request.id, formData);

      if (result.error) {
        toast.error("เกิดข้อผิดพลาด", { description: result.error });
      } else if (result.errors) {
        toast.error("กรุณาตรวจสอบข้อมูล");
      } else {
        toast.success("บันทึกสำเร็จ!");
        router.push(`/requests/${request.id}`);
        router.refresh();
      }
    } catch (_error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">แก้ไขคำขอ #{request.id}</CardTitle>
        <CardDescription>
          แก้ไขรายละเอียดคำขอได้เฉพาะขณะที่ยังรอดำเนินการ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* หัวข้อรายงาน */}
          <div className="space-y-2">
            <Label htmlFor="title">หัวข้อรายงาน *</Label>
            <Input
              id="title"
              placeholder="เช่น รายงานสรุปยอดผู้ป่วยประจำเดือน"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* รายละเอียด */}
          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              placeholder="อธิบายรายละเอียดของรายงานที่ต้องการ..."
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ต้องการจากระบบ */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                ต้องการจากระบบ *
              </Label>
              <Select
                value={watch("sourceSystem")}
                onValueChange={(value) => setValue("sourceSystem", value as RequestFormValues["sourceSystem"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกระบบ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hosxp">HOSxP</SelectItem>
                  <SelectItem value="hosoffice">HosOffice</SelectItem>
                  <SelectItem value="php">PHP Office</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ประเภทผลลัพธ์ */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ประเภทผลลัพธ์ *
              </Label>
              <Select
                value={watch("outputType")}
                onValueChange={(value) => setValue("outputType", value as RequestFormValues["outputType"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">ไฟล์รายงาน</SelectItem>
                  <SelectItem value="hosxp_report">รายงานในระบบ</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* รูปแบบไฟล์ */}
          {outputType === "file" && (
            <div className="space-y-2">
              <Label>รูปแบบไฟล์ *</Label>
              <Select
                value={watch("fileFormat") || "excel"}
                onValueChange={(value) => setValue("fileFormat", value as RequestFormValues["fileFormat"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกรูปแบบ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="word">Word (.docx)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ช่วงเวลาข้อมูล */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Calendar className="h-4 w-4" />
              ช่วงเวลาข้อมูล *
            </Label>

            <Select
              value={watch("dateRangeType")}
              onValueChange={(value) => setValue("dateRangeType", value as RequestFormValues["dateRangeType"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">กำหนดวันที่</SelectItem>
                <SelectItem value="fiscal_year">ปีงบประมาณ</SelectItem>
                <SelectItem value="custom">กำหนดเองในรายละเอียด</SelectItem>
              </SelectContent>
            </Select>

            {dateRangeType === "specific" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">ตั้งแต่วันที่</Label>
                  <Input type="date" id="startDate" {...register("startDate")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">ถึงวันที่</Label>
                  <Input type="date" id="endDate" {...register("endDate")} />
                </div>
              </div>
            )}

            {dateRangeType === "fiscal_year" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ปีงบประมาณเริ่มต้น</Label>
                  <Select
                    value={watch("fiscalYearStart") || ""}
                    onValueChange={(value) => setValue("fiscalYearStart", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกปี พ.ศ." />
                    </SelectTrigger>
                    <SelectContent>
                      {fiscalYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ถึงปีงบประมาณ (ถ้าต้องการหลายปี)</Label>
                  <Select
                    value={watch("fiscalYearEnd") || "single"}
                    onValueChange={(value) => setValue("fiscalYearEnd", value === "single" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ปีเดียว หรือเลือกปีสิ้นสุด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">ปีเดียว</SelectItem>
                      {fiscalYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {dateRangeType === "custom" && (
              <p className="text-sm text-muted-foreground">
                กรุณาระบุช่วงเวลาในช่อง &quot;หมายเหตุเพิ่มเติม&quot; ด้านล่าง
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ความเร่งด่วน */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                ความเร่งด่วน *
              </Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as RequestFormValues["priority"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกความเร่งด่วน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">ต่ำ - ไม่รีบ</SelectItem>
                  <SelectItem value="medium">ปกติ</SelectItem>
                  <SelectItem value="high">สูง - ต้องการเร็ว</SelectItem>
                  <SelectItem value="urgent">เร่งด่วน - ต้องใช้ทันที</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* กำหนดส่ง */}
            <div className="space-y-2">
              <Label htmlFor="expectedDeadline">กำหนดส่ง (ถ้ามี)</Label>
              <Input type="date" id="expectedDeadline" {...register("expectedDeadline")} />
            </div>
          </div>

          {/* แหล่งข้อมูล */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              แหล่งข้อมูล / ตารางที่ต้องการ
            </Label>
            <Input
              placeholder="เช่น ovst, opdscreen, ipt หรือระบบอื่น"
              {...register("dataSource")}
            />
          </div>

          {/* หมายเหตุเพิ่มเติม */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">หมายเหตุเพิ่มเติม</Label>
            <Textarea
              id="additionalNotes"
              placeholder="ข้อมูลอื่นๆ ที่ต้องการแจ้ง Admin"
              rows={3}
              {...register("additionalNotes")}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  บันทึก
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
