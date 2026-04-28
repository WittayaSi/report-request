"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/app.db";
import { satisfactionRatings, reportRequests, localUsers } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, sql, desc, asc, and } from "drizzle-orm";
import { logAudit } from "./audit.action";

// Check if user has any unrated completed requests
export async function getUnratedCompletedRequests(userId?: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const targetUserId = userId || parseInt(session.user.id, 10);

  // Find completed requests by this user that don't have a satisfaction rating
  const unratedRequests = await db
    .select({
      id: reportRequests.id,
      title: reportRequests.title,
      createdAt: reportRequests.createdAt,
    })
    .from(reportRequests)
    .leftJoin(satisfactionRatings, eq(reportRequests.id, satisfactionRatings.requestId))
    .where(
      and(
        eq(reportRequests.requestedBy, targetUserId),
        eq(reportRequests.status, "completed"),
        sql`${satisfactionRatings.id} IS NULL`
      )
    )
    .orderBy(desc(reportRequests.createdAt));

  return unratedRequests;
}

// Check if a specific request has been rated
export async function isRequestRated(requestId: number): Promise<boolean> {
  const rating = await db
    .select({ id: satisfactionRatings.id })
    .from(satisfactionRatings)
    .where(eq(satisfactionRatings.requestId, requestId))
    .limit(1);

  return rating.length > 0;
}

// Validation Schema
const satisfactionSchema = z.object({
  requestId: z.number(),
  overallRating: z.enum(["1", "2", "3", "4", "5"]),
  speedRating: z.enum(["1", "2", "3", "4", "5"]).optional(),
  accuracyRating: z.enum(["1", "2", "3", "4", "5"]).optional(),
  easeOfUseRating: z.enum(["1", "2", "3", "4", "5"]).optional(),
  communicationRating: z.enum(["1", "2", "3", "4", "5"]).optional(),
  comment: z.string().optional(),
});

export type SatisfactionInput = z.infer<typeof satisfactionSchema>;

// Submit satisfaction rating
export async function submitSatisfactionRating(input: SatisfactionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "กรุณาเข้าสู่ระบบ" };
  }

  const userId = parseInt(session.user.id, 10);

  // Validate input
  const validatedFields = satisfactionSchema.safeParse(input);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const data = validatedFields.data;

  // Verify request exists and is completed
  const request = await db
    .select({
      id: reportRequests.id,
      status: reportRequests.status,
      requestedBy: reportRequests.requestedBy,
    })
    .from(reportRequests)
    .where(eq(reportRequests.id, data.requestId))
    .limit(1);

  if (request.length === 0) {
    return { error: "ไม่พบคำขอนี้" };
  }

  if (request[0].requestedBy !== userId) {
    return { error: "คุณไม่มีสิทธิ์ประเมินคำขอนี้" };
  }

  if (request[0].status !== "completed") {
    return { error: "สามารถประเมินได้เฉพาะคำขอที่เสร็จสิ้นแล้วเท่านั้น" };
  }

  // Check if already rated
  const existing = await db
    .select({ id: satisfactionRatings.id })
    .from(satisfactionRatings)
    .where(eq(satisfactionRatings.requestId, data.requestId))
    .limit(1);

  try {
    if (existing.length > 0) {
      // Update existing rating
      await db
        .update(satisfactionRatings)
        .set({
          overallRating: data.overallRating,
          speedRating: data.speedRating || null,
          accuracyRating: data.accuracyRating || null,
          easeOfUseRating: data.easeOfUseRating || null,
          communicationRating: data.communicationRating || null,
          comment: data.comment || null,
        })
        .where(eq(satisfactionRatings.requestId, data.requestId));
    } else {
      // Insert new rating
      await db.insert(satisfactionRatings).values({
        requestId: data.requestId,
        userId,
        overallRating: data.overallRating,
        speedRating: data.speedRating || null,
        accuracyRating: data.accuracyRating || null,
        easeOfUseRating: data.easeOfUseRating || null,
        communicationRating: data.communicationRating || null,
        comment: data.comment || null,
      });
    }

    // Log Audit
    await logAudit({
      userId,
      action: existing.length > 0 ? "UPDATE_SATISFACTION" : "CREATE_SATISFACTION",
      resourceType: "SATISFACTION",
      resourceId: data.requestId.toString(),
      details: {
        overallRating: data.overallRating,
        hasComment: !!data.comment,
      },
    });

    revalidatePath(`/requests/${data.requestId}`);
    return { success: true };
  } catch (error) {
    console.error("Error submitting satisfaction:", error);
    return { error: "เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง" };
  }
}

// Get satisfaction rating for a request
export async function getSatisfactionByRequestId(requestId: number) {
  const satisfaction = await db
    .select({
      id: satisfactionRatings.id,
      requestId: satisfactionRatings.requestId,
      userId: satisfactionRatings.userId,
      overallRating: satisfactionRatings.overallRating,
      speedRating: satisfactionRatings.speedRating,
      accuracyRating: satisfactionRatings.accuracyRating,
      easeOfUseRating: satisfactionRatings.easeOfUseRating,
      communicationRating: satisfactionRatings.communicationRating,
      comment: satisfactionRatings.comment,
      createdAt: satisfactionRatings.createdAt,
      updatedAt: satisfactionRatings.updatedAt,
    })
    .from(satisfactionRatings)
    .where(eq(satisfactionRatings.requestId, requestId))
    .limit(1);

  return satisfaction[0] || null;
}

// Get satisfaction stats for Admin Dashboard
export async function getSatisfactionStats() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  // Get overall stats
  const overallStats = await db
    .select({
      totalRatings: sql<number>`count(*)`,
      avgOverall: sql<number>`AVG(CAST(overall_rating AS DECIMAL(10, 2)))`,
      avgSpeed: sql<number>`AVG(CAST(speed_rating AS DECIMAL(10, 2)))`,
      avgAccuracy: sql<number>`AVG(CAST(accuracy_rating AS DECIMAL(10, 2)))`,
      avgEaseOfUse: sql<number>`AVG(CAST(ease_of_use_rating AS DECIMAL(10, 2)))`,
      avgCommunication: sql<number>`AVG(CAST(communication_rating AS DECIMAL(10, 2)))`,
    })
    .from(satisfactionRatings);

  // Get rating distribution
  const distribution = await db
    .select({
      rating: satisfactionRatings.overallRating,
      count: sql<number>`count(*)`,
    })
    .from(satisfactionRatings)
    .groupBy(satisfactionRatings.overallRating);

  // Get top rated requests (5 stars)
  const topRated = await db
    .select({
      requestId: satisfactionRatings.requestId,
      title: reportRequests.title,
      overallRating: satisfactionRatings.overallRating,
      userName: localUsers.name,
    })
    .from(satisfactionRatings)
    .leftJoin(reportRequests, eq(satisfactionRatings.requestId, reportRequests.id))
    .leftJoin(localUsers, eq(satisfactionRatings.userId, localUsers.id))
    .where(eq(satisfactionRatings.overallRating, "5"))
    .orderBy(desc(satisfactionRatings.createdAt))
    .limit(5);

  // Get lowest rated requests (1-2 stars)
  const lowestRated = await db
    .select({
      requestId: satisfactionRatings.requestId,
      title: reportRequests.title,
      overallRating: satisfactionRatings.overallRating,
      comment: satisfactionRatings.comment,
      userName: localUsers.name,
    })
    .from(satisfactionRatings)
    .leftJoin(reportRequests, eq(satisfactionRatings.requestId, reportRequests.id))
    .leftJoin(localUsers, eq(satisfactionRatings.userId, localUsers.id))
    .where(sql`${satisfactionRatings.overallRating} IN ('1', '2')`)
    .orderBy(asc(satisfactionRatings.overallRating), desc(satisfactionRatings.createdAt))
    .limit(5);

  const stats = overallStats[0];

  return {
    totalRatings: stats?.totalRatings || 0,
    averages: {
      overall: stats?.avgOverall ? Number(Number(stats.avgOverall).toFixed(2)) : 0,
      speed: stats?.avgSpeed ? Number(Number(stats.avgSpeed).toFixed(2)) : 0,
      accuracy: stats?.avgAccuracy ? Number(Number(stats.avgAccuracy).toFixed(2)) : 0,
      easeOfUse: stats?.avgEaseOfUse ? Number(Number(stats.avgEaseOfUse).toFixed(2)) : 0,
      communication: stats?.avgCommunication ? Number(Number(stats.avgCommunication).toFixed(2)) : 0,
    },
    distribution: distribution.map((d) => ({
      rating: d.rating,
      count: d.count,
    })),
    topRated,
    lowestRated,
  };
}
