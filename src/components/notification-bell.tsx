"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/actions/notification.action";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  link: string | null;
  isRead: "true" | "false";
  createdAt: Date;
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  }, []);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch full notifications when dropdown opens
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const data = await getNotifications(20);
      setNotifications(data as Notification[]);
    }
  };

  const handleClickNotification = (notification: Notification) => {
    if (notification.isRead === "false") {
      startTransition(async () => {
        await markNotificationAsRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: "true" as const } : n
          )
        );
      });
    }
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: "true" as const }))
      );
    });
  };

  // Format time ago
  const timeAgo = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "เมื่อสักครู่";
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[420px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">การแจ้งเตือน</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAllRead}
              disabled={isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[340px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleClickNotification(notification)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                  notification.isRead === "false" ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {notification.isRead === "false" ? (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.isRead === "false" ? "font-semibold" : "font-normal"}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>

                {notification.link && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
