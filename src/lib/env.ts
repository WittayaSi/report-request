import { z } from "zod";

/**
 * Validates all required environment variables at startup.
 * Import this in your root layout or app entry point.
 * Throws immediately if any required variable is missing.
 */

const envSchema = z.object({
  // Auth
  AUTH_SECRET: z.string().min(10, "AUTH_SECRET must be at least 10 characters"),

  // App MySQL
  MYSQL_APP_HOST: z.string().min(1, "MYSQL_APP_HOST is required"),
  MYSQL_APP_PORT: z.string().optional().default("3306"),
  MYSQL_APP_USER: z.string().min(1, "MYSQL_APP_USER is required"),
  MYSQL_APP_PASSWORD: z.string().min(1, "MYSQL_APP_PASSWORD is required"),
  MYSQL_APP_DATABASE: z.string().min(1, "MYSQL_APP_DATABASE is required"),

  // External Auth MySQL
  MYSQL_AUTH_HOST: z.string().min(1, "MYSQL_AUTH_HOST is required"),
  MYSQL_AUTH_PORT: z.string().optional().default("3306"),
  MYSQL_AUTH_USER: z.string().min(1, "MYSQL_AUTH_USER is required"),
  MYSQL_AUTH_PASSWORD: z.string().min(1, "MYSQL_AUTH_PASSWORD is required"),
  MYSQL_AUTH_DATABASE: z.string().min(1, "MYSQL_AUTH_DATABASE is required"),

  // App
  NEXT_PUBLIC_BASE_URL: z.string().url("NEXT_PUBLIC_BASE_URL must be a valid URL"),

  // Optional services
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validated = false;

export function validateEnv(): Env {
  if (validated) return envSchema.parse(process.env);
  
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error("❌ Invalid environment variables:");
    for (const [key, messages] of Object.entries(errors)) {
      console.error(`  ${key}: ${messages?.join(", ")}`);
    }
    throw new Error(
      `Invalid environment variables: ${Object.keys(errors).join(", ")}. Check your .env.local file.`
    );
  }

  validated = true;
  console.log("✅ Environment variables validated");
  return result.data;
}

// Auto-validate on import in server context
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    // In development, log warning but don't crash
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Env validation warning:", (error as Error).message);
    } else {
      throw error; // In production, crash hard
    }
  }
}
