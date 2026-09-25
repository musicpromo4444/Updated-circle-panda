import { Star, Shield, Zap } from "lucide-react";
import { levelProgress } from "@/lib/store";

/**
 * Level + XP + star progression card for the Profile dashboard.
 * Uses the app's semantic tokens (coin gold for stars/XP) so it stays on theme.
 */
export function ProfileProgressCard({ level, xp }: { level: number; xp: number }) {
  const { tier, starsEarned, xpForNext, xpPct } = levelProgress(level, xp);

  return (
    <div className="panda-panel mx-auto w-full max-w-md space-y-4 rounded-2xl p-5">
      {/* Badge, Title & Star Rating */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--coin)_30%,transparent)] bg-[color-mix(in_oklab,var(--coin)_14%,transparent)] text-sm font-bold text-[var(--coin)]">
            Lvl {level}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base leading-none font-semibold">
              {tier.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="size-3 text-[var(--coin)]" /> Tier Status
            </p>
          </div>
        </div>

        {/* Dynamic Star System */}
        <div className="flex gap-1">
          {Array.from({ length: tier.maxStars }).map((_, index) => (
            <Star
              key={index}
              className={`size-4 ${
                index < starsEarned
                  ? "fill-[var(--coin)] text-[var(--coin)]"
                  : "fill-muted text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="size-3.5 fill-[var(--coin)] text-[var(--coin)]" />
            XP Progress
          </span>
          <span className="tabular-nums text-muted-foreground">
            {xp} / {xpForNext} XP
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-[var(--coin)] transition-all duration-500 ease-out"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
