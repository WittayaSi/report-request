"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, MessageCircle, Bot, Key } from "lucide-react";
import {
  getTelegramSettings,
  updateTelegramSettings,
  testTelegramConnection,
} from "@/app/actions/telegram.action";

export function TelegramSettings() {
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const settings = await getTelegramSettings();
      if (settings) {
        setBotToken(settings.telegramBotToken || "");
        setChatId(settings.telegramChatId || "");
        setEnabled(settings.telegramNotificationsEnabled === "true");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateTelegramSettings(
        botToken || null,
        chatId || null,
        enabled
      );
      if (result.error) {
        toast.error("บันทึกไม่สำเร็จ", { description: result.error });
      } else {
        toast.success("บันทึกการตั้งค่าแล้ว");
        router.refresh();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!botToken || !chatId) {
      toast.error("กรุณากรอก Bot Token และ Chat ID");
      return;
    }

    setTesting(true);
    try {
      const result = await testTelegramConnection(botToken, chatId);
      if (result.error) {
        toast.error("ทดสอบไม่สำเร็จ", { description: result.error });
      } else {
        toast.success("ส่งข้อความทดสอบแล้ว!", {
          description: "ตรวจสอบข้อความใน Telegram ของคุณ",
        });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable switch */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="telegram-enabled">เปิดใช้งานการแจ้งเตือน</Label>
          <p className="text-sm text-muted-foreground">
            รับการแจ้งเตือนผ่าน Telegram Bot ของคุณ
          </p>
        </div>
        <Switch
          id="telegram-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Bot Token input */}
      <div className="space-y-2">
        <Label htmlFor="bot-token" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Bot Token
          {botToken && <span className="text-xs text-blue-500 font-normal">(ซิงค์จากระบบ HR)</span>}
        </Label>
        <Input
          id="bot-token"
          type="password"
          placeholder="เช่น 1234567890:ABCdefGHIjklmnopQRSTuvwxyz"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          disabled={!!botToken} // Disable if value exists (synced)
        />
        {!botToken && (
          <p className="text-xs text-muted-foreground">
            สร้าง Bot ผ่าน @BotFather แล้ว copy token มาวางที่นี่
          </p>
        )}
      </div>

      {/* Chat ID input */}
      <div className="space-y-2">
        <Label htmlFor="chat-id" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Chat ID
          {chatId && <span className="text-xs text-blue-500 font-normal">(ซิงค์จากระบบ HR)</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id="chat-id"
            placeholder="เช่น 123456789"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            disabled={!!chatId} // Disable if value exists (synced)
          />
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !botToken || !chatId}
            title="ทดสอบส่งข้อความ"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!chatId && (
          <p className="text-xs text-muted-foreground">
            ส่งข้อความหา @userinfobot แล้ว copy ตัวเลข Id มาวางที่นี่
          </p>
        )}
      </div>

      {/* Notification info */}
      <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
        <p className="font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          การแจ้งเตือนที่จะได้รับ:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>เมื่อสถานะคำขอเปลี่ยนแปลง</li>
          <li>เมื่อมีความคิดเห็นใหม่</li>
          {enabled && botToken && chatId ? (
            <li className="text-green-600">✓ พร้อมรับการแจ้งเตือน</li>
          ) : (
            <li className="text-orange-600">○ ยังไม่ได้ตั้งค่าครบ หรือยังไม่เปิดใช้งาน</li>
          )}
        </ul>
      </div>

      {/* How to setup guide (Show only if missing info) */}
      {(!botToken || !chatId) && (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p className="font-medium">📖 วิธีตั้งค่า:</p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1">
            <li>ส่ง /newbot หา @BotFather ใน Telegram</li>
            <li>ตั้งชื่อ Bot แล้ว copy Token มาวางช่อง Bot Token</li>
            <li>ส่งข้อความหา @userinfobot แล้ว copy Id มาวางช่อง Chat ID</li>
            <li>กดปุ่มทดสอบ แล้วดูว่าได้รับข้อความไหม</li>
            <li>เปิดใช้งาน แล้วกดบันทึก</li>
          </ol>
        </div>
      )}

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            กำลังบันทึก...
          </>
        ) : (
          "บันทึกการตั้งค่า"
        )}
      </Button>
    </div>
  );
}
