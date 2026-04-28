"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ArrowUpDown } from "lucide-react";

interface UserRequestFiltersProps {
  totalCount: number;
}

export function UserRequestFilters({ totalCount }: UserRequestFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "all";
  const currentQuery = searchParams.get("q") || "";
  const currentSort = searchParams.get("sort") || "date_desc";

  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page when filters change
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      return `/requests?${params.toString()}`;
    },
    [searchParams]
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    router.push(buildUrl({ q: q || null }));
  };

  const clearFilters = () => {
    router.push("/requests");
  };

  const hasActiveFilters =
    currentStatus !== "all" || currentQuery !== "" || currentSort !== "date_desc";

  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="ค้นหาหัวข้อ..."
              defaultValue={currentQuery}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            ค้นหา
          </Button>
        </form>

        {/* Sort */}
        <Select
          value={currentSort}
          onValueChange={(value) => router.push(buildUrl({ sort: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="เรียงตาม" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">ล่าสุดก่อน</SelectItem>
            <SelectItem value="date_asc">เก่าสุดก่อน</SelectItem>
            <SelectItem value="priority_desc">เร่งด่วนก่อน</SelectItem>
            <SelectItem value="priority_asc">ไม่เร่งด่วนก่อน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: "all", label: "ทั้งหมด" },
          { value: "pending", label: "รอดำเนินการ" },
          { value: "in_progress", label: "กำลังดำเนินการ" },
          { value: "completed", label: "เสร็จสิ้น" },
          { value: "rejected", label: "ปฏิเสธ" },
          { value: "cancelled", label: "ยกเลิก" },
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={currentStatus === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() =>
              router.push(buildUrl({ status: tab.value === "all" ? null : tab.value }))
            }
          >
            {tab.label}
          </Button>
        ))}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            ล้าง
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {totalCount} รายการ
        </span>
      </div>
    </div>
  );
}
