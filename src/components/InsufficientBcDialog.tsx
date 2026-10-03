import { useEffect, useState } from "react";
import { Coins, Gift, ShoppingCart, Play } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type InsufficientDetail = { required?: number; balance?: number; reason?: string; noEquivalent?: boolean };

export function InsufficientBcDialog() {
  const navigate = useNavigate();
  const { syncCoins } = useStore();
  const [detail, setDetail] = useState<InsufficientDetail | null>(null);
  const [adOpen, setAdOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    const handler = (event: Event) => setDetail((event as CustomEvent<InsufficientDetail>).detail ?? {});
    window.addEventListener("circle-panda-insufficient-bc", handler);
    return () => window.removeEventListener("circle-panda-insufficient-bc", handler);
  }, []);

  const close = () => { if (!watching) setDetail(null); };

  const startFree = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("start_free_coins_rewarded_ad");
      if (error) throw error;
      setAd(data);
      setAdOpen(true);
      setWatching(true);
      setProgress(0);
      const total = Math.max(1, Number(data?.duration_seconds ?? 5));
      setSeconds(total);
      let elapsed = 0;
      const timer = window.setInterval(() => {
        elapsed += 100;
        setProgress(Math.min(100, (elapsed / (total * 1000)) * 100));
        setSeconds(Math.max(0, Math.ceil(total - elapsed / 1000)));
        if (elapsed >= total * 1000) {
          window.clearInterval(timer);
          void (async () => {
            const { data: completed, error: completionError } = await (supabase as any).rpc("complete_rewarded_ad_session", { p_session_id: data.session_id });
            setWatching(false);
            if (completionError) { toast.error(completionError.message ?? "Reward could not be claimed"); return; }
            setAdOpen(false);
            setDetail(null);
            await syncCoins();
            toast.success(`+${Number(completed?.reward_bc ?? 30)} BC Added!`, { description: "Your sponsored ad reward has been credited." });
          })();
        }
      }, 100);
    } catch (error: any) {
      toast.error(error?.message ?? "Free BC ad is unavailable right now.");
    }
  };

  return (
    <>
      <Dialog open={detail !== null && !adOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display"><Coins className="size-5 text-amber-500" /> {detail?.noEquivalent ? "No equivalent BC" : "Insufficient BC"}</DialogTitle>
            <DialogDescription>{detail?.noEquivalent ? "This option does not have an equivalent BC price. Get free BC now or buy BC to continue." : "You don't have enough Panda Coins for this action."}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-secondary/50 p-3 text-sm">
            {detail?.required ? <p><strong>Required:</strong> {Number(detail.required).toLocaleString()} BC</p> : null}
            {typeof detail?.balance === "number" ? <p><strong>Your balance:</strong> {Number(detail.balance).toLocaleString()} BC</p> : null}
            {detail?.required ? <p className="mt-1 text-xs text-muted-foreground">You need {Math.max(0, Number(detail.required) - Number(detail.balance ?? 0)).toLocaleString()} more BC.</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button type="button" variant="outline" onClick={startFree} className="gap-2"><Gift className="size-4" /> Get Free</Button>
            <Button type="button" onClick={() => { setDetail(null); void navigate({ to: "/store" }); }} className="gap-2"><ShoppingCart className="size-4" /> Buy BC</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adOpen} onOpenChange={(open) => !watching && setAdOpen(open)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display"><Gift className="size-5 text-emerald-500" /> Get Free BC</DialogTitle>
            <DialogDescription>{ad?.sponsor ? `${ad.sponsor} · ` : ""}Watch the sponsored video to receive {Number(ad?.reward_bc ?? 30)} BC.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-950">
              {ad?.video_url ? <video className="h-full w-full object-cover" src={String(ad.video_url)} poster={ad?.poster_url ?? undefined} autoPlay playsInline controls={false} /> : <div className="grid h-full place-items-center"><Play className="size-10 text-emerald-400 animate-pulse" /></div>}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Sponsored ad</span><span>{seconds}s</span></div>
              <Progress value={progress} />
            </div>
            <p className="text-center text-xs text-muted-foreground">Keep the ad open until it finishes to receive your BC.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
