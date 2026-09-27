import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Coins, Gamepad2, Gift, Loader2, Sparkles, Users, CalendarDays, Heart, Music2, Trophy, LockKeyhole, Crown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SpinWheel } from "@/components/SpinWheel";
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
  playable_ad: { to: "/sweepstakes", label: "Play & collect" },\n  coin_drop: { to: "/games/coin-drop", label: "Play Coin Drop" },\n  "coin-drop": { to: "/games/coin-drop", label: "Play Coin Drop" },
};

const GAMES_FOR_UI = [
  { match: "wheel", icon: "🎡" }, { match: "mystery", icon: "🎁" }, { match: "target", icon: "🎯" },
  { match: "sponsor", icon: "🃏" }, { match: "puzzle", icon: "🧩" }, { match: "coin", icon: "🪙" },
  { match: "slot", icon: "🎰" }, { match: "prize", icon: "🏆" }, { match: "playbo", icon: "▶️" },
  { match: "secret", icon: "🕵️" }, { match: "cup", icon: "🥤" },
];

function iconFor(type: string) {
  if (type.includes("group")) return Users;
  if (type.includes("event")) return CalendarDays;
  if (type.includes("confession")) return Heart;
  if (type.includes("music")) return Music2;
  if (type.includes("play")) return Gamepad2;
  if (type.includes("login")) return Gift;
  return Sparkles;
}

function ActivitiesPage() {
  const { syncCoins } = useStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [spinOpen, setSpinOpen] = useState(false);
  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_activity_hub");
    if (error) toast.error(error.message ?? "Activities could not be loaded");
    else setActivities((data ?? []) as Activity[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const completed = useMemo(() => activities.filter(a => a.completed).length, [activities]);
  const total = activities.length;

  const claim = async (activity: Activity) => {
    setClaiming(activity.id);
    const { data, error } = await (supabase as any).rpc("claim_activity", { p_activity_id: activity.id });
    setClaiming(null);
    if (error) return toast.error(error.message ?? "Activity could not be completed");
    await syncCoins();
    toast.success(data?.already_completed ? "Already completed" : `Activity complete 🎉 +${Number(data?.bc_awarded ?? 0)} BC`, {
      description: data?.already_completed ? "Come back when this activity refreshes." : `+${Number(data?.xp_awarded ?? 0)} XP`,
    });
    void load();
  };

  return (
    <AppShell title="Today’s Activity" subtitle="One Circle Panda activity is selected each day by Admin.">
      <div className="cp-activity-page mx-auto w-full max-w-3xl">
        <section className="cp-activity-hero">
          <div className="cp-activity-panda">🐼</div>
          <div className="min-w-0 flex-1">
            <p className="cp-eyebrow">CIRCLE PANDA</p>
            <h1>Play · Connect · Earn</h1>
            <p>Complete today’s activity, follow the reveal flow, and collect your verified BC and XP.</p>
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
            const game = GAMES_FOR_UI.find(g => activity.title.toLowerCase().includes(g.match));
            return <article key={activity.id} className="cp-activity-card">
              <div className="cp-activity-art">{game?.icon ?? <Icon className="size-6" />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3>{activity.title}</h3>{activity.completed ? <span className="cp-done-pill"><CheckCircle2 className="size-3" /> Completed</span> : null}</div>
                <p>{activity.description}</p>
                <div className="cp-reward-row"><span><Coins className="size-3.5" /> +{activity.reward_bc} BC</span><span>+5 XP</span></div>
              </div>
              <div className="shrink-0">
                {activity.completed ? <Button className="cp-secondary-button" size="sm" disabled>Done</Button> : action ? <Link to={action.to}><Button className="cp-neon-button" size="sm">{action.label}<ArrowRight className="size-3.5" /></Button></Link> : <Button className="cp-neon-button" size="sm" onClick={() => void claim(activity)} disabled={claiming===activity.id}>{claiming===activity.id ? <Loader2 className="size-4 animate-spin" /> : "Play Now"}</Button>}
              </div>
            </article>;
          }) : null}
        </section>
      </div>
      <SpinWheel open={spinOpen} onOpenChange={setSpinOpen} />
    </AppShell>
  );
}
