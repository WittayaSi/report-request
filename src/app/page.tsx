import Link from "next/link";
import { FileText, ClipboardList, Shield, Zap, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
            <Zap className="h-4 w-4" />
            ระบบจัดการคำขอรายงาน
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
            Report Request
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              System
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            ระบบขอรายงานออนไลน์ ติดตามสถานะได้ทุกที่ทุกเวลา
            ช่วยให้การทำงานง่ายและรวดเร็วยิ่งขึ้น
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                  >
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    ไปที่ Dashboard
                  </Button>
                </Link>
                <Link href="/requests/new">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    สร้างคำขอใหม่
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                  >
                    เข้าสู่ระบบ
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Welcome message for logged in users */}
          {isLoggedIn && (
            <p className="text-sm text-muted-foreground pt-2">
              ยินดีต้อนรับคุณ {session.user.name} 👋
            </p>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<ClipboardList className="h-8 w-8" />}
            title="ส่งคำของ่ายๆ"
            description="กรอกแบบฟอร์มออนไลน์ ส่งคำขอรายงานได้ทันที ไม่ต้องเดินเอกสาร"
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8" />}
            title="ติดตามสถานะ"
            description="ตรวจสอบความคืบหน้าได้ตลอด 24 ชั่วโมง พร้อมรับแจ้งเตือนทันที"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="ปลอดภัย"
            description="ระบบยืนยันตัวตนผ่านบัญชีผู้ใช้ขององค์กร ข้อมูลปลอดภัย"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          © {new Date().getFullYear()} Report Request System. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
