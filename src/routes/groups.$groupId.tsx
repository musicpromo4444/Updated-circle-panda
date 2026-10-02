import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Flame, Send, Users, Settings, Pencil, LogOut, Lock } from "lucide-react";
import { BottomNav } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { HotSeatBanner } from "@/components/HotSeatBanner";
import { AD_COOLDOWN_MS, RewardedAdModal } from "@/components/RewardedAdModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Group Room — Circle Panda" },
      {
        name: "description",
        content: "A full-screen anonymous group room that stays open after 3 members join.",
      },
      { property: "og:title", content: "Group Room — Circle Panda" },
      {
        property: "og:description",
        content: "Chat anonymously in a full-screen group room.",
      },
    ],
  }),
  component: GroupRoom,
});

function GroupRoom() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const {
    groups,
    sendGroupMessage,
    hotSeatFor,
    startHotSeat,
    stopHotSeat,
    lastAdShownAt,
    leaveGroup,
    updateGroupInfo,
    updateGroupSettings,
  } = useStore();
  const [adOpen, setAdOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const [showActivation, setShowActivation] = useState(false);
  const [previousLive, setPreviousLive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editPolicy, setEditPolicy] = useState<"admins" | "admins_members">("admins");
  const [sendMessages, setSendMessages] = useState(true);
  const [approveMembers, setApproveMembers] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [memberEditOpen, setMemberEditOpen] = useState(false);

  const group = groups.find((g) => g.id === groupId) ?? null;
  const expired = !!group?.expiresAt && new Date(group.expiresAt).getTime() <= Date.now();

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [group?.messages.length]);

  const live = !!group && group.openedAt !== null;

  useEffect(() => {
    if (!group) return;
    setEditName(group.name);
    setEditTopic(group.topic);
    setEditPolicy(group.editGroupInfo ?? "admins");
    setSendMessages(group.sendMessages ?? true);
    setApproveMembers(group.approveNewMembers ?? false);
  }, [group?.id, group?.name, group?.topic, group?.editGroupInfo, group?.sendMessages, group?.approveNewMembers]);

  useEffect(() => {
    if (!group || !["owner", "admin"].includes(group.memberRole ?? "")) { setJoinRequests([]); return; }
    void (supabase as any).from("group_join_requests").select("id,user_id,created_at,status").eq("group_id", group.id).eq("status", "pending").order("created_at", { ascending: true }).then(({ data }: any) => setJoinRequests(data ?? []));
  }, [group?.id, group?.memberRole, group?.approveNewMembers]);

  useEffect(() => {
    if (live && !previousLive) {
      setShowActivation(true);
      const timer = window.setTimeout(() => setShowActivation(false), 2200);
      setPreviousLive(true);
      return () => window.clearTimeout(timer);
    }
    if (!live) setPreviousLive(false);
  }, [live, previousLive]);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-background">
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
      </header>

      {group && group.memberRole ? (
        <div className="border-b border-border/60 bg-background/80 px-3 py-2">\n          <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center">\n            <p className="text-sm font-semibold">Welcome to the circle 🐼</p>\n            <p className="mt-0.5 text-[11px] text-muted-foreground">You’re in. Have a seat and join the conversation.</p>\n          </div>
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {group.memberRole === "owner" ? "Group owner" : group.memberRole === "admin" ? "Group admin" : "Member"}
            </span>
            <span className="flex-1" />
            {group.memberRole === "owner" || group.memberRole === "admin" ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setSettingsOpen((v) => !v)}>
                <Settings className="size-3.5" /> {settingsOpen ? "Close settings" : "Group settings"}
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                {group.editGroupInfo === "admins_members" ? (
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setMemberEditOpen((v) => !v)}>
                    <Pencil className="size-3.5" /> Edit info
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive" onClick={() => leaveGroup(group.id)}>
                  <LogOut className="size-3.5" /> Leave
                </Button>
              </div>
            )}
          </div>
          {memberEditOpen && group.memberRole === "member" && group.editGroupInfo === "admins_members" ? (
            <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium">Group name<input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" /></label>
                <label className="text-xs font-medium">Topic<textarea value={editTopic} onChange={(e) => setEditTopic(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" className="gap-1.5" onClick={() => { updateGroupInfo(group.id, editName.trim(), editTopic.trim()); setMemberEditOpen(false); }}>
                  <Pencil className="size-3.5" /> Save info
                </Button>
              </div>
            </div>
          ) : null}
          {settingsOpen ? (
            <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium">Group name<input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" /></label>
                <label className="text-xs font-medium">Topic<textarea value={editTopic} onChange={(e) => setEditTopic(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label>
                <label className="text-xs font-medium">Who can edit group info<select value={editPolicy} onChange={(e) => setEditPolicy(e.target.value as "admins" | "admins_members")} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"><option value="admins">Admins only</option><option value="admins_members">All members</option></select></label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={sendMessages} onChange={(e) => setSendMessages(e.target.checked)} /> Members can send messages</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={approveMembers} onChange={(e) => setApproveMembers(e.target.checked)} /> Approve new members</label>
                </div>
              </div>
              {approveMembers && joinRequests.length > 0 ? (
                <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs font-semibold">Pending join requests</p>
                  <div className="mt-2 space-y-2">
                    {joinRequests.map((request) => (
                      <div key={request.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                        <span className="flex-1 text-xs text-muted-foreground">Anonymous Panda · {new Date(request.created_at).toLocaleString()}</span>
                        <Button size="sm" onClick={() => void (supabase as any).rpc("review_group_join_request", { p_request_id: request.id, p_approve: true }).then(({ error }: any) => { if (error) throw error; setJoinRequests((r) => r.filter((x) => x.id !== request.id)); toast.success("Member approved"); }).catch((e: any) => toast.error(e?.message ?? "Could not approve request"))}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => void (supabase as any).rpc("review_group_join_request", { p_request_id: request.id, p_approve: false }).then(({ error }: any) => { if (error) throw error; setJoinRequests((r) => r.filter((x) => x.id !== request.id)); toast.success("Request declined"); }).catch((e: any) => toast.error(e?.message ?? "Could not decline request"))}>Decline</Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <Button size="sm" className="gap-1.5" onClick={() => { updateGroupInfo(group.id, editName.trim(), editTopic.trim()); updateGroupSettings(group.id, editPolicy, sendMessages, approveMembers); setSettingsOpen(false); }}>
                  <Pencil className="size-3.5" /> Save changes
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {live ? <HotSeatBanner groupId={groupId} /> : null}

      {showActivation ? (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/40 backdrop-blur-[2px]" aria-live="polite">
          <div className="animate-in zoom-in-75 rounded-3xl border border-primary/40 bg-card/95 px-8 py-7 text-center shadow-2xl duration-500">
            <div className="mx-auto mb-2 grid size-20 place-items-center rounded-full bg-primary/15 text-5xl">🐼</div>
            <p className="font-display text-xl font-bold">Group activated!</p>
            <p className="mt-1 text-sm text-muted-foreground">24 hours of anonymous chat starts now.</p>
          </div>
        </div>
      ) : null}

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

      {live && group?.sendMessages !== false ? (
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
            maxLength={2000}
          />
          <Button type="submit" className="shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
      ) : live ? (
        <div className="border-t border-border bg-background px-3 py-3 text-center text-xs text-muted-foreground">
          Only group admins can send messages right now.
        </div>
      ) : null}

      <RewardedAdModal open={adOpen} groupId={groupId} onClose={() => setAdOpen(false)} />

      <BottomNav />
    </div>
  );
}
