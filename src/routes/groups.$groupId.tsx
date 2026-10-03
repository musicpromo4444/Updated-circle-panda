import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Users, Settings, Pencil, LogOut, Lock, Reply, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, type GroupChat } from "@/lib/store";
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
    lastAdShownAt,
    leaveGroup,
    updateGroupInfo,
    updateGroupSettings,
  } = useStore();
  const [adOpen, setAdOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const [showActivation, setShowActivation] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [reactionOpen, setReactionOpen] = useState<string | null>(null);
  const activationShown = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editPolicy, setEditPolicy] = useState<"admins" | "admins_members">("admins");
  const [sendMessages, setSendMessages] = useState(true);
  const [approveMembers, setApproveMembers] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [memberEditOpen, setMemberEditOpen] = useState(false);
  const [remoteGroup, setRemoteGroup] = useState<GroupChat | null>(null);

  const group = groups.find((g) => g.id === groupId) ?? remoteGroup;

  useEffect(() => {
    if (groups.some((g) => g.id === groupId)) return;
    let active = true;
    void (async () => {
      const [{ data: summaries }, { data: messages }] = await Promise.all([
        (supabase as any).rpc("get_group_summaries", { p_country:"", p_state_province:"", p_city:"", p_area:"" }),
        (supabase as any).from("cp_group_messages").select("id,group_id,body,created_at,author_id").eq("group_id", groupId).order("created_at", { ascending: true }),
      ]);
      const row = (summaries ?? []).find((g:any) => g.id === groupId);
      if (!active || !row) return;
      const uid = (await supabase.auth.getUser()).data.user?.id;
      setRemoteGroup({
        id:row.id,name:row.name,topic:row.topic,ownerId:row.owner_id,memberRole:row.member_role,
        editGroupInfo:"admins",sendMessages:true,approveNewMembers:false,joinPending:Boolean(row.join_pending),
        members:Number(row.member_count ?? 0),openedAt:row.activated_at?new Date(row.activated_at).getTime():null,expiresAt:row.expires_at ?? null,
        latitude:null,longitude:null,country:row.country ?? "",stateProvince:row.state_province ?? "",city:row.city ?? "",area:row.area ?? "",
        messages:(messages ?? []).map((m:any)=>({id:m.id,author:m.author_id===uid?"You (anonymous)":"Anonymous Panda",body:m.body,at:new Date(m.created_at).getTime(),mine:m.author_id===uid})),
      });
    })();
    return () => { active = false; };
  }, [groupId, groups]);
  const expired = !!group?.expiresAt && new Date(group.expiresAt).getTime() <= Date.now();
  const live = !!group && group.openedAt !== null;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: rows, error }, { data: reactions }] = await Promise.all([
        (supabase as any).from("cp_group_messages").select("id,group_id,body,created_at,user_id,message_type,reply_to_id").eq("group_id", groupId).order("created_at", { ascending: true }).limit(1000),
        (supabase as any).from("cp_group_message_reactions").select("message_id,user_id,reaction"),
      ]);
      if (error) { toast.error(error.message ?? "Could not load group messages"); return; }
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const reactionMap = new Map<string, any[]>();
      (reactions ?? []).forEach((r:any) => reactionMap.set(r.message_id, [...(reactionMap.get(r.message_id) ?? []), r]));
      if (!cancelled) setChatMessages((rows ?? []).map((m:any) => ({ ...m, author:m.user_id===uid?"You (anonymous)":"Anonymous Panda", mine:m.user_id===uid, reactions:reactionMap.get(m.id) ?? [] })));
    };
    void load();
    const channel=supabase.channel(`group:${groupId}:whatsapp`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"cp_group_messages",filter:`group_id=eq.${groupId}`},(payload:any)=>{
        void (async()=>{ const uid=(await supabase.auth.getUser()).data.user?.id; const m=payload.new; setChatMessages(x=>x.some(v=>v.id===m.id)?x:[...x,{...m,author:m.user_id===uid?"You (anonymous)":"Anonymous Panda",mine:m.user_id===uid,reactions:[]}]); })();
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"cp_group_message_reactions"},()=>void load())
      .subscribe();
    return()=>{cancelled=true;void supabase.removeChannel(channel);};
  },[groupId,live]);

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
    if (!live || activationShown.current) return;
    activationShown.current = true;
    setShowActivation(true);
    const timer = window.setTimeout(() => setShowActivation(false), 4000);
    return () => window.clearTimeout(timer);
  }, [live]);

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
      </header>

{group && group.memberRole ? (
        <div className="border-b border-border/60 bg-background/80 px-3 py-2">
          <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center">
            <p className="text-sm font-semibold">Welcome to the group 🐼</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Feel free to chat and enjoy the conversation.</p>
          </div>
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

      {showActivation ? (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/40 backdrop-blur-[2px]" aria-live="polite">
          <div className="animate-in zoom-in-75 rounded-3xl border border-primary/40 bg-card/95 px-8 py-7 text-center shadow-2xl duration-500">
            <div className="mx-auto mb-2 grid size-20 place-items-center rounded-full bg-primary/15 text-5xl">🐼</div>
            <p className="font-display text-xl font-bold">Welcome to the group!</p>
            <p className="mt-1 text-sm text-muted-foreground">Feel free to chat and enjoy the conversation.</p>
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
          chatMessages.map((m) => (
            <div key={m.id} className={m.mine ? "text-right" : ""}>
              {m.reply_to_id ? <button type="button" onClick={()=>{const target=chatMessages.find(x=>x.id===m.reply_to_id); if(target) document.getElementById(`group-msg-${target.id}`)?.scrollIntoView({behavior:"smooth"});}} className="mb-1 inline-block max-w-[85%] rounded-lg border-l-2 border-primary bg-background/60 px-2 py-1 text-left text-[10px] text-muted-foreground">↩ {chatMessages.find(x=>x.id===m.reply_to_id)?.body?.slice(0,80) ?? "Reply"}</button> : null}
              <div id={`group-msg-${m.id}`} className="relative">
                <p className={`text-[11px] text-muted-foreground ${m.mine ? "text-right" : ""}`}>{m.author}</p>
                <p className={`mt-0.5 inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-primary text-primary-foreground" : "bg-card"}`}>{m.body}</p>
                <div className={`mt-1 flex items-center gap-1 ${m.mine ? "justify-end" : ""}`}>
                  <Button type="button" variant="ghost" size="icon" className="size-7" onClick={()=>setReplyTo(m)} aria-label="Reply"><Reply className="size-3.5"/></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" onClick={()=>setReactionOpen(reactionOpen===m.id?null:m.id)} aria-label="React"><Smile className="size-3.5"/></Button>
                  {(m.reactions ?? []).map((r:any)=><span key={`${r.user_id}-${r.reaction}`} className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px]">{r.reaction}</span>)}
                </div>
                {reactionOpen===m.id ? <div className="mt-1 flex gap-1 rounded-full border bg-background p-1 shadow-lg"><span>❤️</span><span>😂</span><span>👍</span><span>😮</span><span>😢</span><span>🔥</span></div> : null}
                {reactionOpen===m.id ? <div className="absolute inset-x-0 bottom-0 flex gap-2 opacity-0"><button type="button" onClick={()=>void (async()=>{const emoji="❤️";const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:m.id,p_reaction:emoji});if(error)toast.error(error.message);setReactionOpen(null);})()}>❤️</button><button type="button" onClick={()=>void (async()=>{const emoji="😂";const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:m.id,p_reaction:emoji});if(error)toast.error(error.message);setReactionOpen(null);})()}>😂</button><button type="button" onClick={()=>void (async()=>{const emoji="👍";const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:m.id,p_reaction:emoji});if(error)toast.error(error.message);setReactionOpen(null);})()}>👍</button><button type="button" onClick={()=>void (async()=>{const emoji="😮";const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:m.id,p_reaction:emoji});if(error)toast.error(error.message);setReactionOpen(null);})()}>😮</button><button type="button" onClick={()=>void (async()=>{const emoji="😢";const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:m.id,p_reaction:emoji});if(error)toast.error(error.message);setReactionOpen(null);})()}>😢</button><button type="button" onClick={()=>void (async()=>{const emoji="🔥";const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:m.id,p_reaction:emoji});if(error)toast.error(error.message);setReactionOpen(null);})()}>🔥</button></div> : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      {live && group?.sendMessages !== false ? (
        {replyTo ? <div className="border-t border-border bg-secondary/30 px-3 py-2 text-xs"><div className="flex items-center justify-between"><span className="text-muted-foreground">Replying to {replyTo.author}</span><Button type="button" variant="ghost" size="sm" onClick={()=>setReplyTo(null)}>Cancel</Button></div><p className="truncate">{replyTo.body}</p></div> : null}
        <form
          className="flex gap-2 border-t border-border bg-background px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            void (async()=>{ const body=draft.trim(); const {data,error}=await (supabase as any).rpc("send_group_message_secure",{p_group_id:group.id,p_body:body,p_reply_to_id:replyTo?.id ?? null}); if(error){toast.error(error.message ?? "Message could not be sent");return;} setChatMessages(x=>[...x,{id:data.id,group_id:group.id,body,created_at:data.created_at,user_id:(await supabase.auth.getUser()).data.user?.id,author:"You (anonymous)",mine:true,reply_to_id:replyTo?.id ?? null,reactions:[]}]); setReplyTo(null); })();
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

    </div>
  );
}
