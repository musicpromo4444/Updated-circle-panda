import { useState } from "react";
import {
  Crown,
  Lock,
  Sparkles,
  ChevronRight,
  Calendar,
  Gift,
  BarChart3,
  Mic,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { VipLoungeSpace } from "./VipLoungeSpace";
import { VipUpgradeModal } from "./VipUpgradeModal";

export function VipLoungeCard() {
  const { isVip, vipExpiresAt } = useStore();
  const [loungeOpen, setLoungeOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleClick = () => {
    if (isVip) {
      setLoungeOpen(true);
    } else {
      setUpgradeOpen(true);
    }
  };

  const daysRemaining = vipExpiresAt
    ? Math.max(0, Math.ceil((vipExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <>
      <section
        id="vip-lounge-card"
        onClick={handleClick}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/15 via-card to-amber-950/25 p-4 shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50 transition-all duration-300 hover:border-amber-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]"
      >
        {/* Glowing aura effect */}
        <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-amber-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-36 rounded-full bg-yellow-500/15 blur-2xl" />

        <div className="relative z-10">
          {/* Top Bar: Unique Badge and Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-yellow-500/30 to-amber-500/25 px-3 py-1 text-xs font-black tracking-wider text-amber-500 dark:text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35)]">
                <Crown className="size-3.5 text-amber-500 fill-amber-500/30" />
                VIP EXCLUSIVE
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500/90">
                <Sparkles className="size-3" /> Campus Lounge
              </span>
            </div>

            {isVip ? (
              <span
                suppressHydrationWarning
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500"
              >
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                VIP Active {daysRemaining > 0 ? `(${daysRemaining}d)` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                <Lock className="size-3" /> 🔐 Restricted
              </span>
            )}
          </div>

          {/* Main Content Area */}
          <div className="mt-3.5 flex items-start gap-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-400/60 bg-gradient-to-br from-amber-500/30 to-yellow-600/30 text-2xl shadow-[0_0_18px_rgba(245,158,11,0.35)] transition-transform group-hover:scale-105">
              👑
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-black tracking-tight text-foreground sm:text-xl">
                  VIP Lounge
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Elite space to host events, run giveaways, post poll questions, and drop voice/video
                notes.
              </p>

              {/* Feature Pills */}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                  <Calendar className="size-3" /> Events
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                  <Gift className="size-3" /> Giveaways
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                  <BarChart3 className="size-3" /> Polls
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                  <Mic className="size-3" /> Voice & Video Notes
                </span>
              </div>
            </div>
          </div>

          {/* NORMAL MEMBER LOCKED OVERLAY */}
          {!isVip && (
            <div className="mt-3.5 rounded-xl border border-amber-400/30 bg-amber-950/25 p-3 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-amber-400/90 font-medium">
                  <span className="text-base">🔐</span>
                  <span>
                    Locked for normal members. <strong>Upgrade to VIP</strong> to host events & drop
                    media.
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUpgradeOpen(true);
                  }}
                  className="shrink-0 gap-1.5 border border-amber-400/50 bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-neutral-950 shadow-sm hover:brightness-105"
                >
                  <Sparkles className="size-3.5" />
                  Upgrade to VIP
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* VIP MEMBER ENTER CTA */}
          {isVip && (
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs">
              <span className="font-semibold text-amber-500 flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Tap to open the VIP Lounge
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-500">
                Enter Space <ChevronRight className="size-4" />
              </span>
            </div>
          )}
        </div>
      </section>

      {/* VIP Space Dialog for VIP Members */}
      <VipLoungeSpace open={loungeOpen} onOpenChange={setLoungeOpen} />

      {/* Upgrade Modal for Normal Members */}
      <VipUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
