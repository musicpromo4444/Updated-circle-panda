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
                      emailRedirectTo: window.location.origin + "/auth/callback",
                    },
                  })
                : await supabase.auth.signUp({
                    phone: value,
                    password,
                    options: { data: { name: `Panda #${Math.floor(1000 + Math.random() * 9000)}`, phone_number: value } },
                  });

              if (result.error) throw result.error;

              // If Supabase returned a real session, the new account can continue immediately.
              // If confirmation is required, do not replace the new account with an anonymous
              // session. That would make the action appear to continue while the real account
              // is still unverified and can also leave the browser signed into the wrong user.
              if (result.data.session) {
                setStep("location");
                return;
              }

              toast.success("Check your email to confirm your Panda", {
                description: "After confirmation, sign in and then submit your confession.",
              });
              reset();
              onOpenChange(false);
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
