"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  /** Base path e.g. "/requests" or "/admin/requests" */
  basePath: string;
  /** Current search params to preserve when changing page (excluding "page") */
  currentParams?: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  targetPage: number,
  currentParams?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  if (targetPage > 1) params.set("page", String(targetPage));
  if (currentParams) {
    for (const [key, value] of Object.entries(currentParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  basePath,
  currentParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Build visible page numbers
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        แสดง {startItem}-{endItem} จาก {totalCount} รายการ
      </p>

      <div className="flex items-center gap-1">
        {/* First */}
        {currentPage > 2 && (
          <Link href={buildHref(basePath, 1, currentParams)}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}

        {/* Previous */}
        {currentPage > 1 && (
          <Link href={buildHref(basePath, currentPage - 1, currentParams)}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}

        {/* Page numbers */}
        {pages[0] > 1 && (
          <span className="text-sm text-muted-foreground px-1">...</span>
        )}
        {pages.map((page) => (
          <Link key={page} href={buildHref(basePath, page, currentParams)}>
            <Button
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
            >
              {page}
            </Button>
          </Link>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <span className="text-sm text-muted-foreground px-1">...</span>
        )}

        {/* Next */}
        {currentPage < totalPages && (
          <Link href={buildHref(basePath, currentPage + 1, currentParams)}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}

        {/* Last */}
        {currentPage < totalPages - 1 && (
          <Link href={buildHref(basePath, totalPages, currentParams)}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
