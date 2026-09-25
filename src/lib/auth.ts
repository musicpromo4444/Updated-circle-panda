import { useEffect, useState, useCallback } from "react";
import { supabase, hasSupabaseConfig } from "@/integrations/supabase/client";

/** Your designated master admin email */
export const MASTER_ADMIN_EMAIL = "reply.stagepro@gmail.com";

export const CP_AUTH_USER_KEY = "cp_auth_user";
export const AUTH_CHANGE_EVENT = "cp_auth_changed";

export interface AuthUser {
  id: string;
  email: string | null;
  name?: string;
  role?: "admin" | "user" | string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  handle: string;
  avatar: string;
  role: string;
  coins: number;
  reputation: number;
  level: number;
  xp: number;
  is_vip: boolean;
  vip_expires_at: string | null;
  last_spin_at: string | null;
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

/** Check if a given user object has authorized master admin rights */
export function isMasterAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Hook providing the reactive current user, loading state,
 * profile data from Supabase, and real login/signup/logout controls.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isSupabaseReady = hasSupabaseConfig();

  const fetchProfile = useCallback(async (userId: string) => {
    if (!hasSupabaseConfig()) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
      }
    } catch {
      // Fallback
    }
  }, []);

  const syncUser = useCallback(() => {
    const local = getStoredUser();
    setUser(local);
  }, []);

  useEffect(() => {
    syncUser();

    if (!isSupabaseReady) {
      setLoading(false);
      return;
    }

    // 1. Initial getSession check
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const supaUser: AuthUser = {
          id: u.id,
          email: u.email ?? null,
          name:
            (u.user_metadata?.["handle"] as string) ||
            (u.user_metadata?.["name"] as string) ||
            u.email?.split("@")[0] ||
            "Panda User",
          role: u.email === MASTER_ADMIN_EMAIL ? "admin" : "user",
        };
        setStoredUser(supaUser);
        setUser(supaUser);
        void fetchProfile(u.id);
      } else {
        const local = getStoredUser();
        if (local && local.id.startsWith("usr_")) {
          // guest mock user retained
        }
      }
      setLoading(false);
    });

    // 2. Auth state subscription
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = session.user;
        const supaUser: AuthUser = {
          id: u.id,
          email: u.email ?? null,
          name:
            (u.user_metadata?.["handle"] as string) ||
            (u.user_metadata?.["name"] as string) ||
            u.email?.split("@")[0] ||
            "Panda User",
          role: u.email === MASTER_ADMIN_EMAIL ? "admin" : "user",
        };
        setStoredUser(supaUser);
        setUser(supaUser);
        void fetchProfile(u.id);
      } else if (event === "SIGNED_OUT") {
        setStoredUser(null);
        setUser(null);
        setProfile(null);
      }
    });

    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<AuthUser | null>;
      setUser(customEvent.detail ?? getStoredUser());
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener("storage", syncUser);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener("storage", syncUser);
    };
  }, [fetchProfile, isSupabaseReady, syncUser]);

  // Real Supabase Sign Up with email, password & handle
  const signUpWithPassword = useCallback(
    async (email: string, pass: string, handle?: string) => {
      const cleanEmail = email.trim();
      if (!isSupabaseReady) {
        // Fallback local registration when env vars are pending
        const newUser: AuthUser = {
          id: `usr_${Date.now()}`,
          email: cleanEmail,
          name: handle || cleanEmail.split("@")[0] || "Panda",
          role: cleanEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
        };
        setStoredUser(newUser);
        setUser(newUser);
        return { data: { user: newUser }, error: null };
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            handle: handle || cleanEmail.split("@")[0],
            name: handle || cleanEmail.split("@")[0],
          },
        },
      });

      if (error) return { data: null, error };

      if (data.user) {
        const supaUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? cleanEmail,
          name: handle || cleanEmail.split("@")[0],
          role: cleanEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
        };
        setStoredUser(supaUser);
        setUser(supaUser);
        void fetchProfile(data.user.id);
      }

      return { data, error: null };
    },
    [fetchProfile, isSupabaseReady],
  );

  // Real Supabase Sign In with email & password
  const signInWithPassword = useCallback(
    async (email: string, pass: string) => {
      const cleanEmail = email.trim();
      if (!isSupabaseReady) {
        const newUser: AuthUser = {
          id: `usr_${Date.now()}`,
          email: cleanEmail,
          name: cleanEmail.split("@")[0] || "User",
          role: cleanEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
        };
        setStoredUser(newUser);
        setUser(newUser);
        return { data: { user: newUser }, error: null };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) return { data: null, error };

      if (data.user) {
        const supaUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? cleanEmail,
          name:
            (data.user.user_metadata?.["handle"] as string) ||
            (data.user.user_metadata?.["name"] as string) ||
            cleanEmail.split("@")[0],
          role: cleanEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
        };
        setStoredUser(supaUser);
        setUser(supaUser);
        void fetchProfile(data.user.id);
      }

      return { data, error: null };
    },
    [fetchProfile, isSupabaseReady],
  );

  const loginWithEmail = useCallback((email: string, name?: string) => {
    const cleanEmail = email.trim();
    const newUser: AuthUser = {
      id: `usr_${Date.now()}`,
      email: cleanEmail,
      name: name || cleanEmail.split("@")[0] || "User",
      role: cleanEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
    };
    setStoredUser(newUser);
    setUser(newUser);
    return newUser;
  }, []);

  const loginAsMasterAdmin = useCallback(() => {
    const adminUser: AuthUser = {
      id: "master_admin_stagepro",
      email: MASTER_ADMIN_EMAIL,
      name: "StagePro Master Admin",
      role: "admin",
    };
    setStoredUser(adminUser);
    setUser(adminUser);
    return adminUser;
  }, []);

  const logout = useCallback(async () => {
    setStoredUser(null);
    setUser(null);
    setProfile(null);
    if (isSupabaseReady) {
      await supabase.auth.signOut().catch(() => {});
    }
  }, [isSupabaseReady]);

  return {
    user,
    profile,
    loading,
    isSupabaseReady,
    isMasterAdmin: isMasterAdmin(user),
    signUpWithPassword,
    signInWithPassword,
    loginWithEmail,
    loginAsMasterAdmin,
    logout,
    refreshProfile: () => (user ? fetchProfile(user.id) : Promise.resolve()),
  };
}
