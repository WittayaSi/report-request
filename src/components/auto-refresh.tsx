"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SmartRefreshProps {
  /**
   * Base polling interval in milliseconds (default: 30s).
   * The actual interval adapts based on whether changes were detected.
   */
  interval?: number;
}

/**
 * Smart auto-refresh component that minimizes server load:
 *
 * 1. Uses Page Visibility API — stops polling when tab is hidden
 * 2. Refreshes immediately when tab regains focus (if stale)
 * 3. Polls a lightweight /api/check-updates endpoint first
 * 4. Only triggers full router.refresh() when data has actually changed
 * 5. Uses adaptive intervals: speeds up after detecting changes, slows down when idle
 */
export function AutoRefresh({ interval = 30000 }: SmartRefreshProps) {
  const router = useRouter();
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const consecutiveNoChangeRef = useRef<number>(0);

  // Check for updates via lightweight API
  const checkForUpdates = useCallback(async () => {
    // Skip if tab is not visible
    if (!isVisibleRef.current) return;

    try {
      const res = await fetch(
        `/api/check-updates?since=${encodeURIComponent(lastCheckRef.current)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.hasChanges) {
        // Data changed → do a full refresh
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
  }, [router]);

  // Get adaptive interval: slow down when idle for a while
  const getAdaptiveInterval = useCallback(() => {
    const idle = consecutiveNoChangeRef.current;
    if (idle >= 10) return interval * 3; // 90s after 10 idle checks (~5 min)
    if (idle >= 5) return interval * 2;  // 60s after 5 idle checks (~2.5 min)
    return interval;                      // 30s base
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
    };
  }, [checkForUpdates, startPolling]);

  return null;
}
