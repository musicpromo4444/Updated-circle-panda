import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function QuickVoteSignup({
  open,
  onOpenChange,
  onComplete,
  actionLabel = "vote",
  successDescription = "Your action will now continue.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  actionLabel?: string;
  successDescription?: string;
}) {
  const [step, setStep] = useState<"account" | "location">("account");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("account");
    setIdentifier("");
    setPassword("");
    setCountry("");
    setStateProvince("");
    setCity("");
    setBusy(false);
  };

  const ensureImmediateSession = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) return true;
    const { data: anonData, error } = await supabase.auth.signInAnonymously();
    if (error || !anonData.user) {
      throw error ?? new Error("Could not create an immediate Circle Panda session.");
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{step === "account" ? "Quick signup 🐼" : "One quick detail"}</DialogTitle>
          <DialogDescription>
            {step === "account"
              ? `Create your Circle Panda access to ${actionLabel} in seconds. You do not have to wait for an email verification before continuing.`
              : "Choose your location. You can complete the rest of your profile later."}
          </DialogDescription>
        </DialogHeader>

        {step === "account" ? (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!identifier.trim() || password.trim().length < 6) {
              toast.error("Enter a phone/email and a password of at least 6 characters");
              return;
            }
            setBusy(true);
            try {
              const value = identifier.trim();
              const result = value.includes("@")
                ? await supabase.auth.signUp({
                    email: value,
                    password,
                    options: {
                      data: { name: `Panda #${Math.floor(1000 + Math.random() * 9000)}` },
                      emailRedirectTo: window.location.origin + "/",
                    },
                  })
                : await supabase.auth.signUp({
                    phone: value,
                    password,
                    options: { data: { name: `Panda #${Math.floor(1000 + Math.random() * 9000)}`, phone_number: value } },
                  });

              if (result.error) throw result.error;

              // Hosted Supabase can return no session when email/phone confirmation is enabled.
              // Quick actions must never be blocked by that setting, so keep an immediate
              // authenticated anonymous session for the action while the credential can be
              // verified later.
              await ensureImmediateSession();
              setStep("location");
            } catch (error: any) {
              toast.error("Signup could not continue", { description: error?.message ?? "Please try again." });
            } finally {
              setBusy(false);
            }
          }} className="space-y-3">
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Phone number or email" autoComplete="username" required />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} placeholder="Password" autoComplete="new-password" required />
            <Button className="w-full" disabled={busy}>{busy ? "Creating access…" : "Continue"}</Button>
            <p className="text-center text-[11px] leading-4 text-muted-foreground">
              You can continue immediately. Email verification, when enabled, is handled later and does not block this quick action.
            </p>
          </form>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!country) {
              toast.error("Choose your country");
              return;
            }
            setBusy(true);
            try {
              const result = await (supabase as any).rpc("complete_quick_profile", {
                p_country: country,
                p_state_province: stateProvince || null,
                p_city: city || null,
              });
              if (result?.error) {
                toast.error("Location could not be saved", { description: result.error.message });
                return;
              }
              toast.success("Circle Panda access ready 🐼", { description: successDescription });
              reset();
              onOpenChange(false);
              onComplete();
            } finally {
              setBusy(false);
            }
          }} className="space-y-3">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" required>
              <option value="">Country</option>
              {["Nigeria","Ghana","Kenya","South Africa","United Kingdom","United States","Canada","India","Australia","Germany","France","Other"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} placeholder="State / Province (optional)" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" />
            <Button className="w-full" disabled={busy}>{busy ? "Saving…" : `Continue to ${actionLabel}`}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
