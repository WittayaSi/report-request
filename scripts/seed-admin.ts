import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local explicitly
config({ path: resolve(__dirname, "../.env.local") });

import crypto from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { localUsers } from "../src/db/app.schema";

async function seedAdminUser() {
  console.log("🌱 Seeding admin user...");

  // สร้าง connection pool
  const pool = mysql.createPool({
    host: process.env.MYSQL_APP_HOST,
    port: Number(process.env.MYSQL_APP_PORT) || 3306,
    user: process.env.MYSQL_APP_USER,
    password: process.env.MYSQL_APP_PASSWORD,
    database: process.env.MYSQL_APP_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const db = drizzle(pool, { mode: "default" });

  const adminUsername = "appadmin";
  const adminPassword = "Admin@11241";

  // Hash password ด้วย MD5 (เหมือนกับระบบ HR)
  const passwordHash = crypto.createHash("md5").update(adminPassword).digest("hex");

  try {
    // ตรวจสอบว่ามี admin user อยู่แล้วหรือไม่
    const existingAdmin = await db
      .select()
      .from(localUsers)
      .where(eq(localUsers.externalUsername, adminUsername))
      .limit(1);

    if (existingAdmin.length > 0) {
      // Update password hash ถ้ามีอยู่แล้ว
      await db
        .update(localUsers)
        .set({ 
          passwordHash: passwordHash,
          role: "ADMIN" 
        })
        .where(eq(localUsers.externalUsername, adminUsername));
      
      console.log("✅ Admin user updated!");
    } else {
      // สร้าง admin user ใหม่
      await db.insert(localUsers).values({
        externalUsername: adminUsername,
        name: "Application Administrator",
        department: "IT",
        passwordHash: passwordHash,
        role: "ADMIN",
      });
      
      console.log("✅ Admin user created!");
    }

    console.log("");
    console.log("📌 Admin Credentials:");
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ADMIN`);
    console.log("");
    console.log("🔐 คุณสามารถใช้ credentials นี้เข้าสู่ระบบและกำหนด role ให้ user อื่นได้");

  } finally {
    await pool.end();
  }

  process.exit(0);
}

seedAdminUser().catch((error) => {
  console.error("❌ Error seeding admin user:", error);
  process.exit(1);
});
