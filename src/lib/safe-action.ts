import { logger } from "./logger";

/**
 * Safe wrapper for server actions — catches all errors and returns
 * a user-friendly { error } instead of crashing.
 *
 * Usage:
 *   export async function myAction() {
 *     return safeAction(async () => {
 *       // ...your logic
 *       return { success: true };
 *     });
 *   }
 */
export async function safeAction<T>(
  fn: () => Promise<T>
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด";
      
    logger.error("SafeAction Error", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return { error: `เกิดข้อผิดพลาด: ${message}` };
  }
}
