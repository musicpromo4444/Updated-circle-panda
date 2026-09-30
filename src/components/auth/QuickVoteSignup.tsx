import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

export function QuickVoteSignup({ open, onOpenChange, onComplete }: { open: boolean; onOpenChange: (open: boolean) => void; onComplete: () => void }) {
  const { signUpWithPassword, updateQuickProfile } = useCurrentUser();
  const [step, setStep] = useState<"account"|"location">("account");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep("account"); setIdentifier(""); setPassword(""); setCountry(""); setStateProvince(""); setCity(""); setBusy(false); };

  return <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
    <DialogContent className="max-w-sm rounded-3xl">
      <DialogHeader>
        <DialogTitle>{step === "account" ? "Quick signup 🐼" : "One quick detail"}</DialogTitle>
        <DialogDescription>{step === "account" ? "Create your account in seconds. No profile setup yet." : "Choose your location. You can complete the rest of your profile later."}</DialogDescription>
      </DialogHeader>
      {step === "account" ? <form onSubmit={async e => {
        e.preventDefault(); if (!identifier.trim() || password.trim().length < 6) { toast.error("Enter a phone/email and a password of at least 6 characters"); return; }
        setBusy(true); try {
          const { error, data } = await signUpWithPassword(identifier, password);
          if (error) { toast.error("Signup failed", { description: error.message }); return; }
          if (!data.session) { toast.message("Verification required", { description: "Finish the verification, then return to Circle Panda to vote." }); return; }
          setStep("location");
        } finally { setBusy(false); }
      }} className="space-y-3">
        <Input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Phone number or email" autoComplete="email" required />
        <Input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={6} placeholder="Password" required />
        <Button className="w-full" disabled={busy}>{busy ? "Creating account…" : "Continue"}</Button>
      </form> : <form onSubmit={async e => {
        e.preventDefault(); if (!country) { toast.error("Choose your country"); return; }
        setBusy(true); try {
          const result = await updateQuickProfile(country, stateProvince, city);
          if (result?.error) { toast.error("Location could not be saved", { description: result.error.message }); return; }
          toast.success("Account ready 🐼", { description: "Your vote will now be counted." });
          reset(); onOpenChange(false); onComplete();
        } finally { setBusy(false); }
      }} className="space-y-3">
        <select value={country} onChange={e=>setCountry(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" required>
          <option value="">Country</option>
          {["Nigeria","Ghana","Kenya","South Africa","United Kingdom","United States","Canada","India","Australia","Germany","France","Other"].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <Input value={stateProvince} onChange={e=>setStateProvince(e.target.value)} placeholder="State / Province (optional)" />
        <Input value={city} onChange={e=>setCity(e.target.value)} placeholder="City (optional)" />
        <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Continue to vote"}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
