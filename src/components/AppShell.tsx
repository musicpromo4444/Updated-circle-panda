import { Link } from "@tanstack/react-router";
import {
  Armchair,
  Calendar,
  Flame,
  Gift,
  Heart,
  MessageSquare,
  Play,
  Sparkles,
  Trophy,
  Users,
  Home,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useStore, pandaTier } from "@/lib/store";
import { DailyRewardPopup } from "@/components/DailyRewardPopup";
import { SweepstakeNavIcon } from "@/components/ads/SweepstakeNavIcon";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/dating", label: "Dating", icon: Heart },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/groups", label: "Groups", icon: Users },
] as const;

const QUICK = [{ to: "/leaders", label: "Leaders", icon: Trophy }] as const;

/** Floating interactive widget positioned above the bottom navigation bar on the left */
export function FloatingHotSeatWidget() {
  return (
    <Link
      to="/hot-seat"
      id="floating-hot-sit-widget"
      aria-label="Sit on the Hot Sit"
      className="fixed bottom-[4.75rem] left-4 sm:bottom-20 sm:left-6 z-40 flex flex-col items-center gap-1 group select-none transition-transform hover:scale-105 active:scale-95"
    >
      <div className="relative flex size-14 sm:size-16 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 p-[2.5px] shadow-[0_4px_24px_rgba(234,88,12,0.65)] transition-all duration-300 group-hover:shadow-[0_4px_34px_rgba(234,88,12,0.9)]">
        {/* Pulsing fire aura */}
        <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping pointer-events-none duration-1000" />

        <div className="relative flex size-full items-center justify-center rounded-full bg-gradient-to-b from-[#240b04] via-[#140602] to-[#080201] border border-orange-400/50 overflow-hidden">
          {/* Internal fire gradient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_75%,rgba(249,115,22,0.5),rgba(220,38,38,0.25)_50%,transparent_75%)]" />

          {/* Seat on fire: Armchair with vibrant Flame burning on the seat */}
          <div className="relative flex items-center justify-center">
            <Armchair className="size-7 sm:size-8 text-amber-100/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] stroke-[2.2]" />
            <Flame className="absolute -top-1.5 size-5 sm:size-6 text-orange-400 fill-amber-300 drop-shadow-[0_0_10px_rgba(249,115,22,1)] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Bold "HOT SIT" label directly underneath */}
      <span className="rounded-md border border-orange-500/50 bg-black/90 px-2 py-0.5 font-display text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-orange-400 shadow-[0_2px_8px_rgba(0,0,0,0.85)] backdrop-blur-md">
        HOT SIT
      </span>
    </Link>
  );
}

export function BottomNav() {
  return (
    <>
      <FloatingHotSeatWidget />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary"
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="truncate">{label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

/** Clean Coin balance display with Gold Coin Logo and balance text — no outer container box, placeholder, or border */
export function CoinBalanceDisplay() {
  const { coins } = useStore();
  const prev = useRef(coins);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (prev.current !== coins) {
      setDelta(coins - prev.current);
      prev.current = coins;
      const t = setTimeout(() => setDelta(null), 1400);
      return () => clearTimeout(t);
    }
    return;
  }, [coins]);

  return (
    <span className="relative shrink-0 flex items-center">
      <span
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 font-display text-xs sm:text-sm font-bold tabular-nums text-foreground select-none transition-transform duration-300",
          delta !== null && "scale-105",
        )}
      >
        {/* Gold Coin Icon */}
        <span
          className="text-base sm:text-lg select-none leading-none drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]"
          aria-hidden
        >
          🪙
        </span>

        {/* Clean Remaining Balance display (e.g., "100 BC") */}
        <span>{coins} BC</span>
      </span>

      {delta !== null ? (
        <span
          className={cn(
            "pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold tabular-nums whitespace-nowrap",
            delta > 0 ? "text-emerald-500 font-bold" : "text-destructive",
          )}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  );
}

// Backwards-compatible alias for existing consumers
export const CoinCounter = CoinBalanceDisplay;

/** "+ FREE" button (styled in green) that triggers the rewarded video ad modal. */
export function FreeCoinsButton() {
  const { addCoins } = useStore();
  const [open, setOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);

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
        setOpen(false);
        addCoins(10, "Watched rewarded video ad.");
        toast.success("🎉 +10 BC Added!", {
          description: "Free Panda Coins credited directly to your balance.",
        });
      }
    }, intervalMs);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Get free Panda Coins"
        className="flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.35)] cursor-pointer"
      >
        + FREE
      </button>

      <Dialog open={open} onOpenChange={(o) => !watching && setOpen(o)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Gift className="size-5 text-emerald-500" /> Free Panda Coins
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Watch a quick 5-second rewarded video ad to receive 10 BC immediately into your balance.
          </DialogDescription>

          {/* Ad Video Player Stage */}
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-neutral-950 p-4 text-center aspect-video flex flex-col items-center justify-center">
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
                <span className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-inner">
                  <Sparkles className="size-6 animate-bounce" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Earn +10 BC for Free</p>
                  <p className="text-[11px] text-neutral-400">No purchase required</p>
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            onClick={startAd}
            disabled={watching}
          >
            <Play className="size-4 fill-current" />{" "}
            {watching ? `Playing ad (${countdown}s)…` : "Watch Ad & Earn 10 BC"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
  wide = false,
  hidePageHeader = false,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  hidePageHeader?: boolean;
}) {
  const { reputation } = useStore();
  const tier = pandaTier(reputation);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          {/* 1. Panda App Logo (click to open profile settings) */}
          <Link
            to="/profile"
            aria-label="Circle Panda Profile & Settings"
            title="Circle Panda Profile & Settings"
            className="flex min-w-0 flex-1 items-center gap-2.5 group transition-opacity hover:opacity-90 cursor-pointer"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-lg border border-primary/25 shadow-xs select-none transition-transform group-hover:scale-105">
              🐼
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base sm:text-lg leading-tight font-bold text-foreground">
                Circle Panda
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {tier.emoji} {tier.name} · {reputation} rep
              </span>
            </span>
          </Link>

          {/* 2. Coin Balance with Coin Logo (clean display with no outer container box, placeholder, or border) */}
          <CoinBalanceDisplay />

          {/* 3. "+ FREE" Button (triggers rewarded video ads / offerwall) */}
          <FreeCoinsButton />

          {/* 4. Sweepstake / Giveaway Icon */}
          <Link
            to="/sweepstakes"
            aria-label="Panda Sweepstakes & Giveaways"
            title="Panda Sweepstakes & Giveaways"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent text-[var(--coin)] shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all hover:border-[var(--coin)]/80 hover:shadow-[0_0_16px_rgba(245,158,11,0.45)] data-[status=active]:border-[var(--coin)]"
          >
            <SweepstakeNavIcon className="scale-75" />
          </Link>
        </div>
      </header>

      <main className={cn("mx-auto w-full px-4 pt-4", wide ? "max-w-6xl" : "max-w-3xl")}>
        {!hidePageHeader ? (
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold">{title}</h1>
              {subtitle ? (
                <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {QUICK.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary/50 data-[status=active]:text-primary"
                >
                  <Icon className="size-3.5" /> {label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {children}
      </main>

      <BottomNav />
      <DailyRewardPopup />
    </div>
  );
}
