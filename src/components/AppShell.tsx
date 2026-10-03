import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Gift,
  Heart,
  MessageSquare,
  Play,
  Sparkles,
  User,
  Users,
  Shield,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useStore, pandaTier } from "@/lib/store";
import { DailyRewardPopup } from "@/components/DailyRewardPopup";
import { SweepstakeNavIcon } from "@/components/ads/SweepstakeNavIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UniversalFloatingCampaign } from "@/components/UniversalFloatingCampaign";

const TABS = [
  { to: "/", label: "Confessions", icon: MessageSquare },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/dating", label: "Dating", icon: Heart },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/groups", label: "Groups", icon: Users },
] as const;

/** Server-configured global action slot shown consistently above the bottom navigation. */
export function GlobalActionWidget() {
  const [config, setConfig] = useState<{enabled:boolean;destination:string;icon:string;label:string}>({
    enabled: false, destination: "/hot-seat", icon: "🔥", label: "HOT SEAT",
  });

  useEffect(() => {
    let active = true;
    void (supabase as any).rpc("get_global_action_slot").then(({ data }: any) => {
      if (!active || !data) return;
      setConfig({
        enabled: Boolean(data.enabled),
        destination: String(data.destination || "/hot-seat"),
        icon: String(data.icon || "🔥"),
        label: String(data.label || "HOT SEAT"),
      });
    });
    return () => { active = false; };
  }, []);

  if (!config.enabled) return null;
  return (
    <Link
      to={config.destination as any}
      id="global-action-slot"
      aria-label={config.label}
      className="fixed bottom-[4.75rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-orange-400/40 bg-black/90 px-2 py-2 pr-3 shadow-[0_4px_28px_rgba(234,88,12,0.4)] backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 group select-none"
    >
      <div className="relative flex size-11 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 p-[2px] shadow-[0_4px_24px_rgba(234,88,12,0.65)] transition-all duration-300 group-hover:shadow-[0_4px_34px_rgba(234,88,12,0.9)]">
        <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping pointer-events-none duration-1000" />
        <div className="relative flex size-full items-center justify-center rounded-full bg-gradient-to-b from-[#240b04] via-[#140602] to-[#080201] border border-orange-400/50 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_75%,rgba(249,115,22,0.5),rgba(220,38,38,0.25)_50%,transparent_75%)]" />
          <span className="relative text-2xl leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]" aria-hidden>{config.icon}</span>
        </div>
      </div>
      <span className="max-w-32 truncate font-display text-[10px] font-black uppercase tracking-wider text-orange-300">
        {config.label}
      </span>
    </Link>
  );
}

function ActionCelebration() {
  const [action, setAction] = useState<{ title: string; emoji: string } | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.title) return;
      setAction({ title: String(detail.title), emoji: String(detail.emoji ?? "✨") });
      window.setTimeout(() => setAction(null), 1700);
    };
    window.addEventListener("circle-panda-action", handler);
    return () => window.removeEventListener("circle-panda-action", handler);
  }, []);
  if (!action) return null;
  return <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-6"><div className="animate-in zoom-in-75 fade-in duration-300 rounded-3xl border border-primary/30 bg-background/90 px-8 py-6 text-center shadow-2xl backdrop-blur-xl"><div className="animate-bounce text-5xl">{action.emoji}</div><p className="mt-2 font-display text-xl font-black">{action.title}</p><div className="mx-auto mt-3 h-1 w-24 overflow-hidden rounded-full bg-primary/15"><div className="h-full w-full origin-left animate-[scale-x_1.4s_ease-out] bg-primary" /></div></div></div>;
}

export function BottomNav() {
  const { pathname } = useLocation();
  const pageKey = pathname === "/" ? "home" : pathname.replace(/^\/+/, "").split("/")[0] || "home";
  return (
    <>
      <UniversalFloatingCampaign pageKey={pageKey} />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="cp-interactive flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary"
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

/** Coin balance chip with Gold Coin Icon, Remaining Balance, and green + FREE button */
export function CoinCounter() {
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
          "coin-chip flex items-center gap-2 rounded-full py-1 pr-1 pl-2.5 font-display text-xs sm:text-sm font-semibold tabular-nums border border-amber-500/30 bg-secondary/80 backdrop-blur-md shadow-sm transition-transform duration-300",
          delta !== null && "scale-105",
        )}
      >
        {/* Gold Coin Icon */}
        <span
          className="text-sm sm:text-base select-none leading-none drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]"
          aria-hidden
        >
          🪙
        </span>

        {/* Remaining Balance display (e.g., "100 BC") */}
        <span className="font-display text-xs sm:text-sm font-bold tabular-nums text-foreground">
          {coins} BC
        </span>

        {/* Green + FREE button triggering rewarded video ad modal */}
        <FreeCoinsButton />
      </span>

      {delta !== null ? (
        <span
          className={cn(
            "absolute -bottom-4 right-1 text-[11px] font-semibold tabular-nums",
            delta > 0 ? "text-emerald-500 font-bold" : "text-destructive",
          )}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  );
}

/** "+ FREE" button (styled in green) that triggers the rewarded video ad modal. */
export function FreeCoinsButton() {
  const { syncCoins } = useStore();
  const [open, setOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);
  const [adVideoUrl, setAdVideoUrl] = useState<string | null>(null);
  const [adPosterUrl, setAdPosterUrl] = useState<string | null>(null);
  const [adSponsor, setAdSponsor] = useState<string | null>(null);

  const startAd = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await (supabase as any).rpc("start_free_coins_rewarded_ad");
      if (error) throw error;

      const totalSeconds = Math.max(1, Number(data?.duration_seconds ?? 5));
      setAdVideoUrl(data?.video_url ? String(data.video_url) : null);
      setAdPosterUrl(data?.poster_url ? String(data.poster_url) : null);
      setAdSponsor(data?.sponsor ? String(data.sponsor) : null);
      setWatching(true);
      setCountdown(totalSeconds);
      setProgress(0);

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
          void (async () => {
            const { data: completed, error: completionError } = await (supabase as any).rpc("complete_rewarded_ad_session", {
              p_session_id: data.session_id,
            });
            setWatching(false);
            if (completionError) {
              toast.error(completionError.message ?? "Reward could not be claimed");
              return;
            }
            setOpen(false);
            await syncCoins();
            toast.success(`🎉 +${Number(completed?.reward_bc ?? 30)} BC Added!`, {
              description: "Sponsored video completed and your Panda Coins were credited.",
            });
          })();
        }
      }, intervalMs);
    } catch (error: any) {
      setWatching(false);
      toast.error(error?.message ?? "Sponsored video unavailable");
    }
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
            Watch a quick rewarded video ad to receive 30 BC immediately into your balance.
          </DialogDescription>

          {/* Ad Video Player Stage */}
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-neutral-950 p-4 text-center aspect-video flex flex-col items-center justify-center">
            {watching ? (
              <div className="flex w-full flex-col items-center gap-2">
                {adVideoUrl ? (
                  <video
                    className="h-full w-full rounded-lg object-cover"
                    src={adVideoUrl}
                    poster={adPosterUrl ?? undefined}
                    autoPlay
                    playsInline
                    controls={false}
                    onContextMenu={(event) => event.preventDefault()}
                  />
                ) : (
                  <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Play className="size-6 fill-current animate-pulse" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-neutral-200">
                    {adSponsor ? `${adSponsor} · ` : ""}Sponsored Ad Playing… {countdown}s
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
                  <p className="text-sm font-semibold text-neutral-200">Earn +30 BC for Free</p>
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
            {watching ? `Playing ad (${countdown}s)…` : "Watch Ad & Earn 30 BC"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let channel: any;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await (supabase as any).rpc("get_my_notification_count");
      if (!cancelled) setUnread(Number(data ?? 0));
      channel = (supabase as any)
        .channel(`circle-panda-notification-badge-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_notifications", filter: `user_id=eq.${uid}` }, () => {
          setUnread((value) => value + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cp_notifications", filter: `user_id=eq.${uid}` }, () => {
          void (async () => {
            const { data: count } = await (supabase as any).rpc("get_my_notification_count");
            if (!cancelled) setUnread(Number(count ?? 0));
          })();
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) void (supabase as any).removeChannel(channel);
    };
  }, []);

  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      title="Notifications"
      className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-sm transition-colors hover:border-primary/60 data-[status=active]:border-primary"
    >
      <Bell className="size-4 text-muted-foreground" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-primary px-1 text-center text-[9px] font-bold leading-4 text-primary-foreground shadow-sm">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function RequireSession({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session?.user) {
        await navigate({ to: "/", replace: true });
        return;
      }
      setChecking(false);
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) void navigate({ to: "/", replace: true });
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [navigate]);
  if (checking) return <div className="min-h-screen bg-background" />;
  return <>{children}</>;
}

export function AppShell({
  title,
  subtitle,
  children,
  wide = false,
  hidePageHeader = false,
  immersive = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  hidePageHeader?: boolean;
  immersive?: boolean;
}) {
  const { reputation, isAdmin } = useStore();
  const tier = pandaTier(reputation);

  return (
    <div className={cn("min-h-screen", !immersive && "pb-24")}>
      {!immersive ? <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0">
              <span className="block truncate whitespace-nowrap font-display text-lg leading-none font-semibold">
                Circle Panda 🐼
              </span>
              <span className="block truncate whitespace-nowrap text-[11px] text-muted-foreground">
                {tier.emoji} {tier.name} · {reputation} rep
              </span>
            </span>
          </Link>
          <CoinCounter />
          <NotificationBell />
          <Link
            to="/sweepstakes"
            aria-label="Panda Sweepstakes"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent text-[var(--coin)] shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all hover:border-[var(--coin)]/80 hover:shadow-[0_0_16px_rgba(245,158,11,0.45)] data-[status=active]:border-[var(--coin)]"
          >
            <SweepstakeNavIcon className="scale-75" />
          </Link>
          <ThemeToggle variant="header" />
          <Link
            to="/profile"
            aria-label="Your profile"
            className="cp-interactive grid size-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-sm transition-colors hover:border-primary/60 data-[status=active]:border-primary"
          >
            <User className="size-4.5 text-muted-foreground" />
          </Link>
        </div>
      </header> : null}

      <main className={cn("mx-auto w-full cp-page-enter", !immersive && "px-4 pt-4", wide ? "max-w-6xl" : "max-w-3xl")}>
        {!hidePageHeader ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {isAdmin ? (
              <div className="flex shrink-0">
                <Link to="/admin-dashboard" className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10">
                  <Shield className="size-3.5" /> Admin
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>

      {!immersive ? <BottomNav /> : null}
      {!immersive ? <ActionCelebration /> : null}
      {!immersive ? <DailyRewardPopup /> : null}
    </div>
  );
}
