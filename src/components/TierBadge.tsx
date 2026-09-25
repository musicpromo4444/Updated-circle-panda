import { pandaTier } from "@/lib/store";

export function TierBadge({ score, compact }: { score: number; compact?: boolean }) {
  const tier = pandaTier(score);
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 font-semibold text-primary ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      {tier.emoji} {tier.name}
    </span>
  );
}
