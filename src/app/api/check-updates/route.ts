import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/app.db";
import { reportRequests, comments } from "@/db/app.schema";
import { gt, count, and, eq } from "drizzle-orm";
import { apiLimiter } from "@/lib/rate-limit";

/**
 * Lightweight endpoint to check if there are updates since a given timestamp.
 * Returns granular change counts — much cheaper than a full page refresh.
 *
 * Usage: GET /api/check-updates?since=2026-04-28T03:00:00Z
 *
 * Response:
 *   {
 *     hasChanges: true,
 *     changes: 5,
 *     newRequests: 2,        // Requests created after 'since'
 *     newComments: 1,        // Comments created after 'since'
 *     statusChanges: 2,      // Requests with updatedAt > createdAt (status/assignment changes)
 *     checkedAt: "2026-04-28T03:01:00Z"
 *   }
 */
export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateCheck = apiLimiter(ip);
  if (!rateCheck.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
      },
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
    return NextResponse.json(
      { error: "Missing 'since' parameter" },
      { status: 400 }
    );
  }

  const sinceDate = new Date(since);

  try {
    // Count NEW requests created after 'since'
    const [newRequestCount] = await db
      .select({ count: count() })
      .from(reportRequests)
      .where(
        and(
          gt(reportRequests.createdAt, sinceDate),
          eq(reportRequests.isDeleted, false)
        )
      );

    // Count requests with STATUS/ASSIGNMENT changes (updatedAt > since, but createdAt <= since)
    // This catches status updates and assignment changes, excluding newly created requests
    const [statusChangeCount] = await db
      .select({ count: count() })
      .from(reportRequests)
      .where(
        and(
          gt(reportRequests.updatedAt, sinceDate),
          // Exclude newly created requests (they are counted separately above)
          // A request whose createdAt <= since but updatedAt > since = status/field change
          eq(reportRequests.isDeleted, false)
        )
      );

    // Count comments created after 'since'
    const [commentUpdates] = await db
      .select({ count: count() })
      .from(comments)
      .where(gt(comments.createdAt, sinceDate));

    const newRequests = newRequestCount?.count || 0;
    const newComments = commentUpdates?.count || 0;
    // statusChanges = all updated requests minus new requests (to avoid double-counting)
    const allUpdated = statusChangeCount?.count || 0;
    const statusChanges = Math.max(0, allUpdated - newRequests);

    const totalChanges = newRequests + newComments + statusChanges;

    return NextResponse.json({
      hasChanges: totalChanges > 0,
      changes: totalChanges,
      newRequests,
      newComments,
      statusChanges,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check updates error:", error);
    return NextResponse.json({
      hasChanges: false,
      changes: 0,
      newRequests: 0,
      newComments: 0,
      statusChanges: 0,
      checkedAt: new Date().toISOString(),
    });
  }
}
