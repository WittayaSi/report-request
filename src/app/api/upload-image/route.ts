import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "images");

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Checking MIME Type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File is not an image" }, { status: 400 });
    }

    // Ensure directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "png";
    const filename = `${uuidv4()}.${ext}`;
    const filePath = join(UPLOAD_DIR, filename);

    await writeFile(filePath, buffer);

    // Return the URL to access the written file
    return NextResponse.json({ url: `/uploads/images/${filename}` });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
