"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportRequestsToExcel, SearchFilters } from "@/app/actions/search.action";
import * as XLSX from "xlsx";

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

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(result.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");

      // Set column widths
      worksheet["!cols"] = [
        { wch: 8 },   // ID
        { wch: 40 },  // หัวข้อ
        { wch: 50 },  // รายละเอียด
        { wch: 15 },  // สถานะ
        { wch: 12 },  // ความเร่งด่วน
        { wch: 15 },  // ประเภท
        { wch: 20 },  // ผู้ขอ
        { wch: 25 },  // แผนก
        { wch: 12 },  // วันที่สร้าง
        { wch: 12 },  // กำหนดส่ง
      ];

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0];
      const filename = `report-requests-${date}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);
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
