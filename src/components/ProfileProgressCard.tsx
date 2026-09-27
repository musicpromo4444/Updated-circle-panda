import { Star, Shield, Zap } from "lucide-react";
import { pandaProgress } from "@/lib/store";

/** Production Panda rank card. XP is cumulative and controls Panda rank only. */
export function ProfileProgressCard({ level: _level, xp }: { level: number; xp: number }) {
  const { current, next, stars, totalStars, progress } = pandaProgress(xp);

  return (
    <div className="panda-panel mx-auto w-full max-w-md space-y-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--coin)_30%,transparent)] bg-[color-mix(in_oklab,var(--coin)_14%,transparent)] text-sm font-bold text-[var(--coin)]">
            {stars}/7
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base leading-none font-semibold">{current.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="size-3 text-[var(--coin)]" /> Panda Rank
            </p>
          </div>
        </div>
        <div className="flex gap-0.5" aria-label={stars + " of " + totalStars + " stars"}>
          {Array.from({ length: totalStars }).map((_, index) => (
            <Star key={index} className={index < stars ? "size-4 fill-[var(--coin)] text-[var(--coin)]" : "size-4 fill-muted text-muted-foreground/30"} />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="size-3.5 fill-[var(--coin)] text-[var(--coin)]" /> XP Progress
          </span>
          <span className="tabular-nums text-muted-foreground">
            {next ? xp.toLocaleString() + " / " + next.minXp.toLocaleString() + " XP" : xp.toLocaleString() + " XP · MAX"}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-[var(--coin)] transition-all duration-500 ease-out" style={{ width: progress + "%" }} />
        </div>
      </div>

      {next ? (
        <p className="text-center text-[11px] text-muted-foreground">
          {Math.max(0, next.minXp - xp).toLocaleString()} XP to <span className="font-semibold text-foreground">{next.name}</span>
        </p>
      ) : (
        <p className="text-center text-[11px] font-semibold text-[var(--coin)]">Legendary Panda · 7 stars</p>
      )}
    </div>
  );
}
