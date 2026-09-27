import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AuthUser } from "@/lib/auth";

export interface AdminRouteProps {
  user?: AuthUser | { email?: string | null; [key: string]: unknown } | null;
  children: ReactNode;
}

export function AdminRoute({ user, children }: AdminRouteProps) {
  const { user: currentAuthUser, loading } = useCurrentUser();
  const [checking, setChecking] = useState(user === undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user !== undefined) {
      setIsAdmin(user?.role === "admin");
      setChecking(false);
      return;
    }
    let cancelled = false;
    void (supabase as any).rpc("get_my_admin_status").then(({ data, error }: any) => {
      if (cancelled) return;
      if (error) toast.error("Could not verify admin access");
      setIsAdmin(data === true);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checking) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="text-xs text-muted-foreground">Verifying admin access…</p></div></div>;
  }

  if (!currentAuthUser && user === undefined) return <Navigate to="/feed" replace />;
  if (!isAdmin) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

export default AdminRoute;
