import { useEffect, useState } from "react";
import { Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AdState = "intro" | "loading" | "playing" | "reward" | "none";
type Creative = {
  session_id: string; sponsor?: string; headline?: string; description?: string; tagline?: string;
  image_url?: string; video_url?: string; poster_url?: string; destination_url?: string;
  call_to_action?: string; duration_seconds?: number; format?: string;
};

export function GroupSponsorAd({ groupId, creative: initialCreative, onClose }: { groupId: string; creative: Creative; onClose: () => void }) {
  const [state, setState] = useState<AdState>("intro");
  const [creative] = useState<Creative | null>(initialCreative);
  const [progress, setProgress] = useState(0);
  const [reward, setReward] = useState(Number(initialCreative.reward_bc ?? 3));

  useEffect(() => {
    const intro = window.setTimeout(() => setState("playing"), 1600);
    return () => window.clearTimeout(intro);
  }, []);

  useEffect(() => {
    if (state !== "playing" || !creative) return;
    const duration = Math.max(1000, Number(creative.duration_seconds ?? 5) * 1000);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        void complete();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [state, creative]);

  async function complete() {
    if (!creative?.session_id) return;
    const { data, error } = await (supabase as any).rpc("complete_group_reward_ad_secure", { p_session_id: creative.session_id });
    if (error) { toast.error(error.message ?? "Reward could not be credited."); setState("reward"); return; }
    setReward(Number(data?.reward_bc ?? reward));
    setState("reward");
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        {state === "intro" ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary/15 text-3xl">🐼</div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">Today's group sponsor</p>
            <h2 className="mt-2 font-display text-xl font-black">A message from today's group sponsor</h2>
            <p className="mt-2 text-sm text-muted-foreground">Thanks for chatting in the group. Today's sponsor message will play now.</p>
          </div>
        ) : state === "loading" ? (
          <div className="p-8 text-center"><Loader2 className="mx-auto mb-3 size-6 animate-spin" /><p className="text-sm">Loading today's sponsor message…</p></div>
        ) : state === "playing" ? (
          <div>
            <div className="flex items-center justify-between px-4 py-3">
              <div><p className="text-xs font-black uppercase tracking-wider text-primary">Today's sponsor</p><p className="font-display font-bold">{creative?.sponsor ?? "Group Sponsor"}</p></div>
              <button type="button" onClick={onClose} aria-label="Close sponsor" className="grid size-9 place-items-center rounded-full bg-secondary"><X className="size-4" /></button>
            </div>
            {creative?.video_url ? <video className="aspect-video w-full bg-black object-contain" src={creative.video_url} poster={creative.poster_url ?? creative.image_url} autoPlay muted playsInline onEnded={() => void complete()} /> :
             creative?.image_url ? <img className="aspect-video w-full object-cover" src={creative.image_url} alt={creative.headline ?? "Today's group sponsor"} /> :
             <div className="grid aspect-video place-items-center bg-secondary text-5xl">🎬</div>}
            <div className="p-4">
              <p className="font-semibold">{creative?.headline ?? "A message from today's sponsor"}</p>
              {creative?.description ? <p className="mt-1 text-xs text-muted-foreground">{creative.description}</p> : null}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{width:`${progress}%`}} /></div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">Watch the sponsor message to the end to earn your reward.</p>
            </div>
          </div>
        ) : (
          <div className="p-7 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary/15"><Gift className="size-8 text-primary" /></div>
            <h2 className="font-display text-xl font-black">You've earned a reward from today's group sponsor</h2>
            <p className="mt-2 text-sm text-muted-foreground">+{reward} BC added to your Panda Coin balance.</p>
            <p className="mt-2 text-xs text-muted-foreground">Chat through the group, use your coins well, and enjoy your reward.</p>
            <Button className="mt-5 w-full" onClick={onClose}>Continue chatting</Button>
          </div>
        )}
      </div>
    </div>
  );
}
