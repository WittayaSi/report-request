import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUnratedCompletedRequests } from "@/app/actions/satisfaction.action";
import { RequireSatisfaction } from "@/components/require-satisfaction";
import { NewRequestForm } from "@/components/new-request-form";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Check for unrated completed requests
  const unratedRequests = await getUnratedCompletedRequests();

  return (
    <RequireSatisfaction unratedRequests={unratedRequests}>
      <NewRequestForm />
    </RequireSatisfaction>
  );
}
