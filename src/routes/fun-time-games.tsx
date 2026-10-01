import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GameModal, GAME_META } from "@/routes/activities";

export const Route = createFileRoute("/fun-time-games")({
  head: () => ({ meta: [{ title: "Fun Time Games — Circle Panda" }] }),
  component: FunTimeGamesPage,
});

type GameActivity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  reward_bc: number;
  requires_ad: boolean;
  completed: boolean;
  last_completed_at: string | null;
};

function FunTimeGamesPage() {
  const [selected, setSelected] = useState<GameActivity | null>(null);
  const games = useMemo(() => Object.entries(GAME_META).map(([activity_type, meta]) => ({
    id: "fun-time-" + activity_type,
    title: meta.label,
    description: "Play this Circle Panda game with server-verified results.",
    activity_type,
    reward_bc: 0,
    requires_ad: false,
    completed: false,
    last_completed_at: null,
  })), []);

  return <AppShell title="Fun Time" subtitle="Choose a game and play. Results and rewards are verified by Circle Panda.">
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 pb-24 sm:p-6">
      <section className="panda-panel rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Gamepad2 className="size-6"/></span>
          <div><h1 className="font-display text-xl font-black">Games & Activities</h1><p className="text-xs text-muted-foreground">Pick any available game.</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {games.map(game => {
            const meta = GAME_META[game.activity_type];
            return <button key={game.id} type="button" onClick={() => setSelected(game)} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left transition hover:border-primary/50 active:scale-[.99]">
              <span className="text-3xl">{meta.icon}</span>
              <span className="min-w-0 flex-1"><span className="block font-black">{meta.label}</span><span className="mt-1 block text-xs text-muted-foreground">{game.description}</span></span>
              <span className="text-xs font-black text-primary">Play</span>
            </button>;
          })}
        </div>
      </section>
    </main>
    {selected ? <GameModal activity={selected} onClose={() => setSelected(null)} onDone={() => setSelected(null)} /> : null}
  </AppShell>;
}
