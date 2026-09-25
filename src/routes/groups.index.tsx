import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, Lock, PlusCircle, Timer, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { VipLoungeCard } from "@/components/groups/VipLoungeCard";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { useStore, DAY_MS, type GroupChat } from "@/lib/store";

export const Route = createFileRoute("/groups/")({
  head: () => ({
    meta: [
      { title: "24-Hour Group Chats — Circle Panda" },
      {
        name: "description",
        content:
          "Anonymous group chats that stay hidden until the admin opens them, then lock forever after 24 hours.",
      },
      { property: "og:title", content: "24-Hour Group Chats — Circle Panda" },
      {
        property: "og:description",
        content: "Ephemeral anonymous rooms with a strict 24-hour countdown.",
      },
    ],
  }),
  component: GroupsPage,
});

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, []);
}

export function countdown(openedAt: number) {
  const left = Math.max(0, openedAt + DAY_MS - Date.now());
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GroupCountdown({ openedAt }: { openedAt: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span
      suppressHydrationWarning
      className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-semibold text-primary tabular-nums"
    >
      <Timer className="size-3.5" />
      <span suppressHydrationWarning>{mounted ? countdown(openedAt) : "--:--:--"}</span>
    </span>
  );
}

function GroupCard({ group }: { group: GroupChat }) {
  const { openGroup, isGroupExpired } = useStore();
  const navigate = useNavigate();
  const expired = isGroupExpired(group);
  const live = group.openedAt !== null && !expired;

  return (
    <section className="panda-panel rounded-2xl p-4">
      <button
        type="button"
        disabled={!live}
        onClick={() => void navigate({ to: "/groups/$groupId", params: { groupId: group.id } })}
        className="flex w-full items-start gap-3 text-left disabled:cursor-default"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-lg">
          🎍
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight font-semibold">
            {group.name}
          </span>
          <span className="block text-sm text-muted-foreground">{group.topic}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" /> {group.members} anonymous members
          </span>
        </span>
        {live ? (
          <GroupCountdown openedAt={group.openedAt!} />
        ) : expired ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Expired
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            Hidden
          </span>
        )}
      </button>

      {group.openedAt === null ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This room is inactive. Opening it notifies every member and starts the 24-hour clock.
          </p>
          <Button
            className="mt-3 w-full gap-2"
            onClick={() => {
              openGroup(group.id);
              void navigate({ to: "/groups/$groupId", params: { groupId: group.id } });
            }}
          >
            <Bell className="size-4" /> Open Group Chat
          </Button>
        </div>
      ) : expired ? (
        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
          <Lock className="mx-auto mb-2 size-5" />
          This chat locked when the 24-hour timer hit zero. Nothing here can be read or sent.
        </div>
      ) : (
        <Button
          variant="secondary"
          className="mt-4 w-full justify-between"
          onClick={() => void navigate({ to: "/groups/$groupId", params: { groupId: group.id } })}
        >
          Open room · {group.messages.length} messages
          <ChevronRight className="size-4" />
        </Button>
      )}
    </section>
  );
}

function GroupsPage() {
  useTick();
  const { groups } = useStore();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  return (
    <AppShell title="Group Chats" subtitle="Hidden until opened. Locked 24 hours later.">
      {/* Primary CTA button immediately below subtitle description and above main content cards */}
      <div className="mb-5">
        <Button
          size="lg"
          onClick={() => setCreateGroupOpen(true)}
          className="w-full gap-2.5 rounded-2xl py-6 text-sm sm:text-base font-bold shadow-lg shadow-primary/20 transition-all hover:opacity-95 active:scale-[0.99] cursor-pointer"
        >
          <PlusCircle className="size-5" />
          Create Group
        </Button>
      </div>

      <div className="space-y-4">
        {/* Fixed VIP Lounge Card at the very top */}
        <VipLoungeCard />

        {groups.map((g, idx) => (
          <div key={g.id} className="space-y-4">
            <GroupCard group={g} />
            {/* Standard banner advertisement after every sequence of 5 items */}
            {(idx + 1) % 5 === 0 ? <StandardBannerAd index={Math.floor(idx / 5)} /> : null}
          </div>
        ))}
      </div>

      {/* Group Creation Modal */}
      <CreateGroupModal open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </AppShell>
  );
}
