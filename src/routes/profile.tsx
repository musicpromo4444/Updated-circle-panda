import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Coins,
  Crown,
  Heart,
  MessageCircle,
  Bell,
  Palette,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TierBadge } from "@/components/TierBadge";
import { ProfileProgressCard } from "@/components/ProfileProgressCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStore, pandaTier, starRating, TIERS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const HEADS = ["🐼", "🐼🎩", "🐼🧢", "🐼👑", "🐼🎧", "🐼🎀"];
  const GLASSES = ["", "🕶️", "👓", "🥽"];
  const FACES = ["", "😊", "😎", "😴", "😏"];
  const COSMETICS = ["", "✨", "🔥", "🌸", "💎", "⚡", "🦋", "🌈"];
  const [avatar, setAvatar] = useState("🐼");
  const [accountGender, setAccountGender] = useState<"male" | "female" | null>(null);
  const [avatarHead, setAvatarHead] = useState("🐼");
  const [avatarGlasses, setAvatarGlasses] = useState("");
  const [avatarFace, setAvatarFace] = useState("");
  const [avatarCosmetic, setAvatarCosmetic] = useState("");
  const composeAvatar = (head=avatarHead, glasses=avatarGlasses, face=avatarFace, cosmetic=avatarCosmetic) => `${head}${glasses}${face}${cosmetic}`;
  useEffect(() => { void supabase.auth.getUser().then(({data}) => { if (!data.user) return; void (supabase as any).from("profiles").select("avatar_url,gender").eq("id",data.user.id).maybeSingle().then((r:any)=>{ if (r.data?.avatar_url) setAvatar(r.data.avatar_url); if (r.data?.gender === "male" || r.data?.gender === "female") setAccountGender(r.data.gender); }); }); }, []);
  const saveAvatar = (next:string) => {
    void (supabase as any).rpc("set_panda_avatar_secure", { p_avatar: next }).then(({ data, error }: any) => {
      if (error) { toast.error(error.message ?? "Avatar could not be updated"); return; }
      setAvatar(data ?? next);
      toast.success("Panda avatar updated 🐼");
    });
  };
  const { coins, reputation, level, xp, posts, threads, groups, mySpotlight, isVip, vipExpiresAt } =
    useStore();
  const tier = pandaTier(reputation);
  const myPosts = posts.filter((p) => p.author === "You (anonymous)").length;

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
            {avatar}
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

      <section className="panda-panel mt-4 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-display text-base font-semibold">Account gender</h2><p className="mt-1 text-xs text-muted-foreground">Used only to route your Crush submission automatically: male → MCM, female → WCW.</p></div>
          <span className="text-xl">{accountGender === "male" ? "🧑" : accountGender === "female" ? "👩" : "🐼"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["female","male"] as const).map((g) => <button key={g} type="button" disabled={Boolean(accountGender && accountGender !== g)} onClick={() => void (async () => { const { data, error } = await (supabase as any).rpc("set_profile_gender_secure", { p_gender:g }); if (error) { toast.error(error.message); return; } setAccountGender(data); toast.success("Account gender saved"); })()} className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${accountGender===g?"border-primary bg-primary/10":"border-border bg-secondary/40"}`}>{g === "female" ? "Female · WCW" : "Male · MCM"}</button>)}
        </div>
        {accountGender ? <p className="mt-2 text-[10px] text-muted-foreground">Locked after registration so MCM/WCW routing cannot change between submissions.</p> : null}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="panda-panel rounded-2xl p-3.5">
            <Icon className="size-4 text-primary" />
            <p className="mt-2 font-display text-lg font-semibold tabular-nums">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="panda-panel mt-4 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-xl">🎨</span>
          <div><h2 className="font-display text-lg font-semibold">Panda Avatar Studio</h2><p className="text-xs text-muted-foreground">Built-in Panda looks only — choose your head, glasses, face style and cosmetic. Personal photo uploads are not used.</p></div>
        </div>
        <div className="mt-4 grid gap-4">
          {[
            ["Head / hat", HEADS, avatarHead, setAvatarHead],
            ["Eyeglasses", GLASSES, avatarGlasses, setAvatarGlasses],
            ["Face style", FACES, avatarFace, setAvatarFace],
            ["Cosmetics", COSMETICS, avatarCosmetic, setAvatarCosmetic],
          ].map(([label, values, selected, setter]: any) => (
            <div key={label as string}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label as string}</p>
              <div className="flex flex-wrap gap-2">
                {(values as string[]).map((value) => (
                  <button key={`${label}-${value}`} type="button" onClick={() => { setter(value); const next = composeAvatar(label === "Head / hat" ? value : avatarHead, label === "Eyeglasses" ? value : avatarGlasses, label === "Face style" ? value : avatarFace, label === "Cosmetics" ? value : avatarCosmetic); saveAvatar(next); }} className={`grid min-h-11 min-w-11 place-items-center rounded-xl border px-2 text-xl transition-transform hover:scale-105 ${selected===value?"border-primary bg-primary/10":"border-border bg-secondary/40"}`}>{value || "None"}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl">{avatar}</span>
          <div><p className="font-semibold">Your current Panda</p><p className="text-xs text-muted-foreground">Generated from built-in customization parts. You can change it anytime.</p></div>
        </div>
      </section>

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
        <Link
          to="/notifications"
          className="panda-panel flex items-center gap-2 rounded-2xl p-4 text-sm font-medium"
        >
          <Bell className="size-4 text-primary" /> Notifications
        </Link>
      </div>


    </AppShell>
  );
}
