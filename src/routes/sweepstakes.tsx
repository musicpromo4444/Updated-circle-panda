import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, Sparkles, Timer, Trophy, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { GAME_META, GameModal } from "@/routes/activities";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sweepstakes")({
  head: () => ({
    meta: [
      { title: "Panda Sweepstakes — Circle Panda" },
      {
        name: "description",
        content: "Enter the current Circle Panda contest and view the prizes configured by Admin.",
      },
      { property: "og:title", content: "Panda Sweepstakes — Circle Panda" },
      {
        property: "og:description",
        content: "Click to contest, then explore the current prizes and entry instructions.",
      },
    ],
  }),
  component: SweepstakesPage,
});

type PrizeCard = {
  id: string;
  name: string;
  label: string;
  description: string;
  entry_instructions: string;
  button_label: string;
  action_type: "activity" | "link" | "instructions" | "none";
  action_url: string;
  entry_requirement: string;
  image_url: string;
  emoji: string;
  jackpot: boolean;
  starts_at: string | null;
  closes_at: string | null;
  display_order: number;
};

type ContestActivity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  reward_bc: number;
  requires_ad: boolean;
  completed: boolean;
  last_completed_at: string | null;
};

function formatClose(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function PrizeCardView({
  prize,
  activity,
  onOpenActivity,
}: {
  prize: PrizeCard;
  activity: ContestActivity | null;
  onOpenActivity: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const runAction = () => {
    if (prize.action_type === "activity") {
      if (!activity) return toast.error("The contest activity is not currently available.");
      onOpenActivity();
      return;
    }
    if (prize.action_type === "link") {
      try {
        const url = new URL(prize.action_url);
        if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid link");
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      } catch {
        toast.error("This prize link is not configured correctly.");
      }
      return;
    }
    if (prize.action_type === "instructions") {
      setExpanded((v) => !v);
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/30 to-[var(--coin)]/10">
        {imageFailed || !prize.image_url ? (
          <div className="grid h-full place-items-center text-7xl">{prize.emoji || "🎁"}</div>
        ) : (
          <img
            src={prize.image_url}
            alt={prize.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12">
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-[var(--coin)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
              {prize.label || "Prize"}
            </span>
            {prize.jackpot ? (
              <span className="ml-auto rounded-full bg-[var(--coin)]/20 px-2 py-1 text-[10px] font-black text-[var(--coin)]">
                FEATURED
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="font-display text-xl font-bold">{prize.name}</h2>
        {prize.description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{prize.description}</p> : null}

        {prize.entry_requirement ? (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Entry requirement</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">{prize.entry_requirement}</p>
          </div>
        ) : null}

        {prize.entry_instructions ? (
          <div className="mt-3 rounded-xl border border-border/70 bg-secondary/20">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-3 text-left text-xs font-semibold"
              onClick={() => setExpanded((v) => !v)}
            >
              <span>Ways to contest</span>
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded ? <p className="border-t border-border/60 p-3 text-xs leading-relaxed text-muted-foreground">{prize.entry_instructions}</p> : null}
          </div>
        ) : null}

        {prize.closes_at ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Timer className="size-3.5" /> Closes {formatClose(prize.closes_at)}
          </p>
        ) : null}

        {prize.action_type !== "none" ? (
          <Button className="cp-neon-button mt-4 w-full" onClick={runAction}>
            {prize.button_label || "Enter Contest"}
            {prize.action_type === "link" ? <ExternalLink className="ml-2 size-3.5" /> : null}
            {prize.action_type === "instructions" ? <ChevronDown className={`ml-2 size-3.5 ${expanded ? "rotate-180" : ""}`} /> : null}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function SweepstakesPage() {
  const [selectedActivity, setSelectedActivity] = useState<ContestActivity | null>(null);
  const [contestActivity, setContestActivity] = useState<ContestActivity | null>(null);
  const [prizes, setPrizes] = useState<PrizeCard[]>([]);
  const [, setCardLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState<Array<{ id: string; name: string; prize: string; won_at: string }>>([]);

  const load = async () => {
    setLoading(true);
    const [activityResult, catalogResult, winnerResult] = await Promise.all([
      (supabase as any).rpc("get_sweepstakes_activity_config"),
      (supabase as any).rpc("get_sweepstakes_prize_cards"),
      supabase.from("sweep_winners").select("id,name,prize,won_at").order("won_at", { ascending: false }).limit(8),
    ]);

    const error = activityResult.error ?? catalogResult.error ?? winnerResult.error;
    if (error) {
      toast.error(error.message ?? "Could not load Sweepstakes");
      setLoading(false);
      return;
    }

    const activitySlug = String(
      Array.isArray(activityResult.data) ? activityResult.data[0]?.activity_slug : activityResult.data?.activity_slug ?? "",
    ).trim();

    let activity: ContestActivity | null = null;
    if (activitySlug) {
      const { data: catalogActivity } = await supabase
        .from("seven_day_activity_configs")
        .select("slug,title,description")
        .eq("slug", activitySlug)
        .eq("is_enabled", true)
        .maybeSingle();

      const meta = GAME_META[activitySlug];
      activity = {
        id: activitySlug,
        title: String(catalogActivity?.title ?? meta?.label ?? activitySlug),
        description: String(catalogActivity?.description ?? "Complete the admin-selected contest activity."),
        activity_type: activitySlug,
        reward_bc: 0,
        requires_ad: true,
        completed: false,
        last_completed_at: null,
      };
    }

    const payload = catalogResult.data ?? {};
    setContestActivity(activity);
    setCardLimit(Math.min(5, Math.max(3, Number(payload.card_limit ?? 5))));
    setPrizes(((payload.prizes ?? []) as PrizeCard[]).slice(0, Math.min(5, Math.max(3, Number(payload.card_limit ?? 5)))));
    setWinners((winnerResult.data ?? []) as Array<{ id: string; name: string; prize: string; won_at: string }>);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Panda Sweepstakes" subtitle="Click to contest, then explore the prizes configured by Circle Panda Admin.">
      <section className="cp-sweep-activity mb-6">
        <div className="cp-sweep-activity-glow" />
        <div className="relative z-10">
          <p className="cp-eyebrow">CONTEST ENTRY</p>
          <h1 className="mt-1 text-2xl font-black text-white">CLICK TO CONTEST</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Click to enter the current contest for a chance to win one of the prizes below — such as a PS5 or another prize selected by Admin.
          </p>
          {contestActivity ? (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Current contest</p>
              <p className="mt-0.5 text-sm font-bold text-white">{contestActivity.title}</p>
              {contestActivity.description ? <p className="mt-0.5 text-xs text-white/60">{contestActivity.description}</p> : null}
            </div>
          ) : null}
          <Button
            className="cp-neon-button mt-4 w-full"
            disabled={loading || !contestActivity}
            onClick={() => contestActivity && setSelectedActivity(contestActivity)}
          >
            <Sparkles className="mr-2 size-4" />
            {loading ? "Loading Contest…" : "CLICK TO CONTEST"}
          </Button>
          {!loading && !contestActivity ? (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">No contest activity is currently available.</p>
          ) : null}
        </div>
      </section>

      <section className="mb-4">
        <p className="cp-eyebrow">PRIZES</p>
        <h2 className="mt-1 font-display text-xl font-bold">Win something you actually want</h2>
        <p className="mt-1 text-xs text-muted-foreground">Admin controls the number of cards shown, their order, images, descriptions and entry instructions.</p>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">Loading live prizes…</div>
      ) : prizes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No prizes are currently configured.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {prizes.map((prize) => (
            <PrizeCardView
              key={prize.id}
              prize={prize}
              activity={contestActivity}
              onOpenActivity={() => contestActivity && setSelectedActivity(contestActivity)}
            />
          ))}
        </div>
      )}

      <section className="panda-panel mt-6 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Trophy className="size-4 text-primary" /> Recent winners</h2>
        {winners.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No completed contest draws yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {winners.map((winner) => (
              <div key={winner.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background">🏆</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{winner.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{winner.prize}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(winner.won_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedActivity ? (
        <GameModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onDone={() => undefined}
        />
      ) : null}
    </AppShell>
  );
}
