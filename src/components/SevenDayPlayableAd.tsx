import { useState } from "react";
import { Clapperboard, Gift, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useActiveAdCreative } from "@/components/ads/adInventoryStorage";
import { notifyAdEvent } from "@/components/ads/platformAdBridge";

type Phase = "idle" | "playing" | "done";

export function SevenDayPlayableAd() {
  const ad = useActiveAdCreative("seven_day_playable");
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);


  const close = () => {
    if (!claiming) {
      setOpen(false);
      setPhase("idle");
      setProgress(0);
      }
  };

  const start = () => {
    if (!ad?.videoUrl) return;
    setOpen(true);
    setPhase("playing");
    setProgress(0);
    void notifyAdEvent("impression", { adId: ad.id, format: "video" });
  };

  return (
    <>
      <section className="rounded-3xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><Clapperboard className="size-5" /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Bonus activity</p>
              <h3 className="mt-1 font-display text-lg font-bold">Play a short sponsored ad</h3>
              <p className="mt-1 text-sm text-muted-foreground">Watch the sponsored placement to the end. This activity is ad-only and does not award BC.</p>
            </div>
          </div>
          <Button className="shrink-0 gap-2" onClick={start} disabled={!ad?.videoUrl}><Play className="size-4" /> {ad ? "Watch & earn" : "Sponsored ad unavailable"}</Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={(value) => !value && close()}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2 font-display"><Clapperboard className="size-4 text-primary" /> Sponsored playable</DialogTitle>
          <DialogDescription>Watch the complete placement to unlock the reward.</DialogDescription>
          {phase === "playing" && ad?.videoUrl ? (
            <div className="space-y-4 py-2">
              <video
                src={ad.videoUrl}
                poster={ad.posterUrl || ad.imageUrl}
                autoPlay
                muted
                playsInline
                className="h-56 w-full rounded-2xl bg-black object-contain"
                onTimeUpdate={(e) => { const v=e.currentTarget; setProgress(v.duration ? (v.currentTime/v.duration)*100 : 0); }}
                onEnded={() => { setProgress(100); setPhase("done"); }}
              />
              <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="text-center text-xs text-muted-foreground">Sponsored placement Â· {ad.sponsor}</p>
            </div>
          ) : null}
          {phase === "done" ? (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/15 text-primary"><Gift className="size-9" /></div>
              <p className="text-sm text-muted-foreground">The ad is complete. Claim your server-verified reward.</p>
              <Button className="w-full gap-2" onClick={close}><Sparkles className="size-4" /> Continue</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
