import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const CP_AUTH_USER_KEY = "cp_auth_user";
export const AUTH_CHANGE_EVENT = "cp_auth_changed";

export interface AuthUser {
  id: string;
  email: string | null;
  name?: string;
  role?: "admin" | "user" | string;
}

/** Retrieve currently stored user from localStorage */
export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CP_AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Persist user to localStorage and dispatch event */
export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(CP_AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CP_AUTH_USER_KEY);
  }
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: user }));
}

/**
 * Hook providing the reactive current user, loading state,
 * and quick login/logout controls for master admin and student accounts.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(true);

  const syncUser = useCallback(() => {
    const local = getStoredUser();
    setUser(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    syncUser();

    // Use Supabase Auth as the source of truth. Anonymous sessions keep Circle Panda
    // private-by-default while still giving every device a real database identity.
    void supabase.auth
      .getSession()
      .then(async ({ data: sessionData }) => {
        if (!sessionData.session) {
          const { data } = await supabase.auth.signInAnonymously();
          if (data.user) {
            const supaUser: AuthUser = { id: data.user.id, email: null, name: "You (anonymous)", role: "user" };
            setStoredUser(supaUser);
            setUser(supaUser);
          }
        }
      })
      .catch(() => {})
      .then(() => supabase.auth
      .getUser())
      .then(({ data }) => {
        if (data?.user?.email) {
          const supaUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: (data.user.user_metadata?.["name"] as string) || data.user.email.split("@")[0],
            role: "user",
          };
          setStoredUser(supaUser);
          setUser(supaUser);
        }
      })
      .catch(() => {
        // Fallback to local session
      })
      .finally(() => {
        setLoading(false);
      });

    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<AuthUser | null>;
      setUser(customEvent.detail ?? getStoredUser());
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener("storage", syncUser);
    };
  }, [syncUser]);

  const logout = useCallback(() => {
    setStoredUser(null);
    setUser(null);
    void supabase.auth.signOut().catch(() => {});
  }, []);

  return {
    user,
    loading,
    logout,
  };
}
