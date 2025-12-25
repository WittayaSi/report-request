import { toast } from "sonner";

type AsyncFunction<T> = () => Promise<T>;

interface SafeAsyncOptions {
  errorMessage?: string;
  showToast?: boolean;
  onError?: (error: unknown) => void;
}

/**
 * safeAsync - ห่อ async function เพื่อจัดการ error
 * ถ้าเกิด error จะ return null และแสดง toast (ถ้าเปิด)
 * 
 * @example
 * const data = await safeAsync(() => fetchData(), {
 *   errorMessage: "ไม่สามารถโหลดข้อมูลได้",
 *   showToast: true
 * });
 * 
 * if (data) {
 *   // use data
 * }
 */
export async function safeAsync<T>(
  fn: AsyncFunction<T>,
  options: SafeAsyncOptions = {}
): Promise<T | null> {
  const { 
    errorMessage = "เกิดข้อผิดพลาด", 
    showToast = true,
    onError 
  } = options;

  try {
    return await fn();
  } catch (error) {
    console.error("safeAsync error:", error);
    
    if (showToast) {
      toast.error(errorMessage, {
        description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
      });
    }
    
    onError?.(error);
    return null;
  }
}

/**
 * safeAction - สำหรับ Server Actions
 * Return object ที่มี success/error สำหรับ handle ใน client
 * 
 * @example
 * // In server action
 * export async function myAction() {
 *   return safeAction(async () => {
 *     // do something
 *     return { data: "result" };
 *   });
 * }
 */
export async function safeAction<T>(
  fn: AsyncFunction<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const result = await fn();
    return { success: true, data: result };
  } catch (error) {
    console.error("safeAction error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" 
    };
  }
}

/**
 * handleActionResult - จัดการผลลัพธ์จาก server action ใน client
 * แสดง toast และ return data ถ้าสำเร็จ
 * 
 * @example
 * const result = await myAction();
 * const data = handleActionResult(result, "ดำเนินการสำเร็จ");
 */
export function handleActionResult<T>(
  result: { success: true; data: T } | { success: false; error: string },
  successMessage?: string
): T | null {
  if (result.success) {
    if (successMessage) {
      toast.success(successMessage);
    }
    return result.data;
  } else {
    toast.error("เกิดข้อผิดพลาด", {
      description: result.error,
    });
    return null;
  }
}
