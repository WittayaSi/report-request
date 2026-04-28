"use server";

import { db } from "@/db/app.db";
import { requestTemplates } from "@/db/app.schema";
import { auth } from "@/auth";
import { eq, or, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Get templates: user's own + public templates
export async function getTemplates() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = parseInt(session.user.id, 10);

  const templates = await db
    .select()
    .from(requestTemplates)
    .where(
      or(
        eq(requestTemplates.userId, userId),
        eq(requestTemplates.isPublic, "true")
      )
    )
    .orderBy(desc(requestTemplates.updatedAt));

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    isPublic: t.isPublic === "true",
    isOwner: t.userId === userId,
    templateData: JSON.parse(t.templateData),
  }));
}

// Create a new template
export async function createTemplate(name: string, data: Record<string, any>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = parseInt(session.user.id, 10);
  const isAdmin = session.user.role === "ADMIN";

  await db.insert(requestTemplates).values({
    name,
    userId,
    templateData: JSON.stringify(data),
    isPublic: isAdmin ? "true" : "false",
  });

  revalidatePath("/requests/new");
  return { success: true };
}

// Delete a template (only owner can delete)
export async function deleteTemplate(templateId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = parseInt(session.user.id, 10);

  await db
    .delete(requestTemplates)
    .where(
      and(
        eq(requestTemplates.id, templateId),
        eq(requestTemplates.userId, userId)
      )
    );

  revalidatePath("/requests/new");
  return { success: true };
}
