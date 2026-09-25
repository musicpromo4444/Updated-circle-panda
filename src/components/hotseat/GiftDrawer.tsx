import { useState } from "react";
import { Gift, Play, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

export type VirtualGift = {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  effect: string;
};

export const VIRTUAL_GIFTS: VirtualGift[] = [
  { id: "bamboo", name: "Fresh Bamboo", emoji: "🎋", cost: 5, effect: "Crispy crunch" },
  { id: "matcha", name: "Matcha Latte", emoji: "🍵", cost: 15, effect: "Warm cozy vibes" },
  { id: "torch", name: "Fire Torch", emoji: "🔥", cost: 30, effect: "Hot Sit on fire" },
  { id: "crown", name: "Panda Crown", emoji: "👑", cost: 50, effect: "Royal honor" },
  { id: "rocket", name: "Super Rocket", emoji: "🚀", cost: 100, effect: "To the moon" },
];

export function GiftDrawer({
  open,
  onOpenChange,
  onSendGift,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendGift: (gift: VirtualGift) => void;
}) {
  const { coins, spendCoins, addCoins } = useStore();
  const [selectedGift, setSelectedGift] = useState<VirtualGift>(VIRTUAL_GIFTS[0]);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);

  const handleSend = () => {
    if (coins < selectedGift.cost) {
      toast.error("Low Black Coin balance!", {
        description: `You need ${selectedGift.cost} BC to send ${selectedGift.name}. Watch a short ad to earn free coins!`,
      });
      setShowRewardedAd(true);
      return;
    }

    if (!spendCoins(selectedGift.cost, `Gift: ${selectedGift.name} to Midnight Panda`)) {
      setShowRewardedAd(true);
      return;
    }

    onSendGift(selectedGift);
    toast.success(`🎉 Sent ${selectedGift.emoji} ${selectedGift.name}!`, {
      description: `Cheered on Midnight Panda with ${selectedGift.cost} BC.`,
    });
    onOpenChange(false);
  };

  const startAd = () => {
    setWatching(true);
    setCountdown(5);
    setProgress(0);

    const totalSeconds = 5;
    const intervalMs = 100;
    let elapsedMs = 0;

    const timer = setInterval(() => {
      elapsedMs += intervalMs;
      const currentProgress = Math.min(100, Math.round((elapsedMs / (totalSeconds * 1000)) * 100));
      const remainingSec = Math.max(0, Math.ceil(totalSeconds - elapsedMs / 1000));

      setProgress(currentProgress);
      setCountdown(remainingSec);

      if (elapsedMs >= totalSeconds * 1000) {
        clearInterval(timer);
        setWatching(false);
        setShowRewardedAd(false);
        addCoins(10, "Watched rewarded video ad on Hot Sit.");
        toast.success("🎉 +10 BC Added to Your Balance!", {
          description: "You now have extra coins to gift the host!",
        });
      }
    }, intervalMs);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-neutral-950/95 text-white backdrop-blur-2xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid size-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Gift className="size-5" />
                </div>
                <div>
                  <DialogTitle className="font-display text-xl font-bold text-white">
                    Send Gift to Host
                  </DialogTitle>
                  <DialogDescription className="text-xs text-neutral-400">
                    Cheer on Midnight Panda during the Hot Sit stream.
                  </DialogDescription>
                </div>
              </div>

              {/* Coin Balance Chip */}
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <span>🪙</span>
                <span>{coins} BC</span>
              </div>
            </div>
          </DialogHeader>

          {/* Virtual Gifts Selector */}
          <div className="grid grid-cols-3 gap-2.5 my-3">
            {VIRTUAL_GIFTS.map((g) => {
              const isSelected = selectedGift.id === g.id;
              const canAfford = coins >= g.cost;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGift(g)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 border transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105"
                      : "border-white/10 bg-neutral-900/80 hover:bg-neutral-800"
                  }`}
                >
                  <span className="text-3xl filter drop-shadow">{g.emoji}</span>
                  <span className="text-xs font-semibold text-white truncate max-w-full">
                    {g.name}
                  </span>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      canAfford ? "text-amber-400" : "text-neutral-500 line-through"
                    }`}
                  >
                    {g.cost} BC
                  </span>
                </button>
              );
            })}
          </div>

          {/* Earn Free Coins Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-emerald-300">Low on Black Coins?</p>
                <p className="text-[11px] text-emerald-400/80">Watch a 5s ad to get +10 BC</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowRewardedAd(true)}
              className="gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 text-xs px-2.5 rounded-lg"
            >
              <Play className="size-3 fill-current" /> + FREE BC
            </Button>
          </div>

          {/* Footer Action */}
          <div className="pt-2">
            <Button
              onClick={handleSend}
              className="w-full gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white shadow-lg hover:opacity-95 cursor-pointer py-5 text-sm"
            >
              <Gift className="size-4" />
              Send {selectedGift.emoji} {selectedGift.name} ({selectedGift.cost} BC)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rewarded Video Ad Modal for Free Coins */}
      <Dialog open={showRewardedAd} onOpenChange={(o) => !watching && setShowRewardedAd(o)}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-white/10 bg-neutral-950/95 text-white backdrop-blur-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Sparkles className="size-5 text-emerald-400" /> Free Panda Coins
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Watch a quick 5-second rewarded video ad to receive 10 BC immediately into your
              balance.
            </DialogDescription>
          </DialogHeader>

          {/* Player Stage */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black p-4 text-center aspect-video flex flex-col items-center justify-center my-2">
            {watching ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Play className="size-6 fill-current animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-neutral-200">
                    Sponsored Ad Playing… {countdown}s
                  </p>
                  <div className="mx-auto h-1.5 w-44 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <span className="grid size-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-inner">
                  <Sparkles className="size-6 animate-bounce" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Earn +10 BC Instantly</p>
                  <p className="text-[11px] text-neutral-400">No purchase required</p>
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            onClick={startAd}
            disabled={watching}
          >
            <Play className="size-4 fill-current" />
            {watching ? `Playing ad (${countdown}s)…` : "Watch Ad & Earn 10 BC"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
