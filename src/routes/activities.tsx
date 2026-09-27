import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Coins, Gamepad2, Gift, Loader2, Users, CalendarDays, Heart, Music2, Trophy, Sparkles, Target, Shuffle, Box, Spade, Timer, Play, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { SpinWheel } from "@/components/SpinWheel";
import { PlayableVideoAd } from "@/components/ads/PlayableVideoAd";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Activities & Games — Circle Panda" }] }),
  component: ActivitiesPage,
});

type Activity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  reward_bc: number;
  requires_ad: boolean;
  completed: boolean;
  last_completed_at: string | null;
};

const actionMap: Record<string, { to: string; label: string }> = {
  create_event: { to: "/events", label: "Create event" },
  event_created: { to: "/events", label: "Create event" },
  post_confession: { to: "/confessions", label: "Write confession" },
  confession_created: { to: "/confessions", label: "Write confession" },
  attend_event: { to: "/events", label: "Find an event" },
  event_attended: { to: "/events", label: "Find an event" },
  join_group: { to: "/groups", label: "Find a group" },
  react_content: { to: "/", label: "Explore feed" },
  invite_friend: { to: "/profile", label: "Open profile" },
  music_time: { to: "/music-time", label: "Open Music Time" },
};

const GAME_META: Record<string, { icon: string; label: string }> = {
  wheel_spin: { icon: "🎡", label: "Lucky Wheel" },
  mystery_box: { icon: "🎁", label: "Mystery Box" },
  target: { icon: "🎯", label: "Panda Target" },
  guess_sponsor: { icon: "🃏", label: "Guess the Sponsor" },
  puzzle: { icon: "🧩", label: "Panda Puzzle" },
  coin_drop: { icon: "🪙", label: "Coin Drop" },
  slots: { icon: "🎰", label: "Panda Slots" },
  lucky_card: { icon: "🃏", label: "Lucky Card" },
  secret_reveal: { icon: "🕵️", label: "Secret Reveal" },
  playable_ad: { icon: "▶️", label: "Just Playbo Ads" },
  cup_shuffle: { icon: "🥤", label: "Panda Cup Shuffle" },
};

function iconFor(type: string) {
  if (type.includes("group")) return Users;
  if (type.includes("event")) return CalendarDays;
  if (type.includes("confession")) return Heart;
  if (type.includes("music")) return Music2;
  if (type.includes("play")) return Gamepad2;
  if (type.includes("login")) return Gift;
  return Sparkles;
}

function SponsorCard({ compact = false }: { compact?: boolean }) {
  return <div className={`rounded-2xl border border-border/70 bg-card overflow-hidden ${compact ? "" : "mb-3"}`}>
    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Sponsored</span>
      <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">AD</span>
    </div>
    <div className="p-3">
      <p className="text-sm font-semibold">Circle Panda sponsor</p>
      <p className="mt-1 text-xs text-muted-foreground">A short sponsor message appears before the result reveal.</p>
    </div>
  </div>;
}

function GameModal({ activity, onClose, onDone }: { activity: Activity; onClose: () => void; onDone: () => void }) {
  const { syncCoins } = useStore();
  const slug = activity.activity_type;
  const [phase, setPhase] = useState<"play" | "ad" | "result">("play");
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(slug === "coin_drop" || slug === "slots" ? 60 : 0);
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [targetHits, setTargetHits] = useState(0);
  const [puzzle, setPuzzle] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [secretPieces, setSecretPieces] = useState<string[]>([]);
  const [secretAnswer, setSecretAnswer] = useState<string[]>([]);
  const [secretSolved, setSecretSolved] = useState(false);
  const [adDone, setAdDone] = useState(false);

  const completeStandard = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_instant_daily_activity", { p_activity_id: activity.id });
    setBusy(false);
    if (error) { toast.error(error.message ?? "Activity could not be completed"); return; }
    const bc = Number(data?.bc_awarded ?? 0);
    setReward(bc);
    await syncCoins();
    setPhase("result");
  };

  const startTimed = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_timed_daily_activity", { p_slug: slug, p_action: "start" });
    setBusy(false);
    if (error) { toast.error(error.message ?? "Could not start the game"); return; }
    setTimer(Number(data?.seconds ?? 60));
    setStarted(true);
  };

  useEffect(() => {
    if (!started || timer <= 0) return;
    const t = window.setInterval(() => setTimer((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(t);
  }, [started, timer]);

  useEffect(() => {
    if (!started || timer !== 0 || (slug !== "coin_drop" && slug !== "slots")) return;
    void (async () => {
      setBusy(true);
      const { data, error } = await (supabase as any).rpc("play_timed_daily_activity", { p_slug: slug, p_action: "finish" });
      setBusy(false);
      if (error) { toast.error(error.message ?? "Game could not finish"); return; }
      setReward(Number(data?.reward_bc ?? 0));
      await syncCoins();
      setPhase("ad");
    })();
  }, [timer, started, slug, syncCoins]);

  const play = async () => {
    if (slug === "coin_drop" || slug === "slots") { await startTimed(); return; }
    if (slug === "lucky_card") {
      setBusy(true);
      const { error } = await (supabase as any).rpc("play_lucky_card", { p_action: "start" });
      setBusy(false);
      if (error) return toast.error(error.message ?? "Lucky Card unavailable");
      setMessage("Choose one card to reveal.");
      return;
    }
    if (slug === "secret_reveal") {
      setBusy(true);
      const { data, error } = await (supabase as any).rpc("play_secret_reveal", { p_action: "start", p_words: [] });
      setBusy(false);
      if (error) return toast.error(error.message ?? "Secret Reveal unavailable");
      setSecretPieces((data?.pieces ?? []) as string[]);
      setMessage("Tap the confession pieces in the correct order.");
      return;
    }
    setMessage("Make your choice.");
  };

  const choose = async (index: number) => {
    if (slug === "lucky_card") {
      setSelected(index);
      setBusy(true);
      const { data, error } = await (supabase as any).rpc("play_lucky_card", { p_action: "reveal", p_card: index });
      setBusy(false);
      if (error) return toast.error(error.message ?? "Card could not be revealed");
      setReward(Number(data?.reward_bc ?? 0));
      await syncCoins();
      setPhase("ad");
      return;
    }
    if (slug === "cup_shuffle") {
      setSelected(index);
      setMessage("Panda is shuffling…");
      window.setTimeout(() => { void completeStandard().then(() => setPhase("ad")); }, 1600);
      return;
    }
    if (slug === "mystery_box" || slug === "wheel_spin" || slug === "guess_sponsor" || slug === "puzzle") {
      setSelected(index);
      if (slug === "puzzle") {
        const words = ["Panda", "Circle", "Fun"].sort(() => Math.random() - 0.5);
        setPuzzle(words);
        setAnswer([]);
        setMessage("Put the three words in the shown order.");
        return;
      }
      setPhase("ad");
    }
  };

  const finishAfterAd = async () => {
    if (slug === "secret_reveal" && !secretSolved) return;
    if (slug === "playable_ad") { await completeStandard(); return; }
    if (reward !== null) { setPhase("result"); return; }
    await completeStandard();
  };

  const solveSecret = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_secret_reveal", { p_action: "solve", p_words: secretAnswer });
    setBusy(false);
    if (error) return toast.error(error.message ?? "Puzzle could not be checked");
    if (data?.result !== "solved") return toast.error("Not quite. Try again.");
    setReward(Number(data?.reward_bc ?? 0));
    setSecretSolved(true);
    await syncCoins();
    setPhase("ad");
  };

  const chooseSecret = (piece: string) => setSecretAnswer((v) => v.includes(piece) ? v : [...v, piece]);

  const title = GAME_META[slug]?.label ?? activity.title;
  const gameIcon = GAME_META[slug]?.icon ?? "🎮";

  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-md overflow-hidden p-0">
      <DialogHeader className="border-b border-border/70 p-4">
        <DialogTitle className="flex items-center gap-2 font-display"><span className="text-2xl">{gameIcon}</span>{title}</DialogTitle>
      </DialogHeader>
      <div className="max-h-[75vh] overflow-y-auto p-4">
        {phase === "ad" ? <div className="space-y-4">
          <SponsorCard />
          <PlayableVideoAd placement="crush_interstitial" variant="card" onComplete={() => { setAdDone(true); void finishAfterAd(); }} />
          {!adDone ? <p className="text-center text-xs text-muted-foreground">Your result is waiting behind the sponsor.</p> : null}
        </div> : null}

        {phase === "result" ? <div className="py-8 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-4xl">🎉</div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Result revealed</p>
          <h2 className="mt-1 font-display text-3xl font-black">+{reward ?? 0} BC</h2>
          <p className="mt-2 text-sm text-muted-foreground">The reward has been verified and added to your wallet.</p>
          <Button className="mt-5 w-full" onClick={() => { onDone(); onClose(); }}>Done</Button>
        </div> : null}

        {phase === "play" ? <div className="space-y-4">
          <SponsorCard compact />
          {slug === "playable_ad" ? <PlayableVideoAd placement="crush_interstitial" variant="card" onComplete={() => void completeStandard()} /> : null}
          {slug === "wheel_spin" ? <div className="text-center"><div className="mx-auto grid size-44 place-items-center rounded-full border-8 border-primary/30 bg-primary/10 text-6xl">🎡</div><p className="mt-3 text-sm text-muted-foreground">Spin once to reveal the reward.</p><Button className="mt-4 w-full" disabled={busy} onClick={() => void choose(0)}>Spin Wheel</Button></div> : null}
          {slug === "mystery_box" ? <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <button key={i} className="grid aspect-square place-items-center rounded-2xl border border-border bg-card text-5xl active:scale-95" onClick={() => void choose(i)}>🎁</button>)}</div> : null}
          {slug === "target" ? <div className="space-y-3"><div className="grid min-h-64 place-items-center rounded-3xl border border-border bg-secondary/20"><button className="grid size-28 place-items-center rounded-full border-8 border-primary/40 bg-primary/10 text-5xl" onClick={() => setTargetHits(v => v+1)}>🎯</button></div><p className="text-center text-sm">Hits: {targetHits}</p><Button className="w-full" onClick={() => setPhase("ad")}>Lock Target</Button></div> : null}
          {slug === "guess_sponsor" ? <div className="grid gap-2">{["Panda Cola","Panda Mobile","Panda Fashion"].map((x,i)=><Button key={x} variant="outline" onClick={() => void choose(i)}>{x}</Button>)}</div> : null}
          {slug === "puzzle" ? <div className="space-y-3"><div className="rounded-2xl border border-border p-4 text-center text-sm font-semibold">Panda → Circle → Fun</div>{(puzzle.length ? puzzle : ["Panda","Circle","Fun"]).map((x,i)=><Button key={x} variant={answer.includes(x) ? "secondary" : "outline"} disabled={answer.includes(x)} onClick={() => { const next=[...answer,x]; setAnswer(next); if(next.length===3) setPhase("ad"); }}>{x}</Button>)}</div> : null}
          {(slug === "coin_drop" || slug === "slots") ? <div className="space-y-3 text-center"><div className="rounded-3xl border border-border bg-secondary/20 p-8"><Timer className="mx-auto size-8 text-primary"/><p className="mt-2 font-display text-4xl font-black">{started ? timer : 60}s</p><p className="text-sm text-muted-foreground">{slug === "coin_drop" ? "Catch coins 🪙 and avoid stones 🪨." : "Keep the neon reels running until the reveal."}</p></div>{!started ? <Button className="w-full" disabled={busy} onClick={() => void play()}>Start {title}</Button> : <p className="text-xs text-muted-foreground">Game running… the server controls the final reward.</p>}</div> : null}
          {slug === "lucky_card" ? <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i=><button key={i} className="grid aspect-[3/4] place-items-center rounded-2xl border border-border bg-card text-4xl" disabled={busy} onClick={() => void choose(i)}>🃏</button>)}</div> : null}
          {slug === "cup_shuffle" ? <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i=><button key={i} className="grid aspect-square place-items-center rounded-2xl border border-border bg-card text-5xl" onClick={() => void choose(i)}>🥤</button>)}</div> : null}
          {slug === "secret_reveal" ? <div className="space-y-3">{secretPieces.length === 0 ? <Button className="w-full" disabled={busy} onClick={() => void play()}><Play className="mr-2 size-4"/>Build Secret Puzzle</Button> : <><div className="flex flex-wrap gap-2">{secretAnswer.map((x,i)=><span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs">{x}</span>)}</div><div className="flex flex-wrap gap-2">{secretPieces.map((x,i)=><Button key={i} variant={secretAnswer.includes(x) ? "secondary" : "outline"} disabled={secretAnswer.includes(x) || busy} onClick={() => chooseSecret(x)}>{x}</Button>)}</div>{secretAnswer.length===secretPieces.length ? <Button className="w-full" disabled={busy} onClick={() => void solveSecret()}>Check Secret</Button> : null}</>}</div> : null}
        </div> : null}
      </div>
    </DialogContent>
  </Dialog>;
}

function GameButton({ activity, onOpen }: { activity: Activity; onOpen: () => void }) {
  const game = GAME_META[activity.activity_type];
  if (!game) return null;
  return <Button className="cp-neon-button" size="sm" onClick={onOpen}>{game.label}<ArrowRight className="size-3.5" /></Button>;
}

function ActivitiesPage() {
  const { syncCoins } = useStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinOpen, setSpinOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Activity | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_today_seven_day_activity");
    if (error) toast.error(error.message ?? "Today’s activity could not be loaded");
    else {
      const today = data?.activity;
      setActivities(today ? [{
        id: String(today.slug),
        title: String(today.title),
        description: String(today.description),
        activity_type: String(today.slug),
        reward_bc: 0,
        requires_ad: true,
        completed: Boolean(today.completed),
        last_completed_at: null,
      }] : []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const completed = useMemo(() => activities.filter(a => a.completed).length, [activities]);
  const total = activities.length;

  return <AppShell title="Today’s Activity" subtitle="Admin controls which Circle Panda activity appears each day.">
    <div className="cp-activity-page mx-auto w-full max-w-3xl">
      <section className="cp-activity-hero">
        <div className="cp-activity-panda">🐼</div>
        <div className="min-w-0 flex-1">
          <p className="cp-eyebrow">CIRCLE PANDA</p><h1>Play · Connect · Earn</h1>
          <p>Real playable activities with server-verified rewards and sponsor-result ads.</p>
        </div>
        <div className="cp-activity-progress"><Trophy className="size-4" /><b>{completed}/{total}</b><span>done</span></div>
      </section>
      <section className="cp-activity-list">
        <div className="cp-activity-section-head"><div><p className="cp-eyebrow">YOUR GAMES</p><h2>Today’s Activity</h2></div><span>Server verified</span></div>
        {loading ? <div className="cp-activity-loading"><Loader2 className="size-6 animate-spin" />Loading…</div> : null}
        {!loading && activities.length === 0 ? <div className="cp-activity-loading">No activities are enabled right now.</div> : null}
        {!loading ? activities.map(activity => {
          const Icon = iconFor(activity.activity_type);
          const action = actionMap[activity.activity_type];
          const game = GAME_META[activity.activity_type];
          return <article key={activity.id} className="cp-activity-card">
            <div className="cp-activity-art">{game?.icon ?? <Icon className="size-6" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3>{activity.title}</h3>{activity.completed ? <span className="cp-done-pill"><CheckCircle2 className="size-3" /> Completed</span> : null}</div>
              <p>{activity.description}</p>
              <div className="cp-reward-row"><span><Coins className="size-3.5" /> Reward varies by game</span><span>+5 XP</span></div>
            </div>
            <div className="shrink-0">
              {activity.completed ? <Button className="cp-secondary-button" size="sm" disabled>Done</Button> : game ? <GameButton activity={activity} onOpen={() => setSelectedGame(activity)} /> : action ? <Link to={action.to}><Button className="cp-neon-button" size="sm">{action.label}<ArrowRight className="size-3.5" /></Button></Link> : <Button className="cp-neon-button" size="sm" onClick={async () => { const { error } = await (supabase as any).rpc("claim_activity", { p_activity_id: activity.id }); if (error) toast.error(error.message); else { await syncCoins(); void load(); } }}>Play Now</Button>}
            </div>
          </article>;
        }) : null}
      </section>
    </div>
    <SpinWheel open={spinOpen} onOpenChange={setSpinOpen} />
    {selectedGame ? <GameModal activity={selectedGame} onClose={() => setSelectedGame(null)} onDone={() => void load()} /> : null}
  </AppShell>;
}
