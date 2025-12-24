"use client";

import { useEffect } from "react";
import { markRequestAsViewed } from "@/app/actions/view.action";

interface MarkAsViewedProps {
  requestId: number;
}

export function MarkAsViewed({ requestId }: MarkAsViewedProps) {
  useEffect(() => {
    markRequestAsViewed(requestId);
  }, [requestId]);

  return null;
}
