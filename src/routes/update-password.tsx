import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated. Please log in again.");
      await supabase.auth.signOut();
      void navigate({ to: "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl border border-primary/25 bg-primary/15 text-4xl">🐼</div>
          <h1 className="text-center font-display text-2xl font-bold">Reset Your Circle Panda Password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {ready ? "Choose your new password below." : "Open the password reset link from your email to continue."}
          </p>

          {ready ? (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                minLength={8}
              />
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength={8}
              />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Updating…" : "Save New Password"}
              </Button>
            </form>
          ) : (
            <Button type="button" className="mt-6 w-full" onClick={() => void navigate({ to: "/login" })}>
              Back to Login
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
