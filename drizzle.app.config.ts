import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default {
  schema: "./src/db/app.schema.ts",
  out: "./drizzle/app",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_APP_HOST!,
    port: Number(process.env.MYSQL_APP_PORT) || 3306,
    user: process.env.MYSQL_APP_USER!,
    password: process.env.MYSQL_APP_PASSWORD!,
    database: process.env.MYSQL_APP_DATABASE!,
  },
} satisfies Config;
