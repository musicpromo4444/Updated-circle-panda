import { useEffect, useState } from "react";
import { Flame, SkipForward, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ME_ID, useStore } from "@/lib/store";

function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function HotSeatBanner({ groupId }: { groupId: string }) {
  const {
    hotSeatFor,
    rotateHotSeat,
    joinHotSeatQueue,
    useSkipPass: applySkipPass,
    skipPasses,
  } = useStore();
  const seat = hotSeatFor(groupId);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const left = seat ? seat.started_at + seat.duration_seconds * 1000 - Date.now() : 0;

  useEffect(() => {
    if (seat && left <= 0) rotateHotSeat(groupId);
  }, [seat, left, groupId, rotateHotSeat]);

  if (!seat) return null;

  const mine = seat.current_user_id === ME_ID;
  const nextUp = seat.queue.slice(0, 3);

  return (
    <div className="border-b border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/25 text-lg leading-none">
          🔥
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Flame className="size-3" /> Hot Seat
          </p>
          <p className="truncate font-display text-sm font-semibold">
            {mine ? "You're in the Hot Seat" : seat.current_user_name}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-primary/40 bg-background/60 px-2.5 py-1 font-display text-xs font-semibold tabular-nums text-primary">
          {mmss(left)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-muted-foreground">
          Next up: {nextUp.length ? nextUp.join(" → ") : "no one queued"}
        </p>
        <div className="ml-auto flex gap-1.5">
          {!mine ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => joinHotSeatQueue(groupId)}
            >
              <UserPlus className="size-3" /> Join queue
            </Button>
          ) : null}
          {skipPasses > 0 && !mine ? (
            <Button
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => applySkipPass(groupId)}
            >
              <SkipForward className="size-3" /> Skip pass ({skipPasses})
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
