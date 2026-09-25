import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Flame, Lock, Send, Timer, Users } from "lucide-react";
import { BottomNav } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, DAY_MS } from "@/lib/store";
import { HotSeatBanner } from "@/components/HotSeatBanner";
import { AD_COOLDOWN_MS, RewardedAdModal } from "@/components/RewardedAdModal";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Group Room — Circle Panda" },
      {
        name: "description",
        content: "A full-screen anonymous group room that locks after 24 hours.",
      },
      { property: "og:title", content: "Group Room — Circle Panda" },
      {
        property: "og:description",
        content: "Chat anonymously before the 24-hour timer runs out.",
      },
    ],
  }),
  component: GroupRoom,
});

function countdown(openedAt: number) {
  const left = Math.max(0, openedAt + DAY_MS - Date.now());
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function GroupRoom() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const {
    groups,
    sendGroupMessage,
    isGroupExpired,
    hotSeatFor,
    startHotSeat,
    stopHotSeat,
    lastAdShownAt,
  } = useStore();
  const [adOpen, setAdOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [, setTick] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);

  const group = groups.find((g) => g.id === groupId) ?? null;

  useEffect(() => {
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [group?.messages.length]);

  const expired = group ? isGroupExpired(group) : false;
  const live = !!group && group.openedAt !== null && !expired;

  return (
    <div className="flex h-screen flex-col pb-20">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl">
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1 px-2">
          <Link to="/groups">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-base">
          🎍
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display font-semibold">{group?.name ?? "Room not found"}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <Users className="size-3" /> {group?.members ?? 0} anonymous members
          </p>
        </div>
        {live ? (
          hotSeatFor(groupId) ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 gap-1 px-2 text-xs"
              onClick={() => stopHotSeat(groupId)}
            >
              <Flame className="size-3.5 text-primary" /> End
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 gap-1 px-2 text-xs"
              onClick={() => startHotSeat(groupId)}
            >
              <Flame className="size-3.5 text-primary" /> Hot Seat
            </Button>
          )
        ) : null}
        {live ? (
          <span
            suppressHydrationWarning
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-semibold text-primary tabular-nums"
          >
            <Timer className="size-3.5" />
            <span suppressHydrationWarning>{countdown(group.openedAt!)}</span>
          </span>
        ) : null}
      </header>

      {live ? <HotSeatBanner groupId={groupId} /> : null}

      <div className="flex-1 space-y-3 overflow-y-auto bg-secondary/10 px-4 py-4">
        {!group ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            This room doesn't exist.
          </p>
        ) : expired || group.openedAt === null ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Lock className="mx-auto mb-2 size-6" />
            {expired
              ? "This chat locked when the 24-hour timer hit zero."
              : "This room hasn't been opened yet."}
          </div>
        ) : (
          group.messages.map((m) => (
            <div key={m.id} className={m.mine ? "text-right" : ""}>
              <p
                className={`flex items-center gap-1.5 text-[11px] text-muted-foreground ${m.mine ? "justify-end" : ""}`}
              >
                {m.hotSeat ? (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    🔥 Hot Seat
                  </span>
                ) : null}
                {m.author}
              </p>
              <p
                className={`mt-0.5 inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.hotSeat
                    ? "scale-[1.02] border border-primary/60 bg-primary/25 text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
                    : m.mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                }`}
              >
                {m.body}
              </p>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      {live ? (
        <form
          className="flex gap-2 border-t border-border bg-background px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            sendGroupMessage(group.id, draft.trim());
            setDraft("");
            const cooled = lastAdShownAt === null || Date.now() - lastAdShownAt >= AD_COOLDOWN_MS;
            if (cooled) setAdOpen(true);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the room…"
          />
          <Button type="submit" className="shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
      ) : null}

      <RewardedAdModal open={adOpen} groupId={groupId} onClose={() => setAdOpen(false)} />

      <BottomNav />
    </div>
  );
}
