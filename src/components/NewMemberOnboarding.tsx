import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function NewMemberOnboarding({ onFinished, challengeMode = false }: { onFinished?: (choice: "explore" | "continue") => void; challengeMode?: boolean }) {
  const [stage, setStage] = useState<"idle" | "welcome" | "intro">("idle");\n  const challengeFlow = challengeMode || window.location.pathname.startsWith("/play/");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    let claimed = false;
    const claim = async () => {
      if (claimed) return;
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || user.is_anonymous) { if (active) setBusy(false); return; }
      claimed = true;
      const { data, error } = await (supabase as any).rpc("claim_new_member_onboarding");
      if (!active) return;
      if (!error && data?.is_new_member) setStage("welcome");
      setBusy(false);
    };
    void claim();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !session.user.is_anonymous) void claim();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  if (busy || stage === "idle") return null;

  const closeIntro = async (choice: "explore" | "continue") => {
    await (supabase as any).rpc("mark_member_intro_seen");
    setStage("idle");
    onFinished?.(choice);
  };

  return <Dialog open onOpenChange={() => {}}>
    <DialogContent className="max-w-sm rounded-3xl border-primary/20 bg-card p-6 text-center shadow-2xl">
      {stage === "welcome" ? <>
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/15 text-4xl">🐼</div>
        <h2 className="mt-4 font-display text-2xl font-black">Hooray! 🎉</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your Circle Panda account was created successfully.</p>
        <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Welcome reward</p>
          <p className="mt-1 text-3xl font-black">+200 BC</p>
          <p className="mt-1 text-xs text-muted-foreground">Use your Panda Coins across Circle Panda.</p>
        </div>
        <Button className="mt-5 w-full" onClick={() => {
          if (challengeFlow) { setStage("idle"); onFinished?.("continue"); }
          else setStage("intro");
        }}>Continue</Button>
      </> : <>
        <button type="button" aria-label="Close" onClick={() => void closeIntro("continue")} className="absolute right-4 top-4 text-xl text-muted-foreground hover:text-foreground">×</button>
        <div className="text-4xl">🐼</div>
        <h2 className="mt-3 font-display text-xl font-black">Welcome to Circle Panda</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Meet people, connect, participate in challenges, discover events and enjoy activities across the Panda community.</p>
        <div className="mt-4 space-y-2 text-left text-xs">
          <div className="rounded-xl bg-secondary/60 p-2.5 font-semibold">💕 Woman Crush Wednesday — <span className="text-primary">Challenge • Win Prizes</span></div>
          <div className="rounded-xl bg-secondary/60 p-2.5 font-semibold">🤵 Man Crush Monday — <span className="text-primary">Challenge • Win Prizes</span></div>
          <div className="rounded-xl bg-secondary/60 p-2.5 font-semibold">🎁 Giveaways — <span className="text-primary">Win Prizes</span></div>
          <div className="rounded-xl bg-secondary/60 p-2.5 font-semibold">🎉 Events — <span className="text-primary">Attend Free Events</span></div>
          <div className="rounded-xl bg-secondary/60 p-2.5">💕 Dating · 💬 One-on-one messaging · 👥 Groups · 🎮 Games & Activities · 📹 Live</div>
        </div>
        <Button className="mt-5 w-full" onClick={() => void closeIntro("explore")}>Explore Circle Panda</Button>
      </>}
    </DialogContent>
  </Dialog>;
}
