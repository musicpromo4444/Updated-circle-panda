import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Gamepad2, ShieldCheck, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { GameModal } from "@/routes/activities";

export const Route = createFileRoute("/activity-test-lab")({
  head: () => ({ meta: [{ title: "Activity Test Lab — Circle Panda" }] }),
  component: ActivityTestLabPage,
});

const TEST_GAMES = [
  ["wheel_spin", "🎡", "Lucky Wheel", "Spin and reveal a verified reward."],
  ["mystery_box", "🎁", "Mystery Box", "Choose one of three boxes."],
  ["target", "🎯", "Panda Target", "Hit the target and lock your score."],
  ["guess_sponsor", "🃏", "Guess the Sponsor", "Pick the sponsor behind the experience."],
  ["puzzle", "🧩", "Panda Puzzle", "Solve today's server puzzle."],
  ["coin_drop", "🪙", "Coin Drop", "Play the 60-second coin game."],
  ["slots", "🎰", "Panda Slots", "Run the 60-second neon reels."],
  ["lucky_card", "🃏", "Lucky Card", "Choose a card and reveal the reward."],
  ["cup_shuffle", "🥤", "Panda Cup Shuffle", "Choose the cup after the shuffle."],
  ["secret_reveal", "🕵️", "Secret Reveal", "Solve the secret puzzle, then choose reveal or keep hidden."],
] as const;

function ActivityTestLabPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const activity = selected
    ? {
        id: selected,
        title: TEST_GAMES.find((g) => g[0] === selected)?.[2] ?? selected,
        description: "Temporary test-lab activity",
        activity_type: selected,
        reward_bc: 0,
        requires_ad: true,
        completed: false,
        last_completed_at: null,
      }
    : null;

  return (
    <AppShell title="Activity Test Lab" subtitle="Temporary testing page — not part of the normal Circle Panda experience.">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">TEST MODE</p>
              <p className="mt-1 text-xs text-muted-foreground">
                These are the 10 real daily activities. Tap any card to run the actual game flow, including server checks, ads and rewards.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEST_GAMES.map(([slug, icon, title, description], index) => (
            <button
              key={slug}
              type="button"
              onClick={() => setSelected(slug)}
              className="group rounded-3xl border border-border/70 bg-card p-4 text-left transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-3xl">{icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Activity {index + 1}</p>
                  <h2 className="font-display text-lg font-bold">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
                <Gamepad2 className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-3">
          <span className="text-xs text-muted-foreground">10 playable activities · the 11th slot is the ad-only activity</span>
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 size-4" /> Back
          </Button>
        </div>
      </div>

      {activity ? (
        <GameModal
          activity={activity}
          onClose={() => setSelected(null)}
          onDone={() => setSelected(null)}
        />
      ) : null}

      {selected ? (
        <button
          type="button"
          aria-label="Close test"
          className="fixed right-4 top-4 z-[100] grid size-9 place-items-center rounded-full border border-border bg-background/90 shadow-lg"
          onClick={() => setSelected(null)}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </AppShell>
  );
}
