import { Crown, Lock, Sparkles, Gift, Calendar, BarChart3, Mic, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface VipUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VipUpgradeModal({ open, onOpenChange }: VipUpgradeModalProps) {
  const navigate = useNavigate();
  const { activateVip, coins } = useStore();

  const handleQuickActivate = () => {
    activateVip(7);
    toast.success("👑 VIP Pass Activated! Welcome to the VIP Lounge!");
    onOpenChange(false);
  };

  const handleGoToStore = () => {
    onOpenChange(false);
    void navigate({ to: "/store" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-amber-400/40 bg-gradient-to-b from-card via-card to-amber-950/20 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/20 to-yellow-600/30 text-3xl shadow-[0_0_25px_rgba(245,158,11,0.35)]">
            🔐
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-bold tracking-wide text-amber-500">
            <Crown className="size-3.5 text-amber-500" />
            VIP LOUNGE RESTRICTED
          </div>
          <DialogTitle className="mt-2 text-2xl font-bold tracking-tight text-foreground font-display">
            VIP Members Only
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            The VIP Lounge is a private haven for elite campus members. Upgrade your membership to
            unlock full access.
          </DialogDescription>
        </DialogHeader>

        {/* Perks list */}
        <div className="my-2 space-y-2.5 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3.5 text-left">
          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-500">
              <Calendar className="size-4" />
            </span>
            <span className="text-foreground">
              <strong className="font-semibold text-foreground">Host VIP Events</strong> — Schedule
              mixers, AMA sessions & private meetups
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-500">
              <Gift className="size-4" />
            </span>
            <span className="text-foreground">
              <strong className="font-semibold text-foreground">Run & Win Giveaways</strong> — Drops
              of Black Coins, gift passes & merch
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-500">
              <BarChart3 className="size-4" />
            </span>
            <span className="text-foreground">
              <strong className="font-semibold text-foreground">Post Exclusive Polls</strong> —
              Gauge campus opinion with verified voters
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-500">
              <Mic className="size-4" />
            </span>
            <span className="text-foreground">
              <strong className="font-semibold text-foreground">Voice & Video Notes</strong> — Drop
              authentic media directly into the lounge
            </span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleGoToStore}
            className="w-full gap-2 border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-500 font-semibold text-neutral-950 shadow-md transition-all hover:brightness-105"
          >
            <Sparkles className="size-4" />
            Get VIP Pass in Store
            <ArrowRight className="size-4" />
          </Button>

          <Button
            variant="outline"
            onClick={handleQuickActivate}
            className="w-full gap-2 border-dashed border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Crown className="size-4 text-amber-500" />
            Unlock 7-Day VIP Instant Access (Demo)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
