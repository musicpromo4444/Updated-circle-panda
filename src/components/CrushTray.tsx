import { Link } from "@tanstack/react-router";
import { Crown, Plus } from "lucide-react";
import { useStore } from "@/lib/store";

/** Story-style tray of this week's WCW / MCM nominees, shown on the feed. */
export function CrushTray() {
  const { nominees } = useStore();
  const ranked = [...nominees].sort((a, b) => b.votes - a.votes);

  return (
    <section className="panda-panel mb-5 overflow-visible rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Crown className="size-4 text-[var(--coin)]" />
        <h2 className="font-display text-base font-semibold">WCW & MCM this week</h2>
        <Link to="/crush" className="ml-auto text-xs font-medium text-primary hover:underline">
          Vote now
        </Link>
      </div>

      {/* Horizontal scroll wrapper. pt-2 gives the crown (sitting at -top-1)
          room above the circle so it is never clipped; overflow-x-auto handles
          the swipe while overflow-y-visible lets the crown and ring borders
          escape vertically instead of being cropped. */}
      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto overflow-y-visible px-1 pb-1 pt-2">
        <Link to="/crush" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-primary/60 bg-secondary/50 leading-none text-primary">
            <Plus className="size-5" />
          </span>
          <span className="truncate text-[11px] text-muted-foreground">Nominate</span>
        </Link>

        {ranked.map((n, i) => (
          <Link
            key={n.id}
            to="/crush"
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            aria-label={`Vote for ${n.name}`}
          >
            <span className="relative">
              <span
                className={`flex size-14 items-center justify-center rounded-full overflow-hidden text-2xl leading-none ring-2 ring-offset-2 ring-offset-background ${
                  n.kind === "wcw"
                    ? "bg-[color-mix(in_oklab,var(--dating)_22%,transparent)] ring-[var(--dating)]"
                    : "bg-primary/15 ring-primary"
                }`}
              >
                {n.avatarUrl ? (
                  <img
                    src={n.avatarUrl}
                    alt={n.name}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  n.emoji
                )}
              </span>
              {i === 0 ? (
                <span className="absolute -top-1 -right-1 text-sm leading-none" aria-hidden>
                  👑
                </span>
              ) : null}
            </span>
            <span className="w-full truncate text-center text-[11px] text-muted-foreground">
              {n.name.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
