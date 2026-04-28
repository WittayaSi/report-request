"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles, X } from "lucide-react";

interface SmartRefreshProps {
  /**
   * Base polling interval in milliseconds (default: 30s).
   * The actual interval adapts based on whether changes were detected.
   */
  interval?: number;
  /**
   * Show a toast banner when new changes are detected.
   * Useful for admin pages to see "มีคำขอใหม่!" notifications.
   */
  showToast?: boolean;
  /**
   * Label for the toast banner (default: "มีข้อมูลอัปเดตใหม่")
   */
  toastLabel?: string;
}

interface UpdateInfo {
  hasChanges: boolean;
  changes: number;
  newRequests: number;
  newComments: number;
  statusChanges: number;
  checkedAt: string;
}

/**
 * Smart auto-refresh component that minimizes server load:
 *
 * 1. Uses Page Visibility API — stops polling when tab is hidden
 * 2. Refreshes immediately when tab regains focus (if stale)
 * 3. Polls a lightweight /api/check-updates endpoint first
 * 4. Only triggers full router.refresh() when data has actually changed
 * 5. Uses adaptive intervals: speeds up after detecting changes, slows down when idle
 * 6. Optionally shows a toast banner with specific change info
 */
export function AutoRefresh({
  interval = 30000,
  showToast = false,
  toastLabel,
}: SmartRefreshProps) {
  const router = useRouter();
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const consecutiveNoChangeRef = useRef<number>(0);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "info" | "new_request";
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show toast notification
  const showToastNotification = useCallback(
    (info: UpdateInfo) => {
      if (!showToast) return;

      let message = toastLabel || "มีข้อมูลอัปเดตใหม่";
      let type: "info" | "new_request" = "info";

      if (info.newRequests > 0) {
        message = `📢 มีคำขอใหม่ ${info.newRequests} รายการ!`;
        type = "new_request";
      } else if (info.newComments > 0) {
        message = `💬 มี Comment ใหม่ ${info.newComments} รายการ`;
      } else if (info.statusChanges > 0) {
        message = `🔄 มีการอัปเดตสถานะ ${info.statusChanges} รายการ`;
      }

      setToast({ visible: true, message, type });

      // Auto-hide after 6 seconds
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 6000);
    },
    [showToast, toastLabel]
  );

  // Check for updates via lightweight API
  const checkForUpdates = useCallback(async () => {
    // Skip if tab is not visible
    if (!isVisibleRef.current) return;

    try {
      const res = await fetch(
        `/api/check-updates?since=${encodeURIComponent(lastCheckRef.current)}`,
        { cache: "no-store" }
      );
      const data: UpdateInfo = await res.json();

      if (data.hasChanges) {
        // Data changed → show toast if enabled, then do a full refresh
        showToastNotification(data);
        lastCheckRef.current = data.checkedAt;
        consecutiveNoChangeRef.current = 0;
        router.refresh();
      } else {
        // No changes → track consecutive idle checks
        consecutiveNoChangeRef.current += 1;
        lastCheckRef.current = data.checkedAt;
      }
    } catch {
      // Network error — skip silently, try again next interval
    }
  }, [router, showToastNotification]);

  // Get adaptive interval: slow down when idle for a while
  const getAdaptiveInterval = useCallback(() => {
    const idle = consecutiveNoChangeRef.current;
    if (idle >= 10) return interval * 3; // 90s after 10 idle checks (~5 min)
    if (idle >= 5) return interval * 2; // 60s after 5 idle checks (~2.5 min)
    return interval; // 30s base
  }, [interval]);

  // Start/restart polling with adaptive interval
  const startPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const adaptiveInterval = getAdaptiveInterval();
    timerRef.current = setInterval(() => {
      checkForUpdates().then(() => {
        // Restart with new adaptive interval if it changed
        const newInterval = getAdaptiveInterval();
        if (newInterval !== adaptiveInterval) {
          startPolling();
        }
      });
    }, adaptiveInterval);
  }, [checkForUpdates, getAdaptiveInterval]);

  useEffect(() => {
    // --- Visibility change handler ---
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden → stop polling
        isVisibleRef.current = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        // Tab became visible → check immediately + restart polling
        isVisibleRef.current = true;
        consecutiveNoChangeRef.current = 0; // Reset idle counter
        checkForUpdates(); // Immediate check on focus
        startPolling();
      }
    };

    // --- Focus handler (also catches alt-tab back) ---
    const handleFocus = () => {
      if (isVisibleRef.current) {
        consecutiveNoChangeRef.current = 0;
        checkForUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Start initial polling
    startPolling();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (timerRef.current) clearInterval(timerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [checkForUpdates, startPolling]);

  // Render toast if visible
  if (!toast?.visible) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 ${
        toast.type === "new_request"
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25"
          : "bg-gradient-to-r from-slate-700 to-slate-800 shadow-lg shadow-slate-500/20"
      } text-white px-5 py-3 rounded-xl flex items-center gap-3 max-w-md`}
    >
      {toast.type === "new_request" ? (
        <Sparkles className="h-5 w-5 shrink-0 animate-pulse" />
      ) : (
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => setToast(null)}
        className="ml-1 shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
