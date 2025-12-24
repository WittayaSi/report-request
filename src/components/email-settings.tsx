"use client";

import { useState, useEffect, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Check, Mail } from "lucide-react";

interface EmailSettingsData {
  email: string | null;
  emailNotificationsEnabled: string;
}

export function EmailSettings() {
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<EmailSettingsData | null>(null);
  const [email, setEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/user/email-settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setEmail(data.email || "");
          setNotificationsEnabled(data.emailNotificationsEnabled === "true");
        }
      } catch (err) {
        console.error("Failed to fetch email settings:", err);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = () => {
    setError("");
    setSaved(false);

    // Basic email validation
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("รูปแบบ Email ไม่ถูกต้อง");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/email-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            emailNotificationsEnabled: notificationsEnabled,
          }),
        });

        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } else {
          const data = await res.json();
          setError(data.error || "บันทึกไม่สำเร็จ");
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาด");
      }
    });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          ระบบจะส่งการแจ้งเตือนไปที่ Email นี้
        </p>
      </div>

      {/* Enable Notifications Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>เปิดการแจ้งเตือน Email</Label>
          <p className="text-xs text-muted-foreground">
            รับแจ้งเตือนเมื่อมีความเปลี่ยนแปลงในคำขอของคุณ
          </p>
        </div>
        <Switch
          checked={notificationsEnabled}
          onCheckedChange={setNotificationsEnabled}
          disabled={!email}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saved ? "บันทึกแล้ว!" : "บันทึก"}
      </Button>
    </div>
  );
}
