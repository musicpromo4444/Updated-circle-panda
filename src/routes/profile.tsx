import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Coins,
  Crown,
  Heart,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  User,
  Users,
  Server,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TierBadge } from "@/components/TierBadge";
import { ProfileProgressCard } from "@/components/ProfileProgressCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStore, pandaTier, starRating, TIERS } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { BackendSetupGuideModal } from "@/components/admin/BackendSetupGuideModal";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Panda Profile — Circle Panda" },
      {
        name: "description",
        content:
          "Your anonymous Circle Panda dashboard: coin balance, star rating, Panda tier badge, and activity.",
      },
      { property: "og:title", content: "Your Panda Profile — Circle Panda" },
      {
        property: "og:description",
        content: "Coins, rating, tier badge, and activity in one place.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const {
    coins,
    reputation,
    level,
    xp,
    posts,
    threads,
    groups,
    mySpotlight,
    nominees,
    isVip,
    vipExpiresAt,
  } = useStore();
  const { user, isMasterAdmin, logout } = useCurrentUser();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showBackendGuide, setShowBackendGuide] = useState(false);
  const tier = pandaTier(reputation);
  const myPosts = posts.filter((p) => p.author === "You (anonymous)").length;

  const myCrushEntries = nominees.filter(
    (n) =>
      n.mine ||
      (user?.email && n.userEmail && n.userEmail.toLowerCase() === user.email.toLowerCase()) ||
      (user?.id && n.userId && n.userId === user.id),
  );

  const stats = [
    { label: "Panda Coins", value: `${coins} BC`, icon: Trophy },
    { label: "Rating", value: starRating(reputation).toFixed(1), icon: Star },
    { label: "Posts", value: myPosts, icon: MessageCircle },
    { label: "Chats", value: threads.length, icon: Users },
  ];

  const daysRemaining = vipExpiresAt
    ? Math.max(0, Math.ceil((vipExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AppShell title="Your Profile" subtitle="Anonymous to everyone else. Tracked only for you.">
      <section className="panda-panel rounded-2xl p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-2xl">
            🐼
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold">You (anonymous)</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <TierBadge score={reputation} compact /> {reputation} rep
            </p>
            {mySpotlight ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--coin)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--coin)]">
                <Crown className="size-3.5" /> Spotlight{" "}
                {mySpotlight.kind === "wcw" ? "Queen" : "King"}
              </p>
            ) : null}
            {myCrushEntries.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {myCrushEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    to="/crush"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
                  >
                    <Camera className="size-3.5" />
                    <span>{entry.kind.toUpperCase()} Entry</span>
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] tabular-nums font-bold">
                      {entry.votes} {entry.votes === 1 ? "vote" : "votes"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{tier.blurb}</span>
            <span className="tabular-nums">
              {tier.next ? `${tier.next.min - reputation} rep to ${tier.next.name}` : "Max tier"}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${tier.progress}%` }}
            />
          </div>
        </div>
      </section>

      <ProfileProgressCard level={level} xp={xp} />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="panda-panel rounded-2xl p-3.5">
            <Icon className="size-4 text-primary" />
            <p className="mt-2 font-display text-lg font-semibold tabular-nums">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Coin Store & VIP Banner */}
      <section className="panda-panel mt-4 rounded-2xl p-4 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 border border-primary/25 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/20 text-xl shrink-0">
              🪙
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">
                  Coin Store &amp; VIP Pass
                </h2>
                {isVip ? (
                  <span className="rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                    <Crown className="size-3" /> VIP Active ({daysRemaining}d)
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Starter Pack ($0.50), Panda Popular Pack ($1.00), VIP Passes &amp; scaling bonuses.
              </p>
            </div>
          </div>

          <Link
            to="/store"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <span>Open Coin Store</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      <section className="panda-panel mt-4 rounded-2xl p-4">
        <h2 className="font-display text-lg font-semibold">Panda tiers</h2>
        <div className="mt-3 space-y-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                t.name === tier.name ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
              <span className="shrink-0 tabular-nums">{t.min}+ rep</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/events"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <CalendarDays className="size-4 text-primary" /> Events
        </Link>
        <Link
          to="/dating"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Heart className="size-4 text-[var(--dating)]" /> Dating
        </Link>
        <Link
          to="/groups"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Users className="size-4 text-primary" /> {groups.length} groups
        </Link>
        <Link
          to="/leaders"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Trophy className="size-4 text-primary" /> Leaderboard
        </Link>
      </div>

      <div className="mt-4">
        <div className="panda-panel rounded-2xl p-4 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30">
                <Palette className="size-4.5" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-foreground">Theme & Contrast</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Switch between the original dark aesthetic and high-contrast light mode with
                  preserved card transparency and frosted glass blur.
                </p>
              </div>
            </div>
          </div>
          <ThemeToggle variant="segment" />
        </div>
      </div>

      {/* Admin Dashboard: Exclusively displayed when logged in as reply.stagepro@gmail.com */}
      {isMasterAdmin ? (
        <div className="mt-4">
          <div className="panda-panel rounded-2xl p-4 transition-colors border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <ShieldCheck className="size-5 text-emerald-500" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold text-foreground">
                      Admin Dashboard
                    </p>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-500">
                      Master Admin
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authorized account ({user?.email}) · Full platform management access.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Shield className="size-3.5" />
                  <span>Open Admin Dashboard →</span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    toast.info("Signed out of master admin account");
                  }}
                  className="h-8 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  title="Sign out of master admin"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Account Session Management */}
      <div className="mt-4">
        <div className="panda-panel rounded-2xl p-4 transition-colors">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground border border-border">
                <User className="size-4.5" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-foreground">Account Session</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.email
                    ? `Logged in as ${user.email} (${user.name || "Anonymous"})`
                    : "Browsing anonymously as Guest Panda"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              {user ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void logout();
                    toast.info("Signed out of account");
                  }}
                  className="h-8 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <LogOut className="size-3.5 mr-1.5" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignInModal(true)}
                  className="h-8 rounded-xl border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                >
                  <LogIn className="size-3.5 mr-1.5" />
                  Sign In / Sign Up
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Production Backend & Database Card */}
      <div className="mt-4">
        <div className="panda-panel rounded-2xl p-4 transition-colors border border-border/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Server className="size-4.5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-foreground">
                    Supabase &amp; Production Database
                  </p>
                  <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold uppercase text-primary">
                    Realtime &amp; RLS
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Row-Level Security, Real-Time WebSockets, and server-side Black Coin transactions.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBackendGuide(true)}
              className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer shrink-0"
            >
              <Radio className="size-3 text-emerald-500" />
              Backend Setup Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        open={showSignInModal}
        onOpenChange={setShowSignInModal}
        onOpenBackendGuide={() => setShowBackendGuide(true)}
      />

      {/* Backend & Deployment Guide Modal */}
      <BackendSetupGuideModal open={showBackendGuide} onOpenChange={setShowBackendGuide} />
    </AppShell>
  );
}
