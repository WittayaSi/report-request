import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { reportRequests } from "@/db/app.schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditRequestForm } from "./_components/edit-form";

interface EditRequestPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRequestPage({ params }: EditRequestPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) {
    notFound();
  }

  const userId = parseInt(session.user.id, 10);

  // Get request and verify ownership + pending status
  const requests = await db
    .select()
    .from(reportRequests)
    .where(
      and(
        eq(reportRequests.id, requestId),
        eq(reportRequests.requestedBy, userId),
        eq(reportRequests.status, "pending")
      )
    )
    .limit(1);

  if (requests.length === 0) {
    // Either not found, not owner, or not pending
    notFound();
  }

  const request = requests[0];

  // Format dates for form
  const formatDateForInput = (date: Date | null) => {
    if (!date) return null;
    return date.toISOString().split("T")[0];
  };

  const formattedRequest = {
    id: request.id,
    title: request.title,
    description: request.description,
    outputType: request.outputType,
    fileFormat: request.fileFormat,
    dateRangeType: request.dateRangeType,
    startDate: formatDateForInput(request.startDate),
    endDate: formatDateForInput(request.endDate),
    fiscalYearStart: request.fiscalYearStart,
    fiscalYearEnd: request.fiscalYearEnd,
    priority: request.priority,
    sourceSystem: request.sourceSystem,
    expectedDeadline: formatDateForInput(request.expectedDeadline),
    dataSource: request.dataSource,
    additionalNotes: request.additionalNotes,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href={`/requests/${request.id}`}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับไปหน้ารายละเอียด
        </Link>

        <EditRequestForm request={formattedRequest} />
      </main>
    </div>
  );
}
