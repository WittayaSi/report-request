"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  interval?: number; // in milliseconds
}

/**
 * Client component that refreshes the page at regular intervals
 * to check for new updates (e.g., new comments).
 */
export function AutoRefresh({ interval = 30000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(refreshInterval);
  }, [router, interval]);

  return null;
}
