import { useEffect, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MASTER_ADMIN_EMAIL, useCurrentUser, type AuthUser } from "@/lib/auth";

export { MASTER_ADMIN_EMAIL };

export interface AdminRouteProps {
  user?: AuthUser | { email?: string | null; [key: string]: unknown } | null;
  children: ReactNode;
}

/**
 * AdminRoute Guard
 * Protects administrative routes by enforcing the designated master admin email check.
 * If the active user does not match MASTER_ADMIN_EMAIL ('reply.stagepro@gmail.com'),
 * they are smoothly redirected back to the main app feed (/feed).
 */
export default function AdminRoute({ user, children }: AdminRouteProps) {
  const { user: currentAuthUser, loading } = useCurrentUser();

  // Prefer explicit user prop if provided, otherwise fall back to authenticated context user
  const effectiveUser = user !== undefined ? user : currentAuthUser;

  // 1. Check if user is logged in and matches the master admin email
  const isAuthorized = Boolean(
    effectiveUser &&
    effectiveUser.email &&
    effectiveUser.email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase(),
  );

  // If we're relying on internal hook state, wait for session resolution before redirecting
  const isResolving = user === undefined && loading;

  useEffect(() => {
    if (!isResolving && !isAuthorized) {
      toast.error("Access Restricted", {
        description: `Master admin privileges required (${MASTER_ADMIN_EMAIL}). Redirected to feed.`,
      });
    }
  }, [isAuthorized, isResolving]);

  if (isResolving) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Verifying admin credentials…</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // Redirect unauthorized users smoothly back to the main app feed
    return <Navigate to="/feed" replace />;
  }

  // Render the admin panel if authorization passes
  return <>{children}</>;
}

export { AdminRoute };
