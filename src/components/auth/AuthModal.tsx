import { useState } from "react";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser, MASTER_ADMIN_EMAIL } from "@/lib/auth";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
  onOpenBackendGuide?: () => void;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "signin",
  onOpenBackendGuide,
}: AuthModalProps) {
  const { isSupabaseReady, signUpWithPassword, signInWithPassword, loginAsMasterAdmin } =
    useCurrentUser();

  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setHandle("");
    setSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      toast.error("Please enter your email and password");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signInWithPassword(cleanEmail, cleanPass);
      if (error) {
        toast.error("Sign in failed", { description: error.message });
      } else {
        toast.success(`Welcome back, ${cleanEmail}!`, {
          description:
            cleanEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
              ? "Master Admin privileges activated."
              : "Direct messages and coins synced.",
        });
        resetForm();
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication error";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanHandle = handle.trim() || `Panda #${Math.floor(1000 + Math.random() * 9000)}`;

    if (!cleanEmail || !cleanPass) {
      toast.error("Please enter an email and password");
      return;
    }

    if (cleanPass.length < 6) {
      toast.error("Password too short", {
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signUpWithPassword(cleanEmail, cleanPass, cleanHandle);
      if (error) {
        toast.error("Sign up failed", { description: error.message });
      } else {
        toast.success("Account created successfully! 🐼", {
          description: "100 Panda Coins (BC) bonus credited to your balance.",
        });
        resetForm();
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up error";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-2xl border border-primary/25">
              🐼
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">
                Circle Panda Account
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Anonymous identity. Synced coins, chats, and reputations.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Status Indicator */}
        <div className="mt-2 flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className={`size-2 rounded-full ${isSupabaseReady ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {isSupabaseReady ? "Supabase Auth Connected" : "Local Storage Mode"}
          </span>
          {onOpenBackendGuide ? (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenBackendGuide();
              }}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Setup Guide →
            </button>
          ) : null}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-3">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="signin" className="rounded-lg text-xs font-semibold gap-1.5">
              <LogIn className="size-3.5" /> Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg text-xs font-semibold gap-1.5">
              <UserPlus className="size-3.5" /> Create Account
            </TabsTrigger>
          </TabsList>

          {/* SIGN IN TAB */}
          <TabsContent value="signin" className="mt-4 space-y-4">
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Password</label>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full rounded-xl font-bold">
                {submitting ? "Signing in…" : "Sign In to Circle Panda"}
              </Button>
            </form>

            <div className="relative border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  loginAsMasterAdmin();
                  onOpenChange(false);
                  toast.success("Authenticated as Master Admin", {
                    description: `Logged in as ${MASTER_ADMIN_EMAIL}`,
                  });
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                <Shield className="size-3.5 mr-1 text-emerald-500" /> Sign in as Master Admin
              </Button>
            </div>
          </TabsContent>

          {/* SIGN UP TAB */}
          <TabsContent value="signup" className="mt-4 space-y-4">
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Anonymous Panda Handle
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. Midnight Bamboo, Silent Cub"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="pl-9 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to get a randomly generated Panda alias.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Choose Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 rounded-xl"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-500 flex items-center gap-2">
                <Sparkles className="size-4 shrink-0" />
                <span>Includes 100 Panda Coins (BC) signup welcome drop!</span>
              </div>

              <Button type="submit" disabled={submitting} className="w-full rounded-xl font-bold">
                {submitting ? "Creating account…" : "Create Anonymous Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
