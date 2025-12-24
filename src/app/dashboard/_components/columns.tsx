"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  updateReportStatus,
  cancelReportRequest,
} from "@/app/actions/dashboard.action";
import type { Session } from "next-auth";

// Define the shape of our data
export type ReportRequest = {
  id: number;
  title: string;
  requestedBy: string;
  status: "pending" | "in_progress" | "completed" | "rejected" | "cancelled";
  createdAt: Date;
};

// Actions Dropdown Component
function ActionsCell({ row, session }: { row: Row<ReportRequest>; session: Session }) {
  const request = row.original as ReportRequest;
  const user = session.user;

  const isOwner = user.name === request.requestedBy;
  const isAdmin = user.role === "ADMIN";
  const isCancellable = request.status === "pending";
  const statuses: ReportRequest["status"][] = [
    "pending",
    "in_progress",
    "completed",
    "rejected",
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAdmin &&
          statuses.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => updateReportStatus(request.id, status)}
              disabled={request.status === status}
            >
              Mark as {status}
            </DropdownMenuItem>
          ))}
        {isOwner && isCancellable && (
          <DropdownMenuItem
            className="text-red-500"
            onClick={() => cancelReportRequest(request.id)}
          >
            Cancel Request
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<ReportRequest>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "requestedBy", header: "Requested By" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "completed" ? "default" : "outline"}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const session = (table.options.meta as { session: Session }).session;
      return <ActionsCell row={row} session={session} />;
    },
  },
];
