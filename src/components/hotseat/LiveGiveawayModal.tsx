import { Clock, Gift, Sparkles, Trophy, Users, X, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LiveGiveawayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostName?: string;
}

export function LiveGiveawayModal({
  open,
  onOpenChange,
  hostName = "Midnight Panda",
}: LiveGiveawayModalProps) {
  const [hasEntered, setHasEntered] = useState(false);
  const [entryCount, setEntryCount] = useState(184);

  const handleEnter = () => {
    if (hasEntered) return;
    setHasEntered(true);
    setEntryCount((prev) => prev + 1);
    toast.success("🎁 Entered Live Stream Giveaway!", {
      description:
        "Ticket #CP-" +
        Math.floor(1000 + Math.random() * 9000) +
        " confirmed. Winner drawn when Hot Sit ends!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border border-amber-500/30 bg-neutral-950/95 p-5 text-white backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.25)] rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-300">
            <span className="grid size-8 place-items-center rounded-full bg-amber-500/20 border border-amber-500/40 text-lg">
              🎁
            </span>
            Live Stream Giveaway
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Main Prize Card */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent p-4 text-center relative overflow-hidden">
            <div className="animate-giveaway-spin absolute -top-8 -right-8 size-24 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-500/30 mb-2">
              <Sparkles className="size-3" /> Exclusive Hot Sit Drop
            </span>

            <h3 className="text-xl font-black text-white tracking-tight">1,000 Panda Coins (BC)</h3>
            <p className="text-xs text-amber-200/90 font-medium mt-0.5">
              + 1 Month Circle Panda VIP Gold Badge
            </p>

            <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-neutral-300 border-t border-white/10 pt-2.5">
              <span className="flex items-center gap-1">
                <Users className="size-3 text-orange-400" />
                <strong className="text-white font-bold">{entryCount}</strong> viewers
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3 text-amber-400" /> Ends with Hot Sit
              </span>
            </div>
          </div>

          {/* Host shoutout notice */}
          <div className="rounded-lg bg-neutral-900/80 border border-white/10 p-3 text-xs text-neutral-300 leading-relaxed">
            <p className="font-semibold text-white flex items-center gap-1.5 mb-1">
              <Trophy className="size-3.5 text-amber-400" /> Hosted by {hostName}
            </p>
            Winners are automatically chosen by provably fair random selection when the 24-hour Hot
            Sit session concludes.
          </div>

          {/* Action Button */}
          <Button
            onClick={handleEnter}
            disabled={hasEntered}
            className={`w-full py-2.5 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              hasEntered
                ? "bg-emerald-600 text-white hover:bg-emerald-600 border border-emerald-500/40"
                : "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black font-extrabold hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            }`}
          >
            {hasEntered ? (
              <span className="flex items-center gap-1.5">
                <Check className="size-4" /> Entry Confirmed
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Gift className="size-4" /> Enter Giveaway (Free)
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
