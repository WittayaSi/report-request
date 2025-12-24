"use server";

import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { requestViews } from "@/db/app.schema";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markRequestAsViewed(requestId: number) {
  console.log("[markRequestAsViewed] Called with requestId:", requestId);
  
  const session = await auth();
  if (!session?.user?.id) {
    console.log("[markRequestAsViewed] No session, skipping");
    return;
  }

  const userId = parseInt(session.user.id, 10);
  console.log("[markRequestAsViewed] userId:", userId);

  // Upsert: Insert or Update viewedAt - use SQL NOW() for server time
  await db
    .insert(requestViews)
    .values({
      requestId,
      userId,
      viewedAt: sql`NOW()`,
    })
    .onDuplicateKeyUpdate({
      set: {
        viewedAt: sql`NOW()`,
      },
    });

  console.log("[markRequestAsViewed] Upsert completed, revalidating paths...");

  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  
  console.log("[markRequestAsViewed] Done!");
}
