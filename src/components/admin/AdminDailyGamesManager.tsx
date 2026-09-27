import { useEffect, useMemo, useState } from "react";
import { Check, Gamepad2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type GameConfig = {
  slug: string;
  title: string;
  description: string;
  free_attempts: number;
  reward_pool: Array<{ label?: string; amount?: number }>;
  timer_seconds: number;
  is_enabled: boolean;
  puzzle_bank?: Array<{ question: string; answer: string }>;
};

type ScheduleRow = { day_number: number; activity_slug: string | null; enabled: boolean };

export function AdminDailyGamesManager() {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rewardText, setRewardText] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_get_daily_games");
    if (error) {
      toast.error(error.message ?? "Could not load game controls");
      setLoading(false);
      return;
    }
    const nextGames = (data?.games ?? []) as GameConfig[];
    setGames(nextGames);
    setSchedule((data?.schedule ?? []) as ScheduleRow[]);
    setRewardText(Object.fromEntries(nextGames.map((g) => [
      g.slug,
      (g.reward_pool ?? []).map((r) => `${r.label ?? "Reward"}:${r.amount ?? 0}`).join("\n"),
    ])));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const gameMap = useMemo(() => new Map(games.map((g) => [g.slug, g])), [games]);

  const setDay = async (day: number, slug: string) => {
    setSaving(`day-${day}`);
    const { error } = await (supabase as any).rpc("admin_set_daily_game", {
      p_day: day,
      p_slug: slug,
      p_enabled: true,
    });
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not set activity");
    setSchedule((prev) => prev.map((row) => row.day_number === day ? { ...row, activity_slug: slug, enabled: true } : row));
    toast.success(`Day ${day} now uses ${gameMap.get(slug)?.title ?? slug}`);
  };

  const toggleGame = async (game: GameConfig, enabled: boolean) => {
    setSaving(game.slug);
    const rewards = (rewardText[game.slug] ?? "").split("\n").map((line) => {
      const [label, amount] = line.split(":");
      return { label: label?.trim() || "Reward", amount: Number(amount) || 0 };
    }).filter((r) => r.amount >= 0);
    const { error } = await (supabase as any).rpc("admin_update_daily_game", {
      p_slug: game.slug,
      p_enabled: enabled,
      p_free_attempts: game.free_attempts,
      p_timer_seconds: game.timer_seconds,
      p_reward_pool: rewards,
      p_puzzle_bank: game.puzzle_bank ?? [],
    });
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not save game");
    setGames((prev) => prev.map((g) => g.slug === game.slug ? { ...g, is_enabled: enabled, reward_pool: rewards } : g));
    toast.success(`${game.title} updated`);
  };

  const saveGame = async (game: GameConfig) => {
    setSaving(game.slug);
    const rewards = (rewardText[game.slug] ?? "").split("\n").map((line) => {
      const [label, amount] = line.split(":");
      return { label: label?.trim() || "Reward", amount: Number(amount) || 0 };
    }).filter((r) => r.amount >= 0);
    const { error } = await (supabase as any).rpc("admin_update_daily_game", {
      p_slug: game.slug,
      p_enabled: game.is_enabled,
      p_free_attempts: game.free_attempts,
      p_timer_seconds: game.timer_seconds,
      p_reward_pool: rewards,
      p_puzzle_bank: game.puzzle_bank ?? [],
    });
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not save game");
    setGames((prev) => prev.map((g) => g.slug === game.slug ? { ...g, reward_pool: rewards } : g));
    toast.success(`${game.title} saved`);
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">7-Day Games Control</h2>
        <p className="text-xs text-muted-foreground">Choose exactly which game appears each day and control its attempts, timer and rewards.</p>
      </div>

      {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading live game settings…</div> : (
        <>
          <div className="rounded-2xl border border-border/80 bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><Gamepad2 className="size-4 text-primary" /><h3 className="font-bold">7-Day Schedule</h3></div>
            <div className="grid gap-3 md:grid-cols-2">
              {schedule.map((row) => (
                <div key={row.day_number} className="flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/20 p-3">
                  <span className="w-14 text-xs font-bold">DAY {row.day_number}</span>
                  <select
                    value={row.activity_slug ?? ""}
                    onChange={(e) => void setDay(row.day_number, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    disabled={saving === `day-${row.day_number}`}
                  >
                    {games.filter((g) => g.is_enabled).map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}
                  </select>
                  {row.activity_slug ? <Check className="size-4 text-primary" /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {games.map((game) => (
              <div key={game.slug} className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-display font-bold">{game.title}</h3><p className="text-xs text-muted-foreground">{game.description}</p></div>
                  <Switch checked={game.is_enabled} onCheckedChange={(checked) => void toggleGame(game, checked)} disabled={saving === game.slug} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground">Free attempts
                    <Input className="mt-1" type="number" min={1} max={10} value={game.free_attempts} onChange={(e) => setGames((prev) => prev.map((g) => g.slug === game.slug ? { ...g, free_attempts: Number(e.target.value) || 1 } : g))} />
                  </label>
                  <label className="text-[11px] text-muted-foreground">Timer (seconds)
                    <Input className="mt-1" type="number" min={0} max={300} value={game.timer_seconds} onChange={(e) => setGames((prev) => prev.map((g) => g.slug === game.slug ? { ...g, timer_seconds: Number(e.target.value) || 0 } : g))} />
                  </label>
                </div>
                <label className="block text-[11px] text-muted-foreground">Reward pool — one reward per line: Label:Amount
                  <textarea className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-2 text-xs" value={rewardText[game.slug] ?? ""} onChange={(e) => setRewardText((prev) => ({ ...prev, [game.slug]: e.target.value }))} />
                </label>
                <Button size="sm" className="w-full" onClick={() => void saveGame(game)} disabled={saving === game.slug}><Save className="mr-1.5 size-3.5" />Save {game.title}</Button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
