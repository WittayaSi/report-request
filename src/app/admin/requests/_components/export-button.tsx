"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportRequestsToExcel, SearchFilters } from "@/app/actions/search.action";
import ExcelJS from "exceljs";

interface ExportButtonProps {
  filters: SearchFilters;
}

export function ExportButton({ filters }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportRequestsToExcel(filters);

      if ("error" in result) {
        alert("ไม่สามารถ Export ได้: " + result.error);
        return;
      }

      if (!result.data || result.data.length === 0) {
        alert("ไม่มีข้อมูลสำหรับ Export");
        return;
      }

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Report Request System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Requests");

      // Define columns
      worksheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "หัวข้อ", key: "หัวข้อ", width: 40 },
        { header: "รายละเอียด", key: "รายละเอียด", width: 50 },
        { header: "สถานะ", key: "สถานะ", width: 15 },
        { header: "ความเร่งด่วน", key: "ความเร่งด่วน", width: 12 },
        { header: "ประเภทผลลัพธ์", key: "ประเภทผลลัพธ์", width: 15 },
        { header: "ผู้ขอ", key: "ผู้ขอ", width: 20 },
        { header: "แผนก", key: "แผนก", width: 25 },
        { header: "วันที่สร้าง", key: "วันที่สร้าง", width: 15 },
        { header: "กำหนดส่ง", key: "กำหนดส่ง", width: 15 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Add data rows
      result.data.forEach((row) => {
        worksheet.addRow(row);
      });

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0];
      const filename = `report-requests-${date}.xlsx`;

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("เกิดข้อผิดพลาดในการ Export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export Excel
    </Button>
  );
}
