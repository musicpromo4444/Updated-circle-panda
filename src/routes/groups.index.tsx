import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Lock, PlusCircle, Share2, Users, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { VipLoungeCard } from "@/components/groups/VipLoungeCard";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { useStore, type GroupChat } from "@/lib/store";

export const Route = createFileRoute("/groups/")({
  head: () => ({
    meta: [
      { title: "Group Chats — Circle Panda" },
      {
        name: "description",
        content:
          "Anonymous group chats stay as cards until 3 members join, then open into a full-screen chat.",
      },
      { property: "og:title", content: "Group Chats — Circle Panda" },
      {
        property: "og:description",
        content: "Join anonymous groups and open the full chat when 3 members are present.",
      },
    ],
  }),
  component: GroupsPage,
});

function GroupCard({ group }: { group: GroupChat }) {
  const [deleted, setDeleted] = useState(false);
  const { joinGroup, isGroupExpired } = useStore();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data, error } = await (supabase as any).rpc("get_group_unread_count", { p_group_id: group.id });
      if (active && !error) setUnread(Number(data ?? 0));
    };
    void refresh();
    const channel = (supabase as any).channel(`group-unread-${group.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${group.id}` }, () => void refresh())
      .subscribe();
    return () => { active = false; void (supabase as any).removeChannel(channel); };
  }, [group.id]);
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

  const openRoom = () => void navigate({ to: "/groups/$groupId", params: { groupId: group.id } });

  const deleteGroup = async () => {
    if (!window.confirm("Delete this group and its messages for everyone?")) return;
    const { data, error } = await (supabase as any).rpc("delete_group", { p_group_id: group.id });
    if (error) { toast.error(error.message ?? "Group could not be deleted"); return; }
    const paths = Array.isArray((data as any)?.media_paths) ? (data as any).media_paths.filter(Boolean) : [];
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from("circle-panda-group-media").remove(paths);
      if (storageError) toast.warning("The group was deleted, but some stored media could not be cleaned up automatically.");
    }
    setDeleted(true);
    toast.success("Group deleted");
  };



  if (deleted) return null;

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
          {unread > 0 ? <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-sm">{unread > 99 ? "99+" : unread} unread</span> : null}
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
              {group.members < 3
                ? `This group has ${group.members} member${group.members === 1 ? "" : "s"}. 3 members are needed before the group can start.`
                : "The group is ready to open."}
            </p>
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button className="gap-2" variant={live ? "secondary" : "default"}
            onClick={() => group.memberRole ? openRoom() : joinGroup(group.id)}
            disabled={Boolean(group.joinPending)}
            className={!group.memberRole && !group.joinPending ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/50 animate-pulse" : ""}>
            <Users className="size-4" /> {group.memberRole ? "Open Group" : group.joinPending ? "Request Sent" : "Join Group"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={shareGroup}>
            <Share2 className="size-4" /> Share
          </Button>
          {group.ownerId && group.memberRole === "owner" ? (
            <Button variant="outline" className="col-span-2 gap-2 text-destructive hover:bg-destructive/10" onClick={(e)=>{e.stopPropagation();void deleteGroup();}}>
              <Trash2 className="size-4" /> Delete Group
            </Button>
          ) : null}
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
