import crypto from "crypto";
import { externalAuthPool } from "@/db/external-auth.db";
import type { RowDataPacket } from "mysql2";

// Interface ที่ match กับ hr_person table + hr_department join
export interface ExternalUser {
  hr_username: string;
  hr_password: string;
  hr_fname: string;
  hr_lname: string;
  hr_email: string | null;
  department_name: string | null;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
}

/**
 * Verify user credentials จาก External MySQL (hr_person table)
 * Password ใช้ MD5 hash
 * Join กับ hr_department เพื่อดึงชื่อแผนก
 */
export async function verifyExternalUser(
  username: string,
  password: string
): Promise<ExternalUser | null> {
  try {
    // Hash password ด้วย MD5
    const md5Hash = crypto.createHash("md5").update(password).digest("hex");

    const [rows] = await externalAuthPool.execute<RowDataPacket[]>(
      `SELECT 
        p.hr_username, 
        p.hr_password, 
        p.hr_fname, 
        p.hr_lname,
        p.hr_email,
        d.hr_department_name as department_name,
        p.telegram_bot_token,
        p.telegram_chat_id
      FROM hr_person p
      LEFT JOIN hr_department d ON p.hr_department_id = d.hr_department_id
      WHERE p.hr_username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return null;
    }

    const user = rows[0] as ExternalUser;

    // Compare MD5 hashes (case-insensitive comparison)
    if (user.hr_password.toLowerCase() !== md5Hash.toLowerCase()) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error verifying external user:", error);
    return null;
  }
}

