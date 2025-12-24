import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Building2, Shield, ArrowLeft, Bell, Mail } from "lucide-react";
import Link from "next/link";
import { TelegramSettings } from "@/components/telegram-settings";
import { EmailSettings } from "@/components/email-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับไปหน้า Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">ตั้งค่า</h1>
          <p className="text-muted-foreground">จัดการข้อมูลบัญชีของคุณ</p>
        </div>

        {/* Profile Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              ข้อมูลผู้ใช้
            </CardTitle>
            <CardDescription>
              ข้อมูลของคุณในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm text-muted-foreground">Username</span>
              <span className="col-span-2 font-medium">{user.username}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm text-muted-foreground">ชื่อ-นามสกุล</span>
              <span className="col-span-2 font-medium">{user.name}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm text-muted-foreground">แผนก</span>
              <span className="col-span-2 font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {user.department || "-"}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm text-muted-foreground">สิทธิ์</span>
              <span className="col-span-2 font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {user.role === "ADMIN" ? (
                  <span className="text-blue-600 dark:text-blue-400">
                    ผู้ดูแลระบบ (Admin)
                  </span>
                ) : (
                  <span>ผู้ใช้ทั่วไป</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              การแจ้งเตือน Email
            </CardTitle>
            <CardDescription>
              ตั้งค่าการรับการแจ้งเตือนผ่าน Email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailSettings />
          </CardContent>
        </Card>

        {/* Telegram Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              การแจ้งเตือน Telegram
            </CardTitle>
            <CardDescription>
              ตั้งค่าการรับการแจ้งเตือนผ่าน Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TelegramSettings />
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>หมายเหตุ:</strong> ข้อมูลเหล่านี้ถูกดึงมาจากระบบ HR ขององค์กร 
              หากต้องการแก้ไขข้อมูลส่วนตัว กรุณาติดต่อฝ่ายบุคคล
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
