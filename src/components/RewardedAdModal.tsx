import { useEffect, useState } from "react";
import { Clapperboard, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

export const AD_COOLDOWN_MS = 60_000;
const AD_LENGTH_MS = 5000;

type Phase = "loading" | "playing" | "done" | "failed";

export function RewardedAdModal({
  open,
  groupId,
  onClose,
}: {
  open: boolean;
  groupId: string;
  onClose: () => void;
}) {
  const { addCoins, extendHotSeat, grantSkipPass, markAdShown } = useStore();
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [reward, setReward] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setProgress(0);
    const fails = Math.random() < 0.1;
    const load = setTimeout(() => setPhase(fails ? "failed" : "playing"), 1200);
    return () => clearTimeout(load);
  }, [open]);

  useEffect(() => {
    if (phase !== "playing") return;
    const started = Date.now();
    const i = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / AD_LENGTH_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(i);
        setPhase("done");
      }
    }, 100);
    return () => clearInterval(i);
  }, [phase]);

  useEffect(() => {
    if (phase !== "failed") return;
    const t = setTimeout(() => onClose(), 900);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  function claim() {
    const perk = Math.random() < 0.5 ? "time" : "skip";
    if (perk === "time") {
      extendHotSeat(groupId, 120);
      setReward("+3 BC and 2 extra minutes on the Hot Seat");
    } else {
      grantSkipPass();
      setReward("+3 BC and a skip-the-queue pass");
    }
    addCoins(3, "Rewarded ad watched");
    markAdShown();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Clapperboard className="size-4 text-primary" />
            {phase === "done" ? "Reward unlocked" : "Message sent!"}
          </DialogTitle>
        </DialogHeader>

        {phase === "loading" ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Message sent! Loading reward ad…
          </p>
        ) : null}

        {phase === "failed" ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <X className="size-4" /> Ad unavailable — carrying on, your message is already live.
          </p>
        ) : null}

        {phase === "playing" ? (
          <div className="space-y-3 py-2">
            <div className="grid h-36 place-items-center rounded-xl bg-secondary/40 text-4xl">
              🎬
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Watch to the end to earn Panda Coins and Hot Seat perks.
            </p>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="space-y-3 py-2 text-center">
            <div className="grid h-28 place-items-center rounded-xl bg-primary/15 text-4xl">🎁</div>
            <p className="text-sm text-muted-foreground">
              {reward || "Tap claim for your coins and a Hot Seat perk."}
            </p>
            <Button className="w-full gap-2" onClick={claim}>
              <Gift className="size-4" /> Claim reward
            </Button>
          </div>
        ) : null}

        {phase === "playing" ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Skip ad
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
