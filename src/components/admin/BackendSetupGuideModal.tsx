import { useState } from "react";
import { Check, Copy, Database, ExternalLink, Key, Radio, Server, Shield, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { hasSupabaseConfig } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackendSetupGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackendSetupGuideModal({ open, onOpenChange }: BackendSetupGuideModalProps) {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const isConnected = hasSupabaseConfig();

  const envTemplate = `# Circle Panda Supabase Backend Credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
# Optional server-side service role key (for administrative tasks):
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here`;

  const copyToClipboard = async (text: string, type: "env" | "sql") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "env") {
        setCopiedEnv(true);
        setTimeout(() => setCopiedEnv(false), 2000);
      } else {
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2000);
      }
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy. Please manually copy the text.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              <Server className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">
                Production Backend &amp; Supabase Integration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Realtime WebSockets, Server-Enforced Economy, Row-Level Security &amp; Auth.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Backend Status Banner */}
        <div
          className={`mt-3 rounded-2xl border p-4 flex items-center justify-between gap-3 ${
            isConnected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-amber-500/30 bg-amber-500/10 text-amber-500"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`size-3 rounded-full animate-pulse ${
                isConnected
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : "bg-amber-500"
              }`}
            />
            <div>
              <p className="text-sm font-bold text-foreground">
                {isConnected
                  ? "Supabase Live Backend Connected"
                  : "Local Prototype / Preview Mode Active"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isConnected
                  ? "Real-time subscriptions, server RPCs and database storage are active."
                  : "Using local in-memory storage fallback. Add your Supabase credentials below to go live."}
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Production Guide */}
        <div className="mt-4 space-y-4">
          {/* Step 1: Environment Variables */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                  1
                </span>
                <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Key className="size-4 text-primary" /> Setup Environment Variables
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 rounded-lg"
                onClick={() => copyToClipboard(envTemplate, "env")}
              >
                {copiedEnv ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copiedEnv ? "Copied" : "Copy .env"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtain your Project URL and Publishable/Anon API Key from the{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Supabase Dashboard <ExternalLink className="size-3" />
              </a>{" "}
              (Settings → API) and save them in your{" "}
              <code className="text-foreground bg-muted px-1.5 py-0.5 rounded">.env</code> file.
            </p>
            <pre className="rounded-xl bg-neutral-950 p-3 text-[11px] font-mono text-neutral-300 overflow-x-auto border border-border/60">
              {envTemplate}
            </pre>
          </div>

          {/* Step 2: Database Migration & RLS */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                  2
                </span>
                <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Database className="size-4 text-primary" /> Run Production SQL Migration
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 rounded-lg"
                onClick={() => {
                  const path =
                    "/supabase/migrations/20260925000000_production_chat_auth_economy.sql";
                  copyToClipboard(path, "sql");
                }}
              >
                {copiedSql ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copiedSql ? "Copied Path" : "Copy SQL File Path"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The migration file has been generated in your codebase at:
              <br />
              <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                supabase/migrations/20260925000000_production_chat_auth_economy.sql
              </code>
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground pl-1">
              <div className="flex items-start gap-2">
                <Shield className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Row-Level Security (RLS):</strong> Ensures users can only view and send
                  messages in threads where they are registered as participants.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Server-Side Economy (RPCs):</strong> Atomic{" "}
                  <code className="bg-muted px-1 rounded">send_chat_message()</code> deducts 1 BC on
                  PostgreSQL transactions. The daily wheel spin enforces the 24h cooldown
                  server-side.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Radio className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Realtime Publication:</strong> Automatically enables{" "}
                  <code className="bg-muted px-1 rounded">chat_messages</code> publication for
                  instant WebSocket delivery.
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Deployment Instructions */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                3
              </span>
              <h3 className="font-display text-sm font-bold text-foreground">
                Deploying the Updated Full-Stack App
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              1. <strong>Database:</strong> Paste the migration SQL into your Supabase SQL Editor
              and run it, or execute <code className="bg-muted px-1 rounded">supabase db push</code>
              .
              <br />
              2. <strong>Auth Settings:</strong> Under <em>Authentication → Providers → Email</em>,
              ensure Email signup is enabled.
              <br />
              3. <strong>Hosting:</strong> Deploy your application to Vercel, Netlify, or Docker
              container with your <code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code>{" "}
              and <code className="bg-muted px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> set
              in the project settings.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="rounded-xl">
            Got it, thanks!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
