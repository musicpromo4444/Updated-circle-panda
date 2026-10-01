import { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
  onOpenBackendGuide?: () => void;
  onAuthenticated?: () => void;
}

export function AuthModal({ open, onOpenChange, defaultTab = "signin", onOpenBackendGuide, onAuthenticated }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (!open) return;
    setTab(defaultTab);
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    setPlatform(ios ? "ios" : android ? "android" : "other");
  }, [open, defaultTab]);

  const reset = () => {
    setIdentifier("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setBusy(false);
  };

  const normalizePhone = (value: string) => {
    const raw = value.replace(/[\\s().-]/g, "");
    if (raw.startsWith("+")) return raw;
    if (raw.startsWith("00")) return "+" + raw.slice(2);
    if (/^0\\d{10}$/.test(raw)) return "+234" + raw.slice(1);
    return raw;
  };

  const providerLogin = async (provider: "google" | "apple") => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) toast.error(error.message);
    setBusy(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = identifier.trim();
    if (!value || !password) {
      toast.error("Enter your phone/email and password.");
      return;
    }

    if (tab === "signup") {
      if (!name.trim()) {
        toast.error("Enter your Panda name.");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (tab === "signup") {
        // Create the account server-side with confirmation already completed.
        // This intentionally bypasses Supabase's email/phone confirmation gate so
        // a new Panda can enter the Circle immediately after signing up.
        const { data: created, error: createError } = await supabase.functions.invoke("create-panda-account", {
          body: { name: name.trim(), identifier: value, password },
        });
        if (createError) throw createError;
        if (!created?.user_id) throw new Error("Account was not created.");

        const result = value.includes("@")
          ? await supabase.auth.signInWithPassword({ email: value, password })
          : await supabase.auth.signInWithPassword({ phone: normalizePhone(value), password });
        if (result.error) throw result.error;

        toast.success("Account created. Welcome to Circle Panda 🐼");
        onAuthenticated?.();
      } else {
        const result = value.includes("@")
          ? await supabase.auth.signInWithPassword({ email: value, password })
          : await supabase.auth.signInWithPassword({ phone: value, password });
        if (result.error) throw result.error;
        toast.success("Welcome back to the Circle 🐼");
        onAuthenticated?.();
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      let message = error instanceof Error ? error.message : "Authentication failed.";
      // Supabase FunctionsHttpError normally exposes only "non-2xx" in message.
      // Read the function's JSON body so users see the real signup problem.
      try {
        const context = (error as { context?: Response }).context;
        if (context) {
          const body = await context.clone().json();
          if (body?.error) message = String(body.error);
        }
      } catch {
        // Keep the normal error message when the response is not JSON.
      }
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const social = platform === "ios"
    ? <Button type="button" variant="outline" className="w-full bg-black text-white" disabled={busy} onClick={() => void providerLogin("apple")}>Continue with Apple</Button>
    : platform === "android"
      ? <Button type="button" variant="outline" className="w-full bg-white text-black" disabled={busy} onClick={() => void providerLogin("google")}>Continue with Google</Button>
      : <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void providerLogin("google")}>Continue with Google</Button>
          <Button type="button" variant="outline" className="bg-black text-white" disabled={busy} onClick={() => void providerLogin("apple")}>Continue with Apple</Button>
        </div>;

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); onOpenChange(value); }}>
      <DialogContent className="rounded-3xl border border-border bg-card p-6 shadow-2xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/15 text-2xl">🐼</span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">Circle Panda Account</DialogTitle>
              <DialogDescription className="text-xs">Your real Supabase account keeps chats, BC and profile data synced.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as "signin" | "signup")} className="mt-3">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="signin" className="gap-1.5 text-xs font-semibold"><LogIn className="size-3.5" /> Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="gap-1.5 text-xs font-semibold"><UserPlus className="size-3.5" /> Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={submit} className="mt-4 space-y-3">
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Phone number or email" autoComplete="username" />
              <div className="relative">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Password" autoComplete="current-password" className="pr-11" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Enter the Circle"}</Button>
              <div className="relative py-1"><div className="border-t border-border" /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 bg-card px-2 text-[10px] text-muted-foreground">OR</span></div>
              {social}
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={submit} className="mt-4 space-y-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Panda name" autoComplete="name" />
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Phone number or email" autoComplete="username" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Password (8+ characters)" autoComplete="new-password" />
              <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Re-enter password" autoComplete="new-password" />
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating account…" : "Create your Panda"}</Button>
              <div className="relative py-1"><div className="border-t border-border" /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 bg-card px-2 text-[10px] text-muted-foreground">OR</span></div>
              {social}
            </form>
          </TabsContent>
        </Tabs>

        {onOpenBackendGuide ? <button type="button" onClick={() => { onOpenChange(false); onOpenBackendGuide(); }} className="mt-3 text-center text-[11px] text-muted-foreground hover:underline">Backend setup guide</button> : null}
      </DialogContent>
    </Dialog>
  );
}
