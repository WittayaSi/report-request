import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { localUsers } from "@/db/app.schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);

  const [user] = await db
    .select({
      email: localUsers.email,
      emailNotificationsEnabled: localUsers.emailNotificationsEnabled,
    })
    .from(localUsers)
    .where(eq(localUsers.id, userId))
    .limit(1);

  return NextResponse.json({
    email: user?.email || null,
    emailNotificationsEnabled: user?.emailNotificationsEnabled || "false",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  const body = await request.json();
  const { email, emailNotificationsEnabled } = body;

  await db
    .update(localUsers)
    .set({
      email: email || null,
      emailNotificationsEnabled: emailNotificationsEnabled ? "true" : "false",
    })
    .where(eq(localUsers.id, userId));

  return NextResponse.json({ success: true });
}
