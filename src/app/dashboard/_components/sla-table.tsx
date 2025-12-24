"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatThaiDateTime } from "@/utils/date-format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface SLARequest {
  id: number;
  title: string;
  status: string | null;
  priority: string;
  expectedDeadline: Date | null;
  requestedBy: string | null;
}

interface SLATableProps {
  requests: SLARequest[];
}

export function SLATable({ requests }: SLATableProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        ไม่มีงานที่ใกล้ถึงกำหนดส่ง
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>หัวข้อ</TableHead>
              <TableHead>ผู้ขอ</TableHead>
              <TableHead>กำหนดส่ง</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const isOverdue = req.expectedDeadline && new Date(req.expectedDeadline) < new Date();
              
              return (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      {req.title}
                    </div>
                  </TableCell>
                  <TableCell>{req.requestedBy}</TableCell>
                  <TableCell className={isOverdue ? "text-destructive font-bold" : ""}>
                    {formatThaiDateTime(req.expectedDeadline)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{req.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/requests/${req.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
