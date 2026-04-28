import { NextResponse } from "next/server";
import { db } from "@/db/app.db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Check DB connection
    await db.execute(sql`SELECT 1`);
    
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      db: "disconnected",
      message: (error as Error).message
    }, { status: 503 });
  }
}
