import { useEffect, useState } from "react";
import { Coins, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { MEDIA_UNLOCK_COST } from "@/lib/hotseat";
import { toast } from "sonner";

/** Two ways past the view-once gate: a 15s rewarded ad, or 10 BC. */
export function MediaUnlockModal({
  open,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUnlocked: () => void;
}) {
  const { coins, spendCoins } = useStore();
  const [watching, setWatching] = useState(false);
  const [left, setLeft] = useState(15);

  useEffect(() => {
    if (!watching) return;
    setLeft(15);
    const i = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(i);
          setWatching(false);
          onUnlocked();
          onOpenChange(false);
          toast.success("Unlocked — view once!");
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [watching, onUnlocked, onOpenChange]);

  function payToUnlock() {
    if (!spendCoins(MEDIA_UNLOCK_COST, "Unlocked view-once media")) return;
    onUnlocked();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !watching && onOpenChange(o)}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="font-display text-xl">Unlock View-Once Media</DialogTitle>
        <DialogDescription>
          This reply plays one time only. Choose how you want in.
        </DialogDescription>

        {watching ? (
          <div className="grid h-40 place-items-center rounded-xl bg-secondary/40 text-center">
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin" /> Ad playing… {left}s
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <Button className="h-12 w-full justify-start gap-2" onClick={() => setWatching(true)}>
              <Play className="size-4 fill-current" /> Watch 15s Ad to View Free
            </Button>
            <Button
              variant="secondary"
              className="h-12 w-full justify-start gap-2 border border-[var(--coin)]/40 text-[var(--coin)]"
              onClick={payToUnlock}
              disabled={coins < MEDIA_UNLOCK_COST}
            >
              <Coins className="size-4" /> Unlock Instantly for {MEDIA_UNLOCK_COST} BC
            </Button>
            {coins < MEDIA_UNLOCK_COST ? (
              <p className="text-center text-xs text-muted-foreground">
                You have {coins} BC — watch the ad instead.
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
