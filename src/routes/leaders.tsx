import { createFileRoute } from "@tanstack/react-router";
import { Crown, Star, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TierBadge } from "@/components/TierBadge";
import { useStore, starRating } from "@/lib/store";

export const Route = createFileRoute("/leaders")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Circle Panda" },
      {
        name: "description",
        content:
          "See the top anonymous pandas ranked by reputation score, star rating, and Panda tier badges.",
      },
      { property: "og:title", content: "Leaderboard — Circle Panda" },
      {
        property: "og:description",
        content: "Reputation scores, star ratings, and Panda tier badges.",
      },
    ],
  }),
  component: LeadersPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function LeadersPage() {
  const { leaderboard, reputation, posts } = useStore();

  const mine = {
    id: "you",
    name: "You (anonymous)",
    score: reputation,
    posts: posts.filter((p) => p.author === "You (anonymous)").length,
    you: true,
  };
  const ranked = [...leaderboard, mine].sort((a, b) => b.score - a.score);
  const myRank = ranked.findIndex((r) => r.you) + 1;

  return (
    <AppShell
      title="Leaderboard"
      subtitle="Reputation is earned by posting, replying, and showing up."
    >
      <div className="panda-panel mb-5 flex items-center gap-3 rounded-2xl p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary tabular-nums">
          #{myRank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">Your rank</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-current text-primary" />
            {starRating(reputation).toFixed(1)} · {reputation} rep
          </p>
        </div>
        <TierBadge score={reputation} />
      </div>

      <div className="space-y-2.5">
        {ranked.map((r, i) => (
          <div
            key={r.id}
            className={`panda-panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3.5 ${
              r.you ? "border-primary/50" : ""
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold tabular-nums">
              {MEDALS[i] ?? i + 1}
            </span>
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{r.name}</span>
                {i === 0 ? <Crown className="size-3.5 shrink-0 text-primary" /> : null}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Star className="size-3 fill-current text-primary" />
                {starRating(r.score).toFixed(1)} · {r.posts} posts
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="flex items-center gap-1 font-display text-sm font-semibold tabular-nums">
                <Trophy className="size-3.5 text-primary" />
                {r.score}
              </span>
              <TierBadge score={r.score} compact />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
