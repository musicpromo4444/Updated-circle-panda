import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Lock, PlusCircle, Share2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { VipLoungeCard } from "@/components/groups/VipLoungeCard";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { useStore, type GroupChat } from "@/lib/store";
import { requireCompleteProfile } from "@/lib/profileGate";

export const Route = createFileRoute("/groups/")({
  head: () => ({
    meta: [
      { title: "Group Chats — Circle Panda" },
      {
        name: "description",
        content:
          "Anonymous group chats open as full-screen rooms for members.",
      },
      { property: "og:title", content: "Group Chats — Circle Panda" },
      {
        property: "og:description",
        content: "Join anonymous groups and chat in a full-screen room.",
      },
    ],
  }),
  component: GroupsPage,
});

function GroupCard({ group }: { group: GroupChat }) {
  const { joinGroup, isGroupExpired } = useStore();
  const navigate = useNavigate();
  const expired = isGroupExpired(group);
  const live = group.openedAt !== null && !expired;

  const shareGroup = async () => {
    const url = window.location.origin + "/groups/" + group.id;
    const text = group.name + " — " + group.topic;
    try {
      if (navigator.share) await navigator.share({ title: group.name, text, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const openRoom = async () => { if (!(await requireCompleteProfile("open a group"))) return; void navigate({ to: "/groups/$groupId", params: { groupId: group.id } }); };

  return (
    <section className={`panda-panel rounded-2xl p-4 transition-all duration-300 ${live ? "" : "opacity-75"}`}>
      <button type="button" disabled={!live} onClick={openRoom}
        className="flex w-full items-start gap-3 text-left disabled:cursor-default">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-lg">
          🎍
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight font-semibold">{group.name}</span>
          <span className="block text-sm text-muted-foreground">{group.topic}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" /> {group.members} anonymous members
          </span>
        </span>
        {live ? (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">Open</span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Locked
          </span>
        )}
      </button>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-center">
        {live ? (
          <p className="text-sm font-semibold text-primary">This group is open and live.</p>
        ) : (
          <>
            <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Group locked</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {group.memberRole ? "You are a member of this group." : "Join this group to enter the chat."}
            </p>
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant={live ? "secondary" : "default"}
            onClick={async () => { if (!(await requireCompleteProfile(group.memberRole ? "open a group" : "join a group"))) return; if (group.memberRole) await openRoom(); else joinGroup(group.id); }}
            disabled={Boolean(group.joinPending)}
            className={!group.memberRole && !group.joinPending ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/50 animate-pulse" : ""}>
            <Users className="size-4" /> {group.memberRole ? "Open Group" : group.joinPending ? "Request Sent" : "Join Group"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={shareGroup}>
            <Share2 className="size-4" /> Share
          </Button>
        </div>
      </div>
    </section>
  );
}

function GroupsPage() {
  const [, setTick] = useState(0);
  const { groups } = useStore();

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  return (
    <AppShell title="The Circle" subtitle="Welcome to the circle 🐼 Come in, have a seat, and talk.">
      <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
        <p className="font-display text-base font-semibold">Welcome to the circle 🐼</p>
        <p className="mt-1 text-xs text-muted-foreground">Find a conversation, join a group, or create your own circle.</p>
      </div>

      {/* Primary CTA button immediately below subtitle description and above main content cards */}
      <div className="mb-5">
        <Button
          size="lg"
          onClick={async () => { if (await requireCompleteProfile("create a group")) setCreateGroupOpen(true); }}
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
            {/* Standard banner advertisement after every sequence of 4 items */}
            {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} placement="groups_inline" /> : null}
          </div>
        ))}
      </div>

      {/* Group Creation Modal */}
      <CreateGroupModal open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </AppShell>
  );
}
