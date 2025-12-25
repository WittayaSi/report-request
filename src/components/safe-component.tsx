"use client";

import { ReactNode, Suspense } from "react";
import { ErrorBoundary } from "./error-boundary";
import { Loader2 } from "lucide-react";

interface SafeComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * SafeComponent - ห่อ component เพื่อจัดการ error และ loading
 * 
 * @example
 * <SafeComponent>
 *   <SomeComponent />
 * </SafeComponent>
 */
export function SafeComponent({ 
  children, 
  fallback,
  loadingFallback 
}: SafeComponentProps) {
  const defaultLoading = (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={loadingFallback || defaultLoading}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
