import { auth } from "@/auth";
import { db } from "@/db/app.db";
import { localUsers } from "@/db/app.schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Shield, User as UserIcon } from "lucide-react";
import { RoleUpdateButton } from "./_components/role-update-button";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await db
    .select()
    .from(localUsers)
    .orderBy(desc(localUsers.createdAt));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">จัดการผู้ใช้</h1>
            <p className="text-muted-foreground">
              ผู้ใช้ทั้งหมด {users.length} คน
            </p>
          </div>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>รายการผู้ใช้</CardTitle>
            <CardDescription>คลิกที่ Role เพื่อเปลี่ยน</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>ยังไม่มีผู้ใช้ในระบบ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.role === "ADMIN" ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.name || user.externalUsername}</p>
                        <p className="text-sm text-muted-foreground">
                          @{user.externalUsername}
                          {user.department && ` • ${user.department}`}
                        </p>
                      </div>
                    </div>
                    <RoleUpdateButton
                      userId={user.id}
                      currentRole={user.role}
                      username={user.externalUsername}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
