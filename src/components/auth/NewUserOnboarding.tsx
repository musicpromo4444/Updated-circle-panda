import { useState } from "react";
import { Gift, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function NewUserOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"welcome"|"reward"|"ready">("welcome");
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [error, setError] = useState("");
  async function claimReward() {
    setBusy(true); setError("");
    try {
      const { data, error } = await supabase.rpc("claim_new_member_onboarding");
      if (error) throw error;
      setReward(Number((data as any)?.welcome_bc ?? 0));
      setStep("reward");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not complete onboarding."); }
    finally { setBusy(false); }
  }
  async function finish() { try { await supabase.rpc("mark_member_intro_seen"); } catch {} setStep("ready"); }
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] border border-emerald-300/20 bg-[#0b1d18] p-6 text-white shadow-2xl">
    {step === "welcome" && <><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-400/15 text-5xl">🐼</div><h2 className="mt-5 text-center text-2xl font-black">You have created an account! 🎉</h2><p className="mt-3 text-center text-sm leading-6 text-white/65">Welcome to Circle Panda. Your account is already logged in, and your Panda profile is ready.</p><button onClick={()=>void claimReward()} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f] disabled:opacity-60">{busy ? "Setting up your Panda…" : "Continue"}{!busy && <ArrowRight className="h-5 w-5"/>}</button></>}
    {step === "reward" && <><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-400/15"><Gift className="h-10 w-10 text-emerald-300"/></div><h2 className="mt-5 text-center text-2xl font-black">{reward ? String(reward) + " BC added to your wallet! 🎁" : "Welcome gift checked"}</h2><p className="mt-3 text-center text-sm leading-6 text-white/65">Your welcome BC has been added to your Circle Panda wallet. You can use BC for the app’s paid features.</p>{error && <p className="mt-3 rounded-xl bg-red-400/10 p-3 text-center text-xs text-red-200">{error}</p>}<button onClick={()=>void finish()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f]">Continue to your Panda <ArrowRight className="h-5 w-5"/></button></>}
    {step === "ready" && <><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-400/15"><CheckCircle2 className="h-10 w-10 text-emerald-300"/></div><h2 className="mt-5 text-center text-2xl font-black">You’re ready! 🐼</h2><p className="mt-3 text-center text-sm leading-6 text-white/65">Your new-user onboarding is complete. You can now explore the Circle.</p><button onClick={onComplete} className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 font-black text-[#06120f]">Enter Circle Panda</button></>}
  </div></div>;
}