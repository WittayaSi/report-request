import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/db/app.schema";

// Connection pool สำหรับ App MySQL
// Force MySQL session to use UTC timezone
// This ensures mysql2 correctly interprets timestamps
// We then convert to Bangkok time in formatThaiDateTime
const appPool = mysql.createPool({
  host: process.env.MYSQL_APP_HOST,
  port: Number(process.env.MYSQL_APP_PORT) || 3306,
  user: process.env.MYSQL_APP_USER,
  password: process.env.MYSQL_APP_PASSWORD,
  database: process.env.MYSQL_APP_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00", // Force UTC session
});

export const db = drizzle(appPool, { schema, mode: "default" });
