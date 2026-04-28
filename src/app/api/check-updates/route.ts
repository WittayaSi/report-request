import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/app.db";
import { reportRequests, comments } from "@/db/app.schema";
import { gt, count } from "drizzle-orm";
import { apiLimiter } from "@/lib/rate-limit";

/**
 * Lightweight endpoint to check if there are updates since a given timestamp.
 * Returns only a count + latest timestamp — much cheaper than a full page refresh.
 *
 * Usage: GET /api/check-updates?since=2026-04-28T03:00:00Z&scope=all
 *   scope: "all" (admin) or "user" (requires userId param)
 */
export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rateCheck = apiLimiter(ip);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
      { status: 429 }
    );
  }

  // Auth check — prevent unauthenticated access
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  if (!since) {
    return NextResponse.json({ error: "Missing 'since' parameter" }, { status: 400 });
  }

  const sinceDate = new Date(since);

  try {
    // Count requests updated after 'since'
    const [requestUpdates] = await db
      .select({ count: count() })
      .from(reportRequests)
      .where(gt(reportRequests.updatedAt, sinceDate));

    // Count comments created after 'since'
    const [commentUpdates] = await db
      .select({ count: count() })
      .from(comments)
      .where(gt(comments.createdAt, sinceDate));

    const totalChanges =
      (requestUpdates?.count || 0) + (commentUpdates?.count || 0);

    return NextResponse.json({
      hasChanges: totalChanges > 0,
      changes: totalChanges,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check updates error:", error);
    return NextResponse.json({ hasChanges: false, changes: 0, checkedAt: new Date().toISOString() });
  }
}
