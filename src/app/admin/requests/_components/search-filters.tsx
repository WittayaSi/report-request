"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";

interface SearchFiltersProps {
  departments: string[];
  admins: { id: number; name: string }[];
}

export function SearchFilters({ departments, admins }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [department, setDepartment] = useState(searchParams.get("dept") || "all");
  const [assignedTo, setAssignedTo] = useState(searchParams.get("assigned") || "all");
  const [startDate, setStartDate] = useState(searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end") || "");

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status && status !== "all") params.set("status", status);
      if (department && department !== "all") params.set("dept", department);
      if (assignedTo && assignedTo !== "all") params.set("assigned", assignedTo);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);

      router.push(`?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setQuery("");
    setStatus("all");
    setDepartment("all");
    setAssignedTo("all");
    setStartDate("");
    setEndDate("");
    startTransition(() => {
      router.push("?");
    });
  };

  const hasFilters = query || status !== "all" || department !== "all" || assignedTo !== "all" || startDate || endDate;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" />
        ค้นหาและกรอง
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
        {/* Search Query */}
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="search-query">ค้นหา</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-query"
              placeholder="ชื่อเรื่อง..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>สถานะ</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="pending">รอดำเนินการ</SelectItem>
              <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
              <SelectItem value="completed">เสร็จสิ้น</SelectItem>
              <SelectItem value="rejected">ปฏิเสธ</SelectItem>
              <SelectItem value="cancelled">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <Label>แผนก</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกแผนก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned To */}
        <div className="space-y-1.5">
          <Label>มอบหมายให้</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id.toString()}>
                  {admin.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <Label htmlFor="start-date">ตั้งแต่วันที่</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <Label htmlFor="end-date">ถึงวันที่</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={handleSearch} disabled={isPending} className="flex-1">
            <Search className="h-4 w-4 mr-2" />
            ค้นหา
          </Button>
          {hasFilters && (
            <Button variant="outline" onClick={handleClear} disabled={isPending} size="icon" title="ล้างตัวกรอง">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
