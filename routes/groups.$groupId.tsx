import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Lock, LogOut, Pencil, Settings, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, DAY_MS, type GroupChatMessage } from "@/lib/store";
import { GroupComposer, type OutgoingGroupMedia } from "@/components/groups/GroupComposer";
import { GroupMediaMessage, type GroupMediaItem } from "@/components/groups/GroupMediaMessage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({ meta: [
    { title: "Group Chat — Circle Panda" },
    { name: "description", content: "Full-screen Circle Panda group chat with text, photos, videos and voice notes." },
  ]}),
  component: GroupRoom,
});

function countdown(openedAt: number) {
  const left = Math.max(0, openedAt + DAY_MS - Date.now());
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function GroupRoom() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const { groups, isGroupExpired, leaveGroup, updateGroupInfo, updateGroupSettings } = useStore();
  const group = groups.find((g) => g.id === groupId) ?? null;
  const [messages, setMessages] = useState<GroupChatMessage[]>(group?.messages ?? []);
  const [, setTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memberEditOpen, setMemberEditOpen] = useState(false);
  const [editName, setEditName] = useState(group?.name ?? "");
  const [editTopic, setEditTopic] = useState(group?.topic ?? "");
  const [editPolicy, setEditPolicy] = useState<"admins"|"admins_members">(group?.editGroupInfo ?? "admins");
  const [sendMessages, setSendMessages] = useState(group?.sendMessages ?? true);
  const [approveMembers, setApproveMembers] = useState(group?.approveNewMembers ?? false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const expired = group ? isGroupExpired(group) : false;
  const live = !!group && group.openedAt !== null && !expired;

  useEffect(() => { const timer=window.setInterval(()=>setTick(v=>v+1),1000); return()=>window.clearInterval(timer); }, []);
  useEffect(() => { if (!group) return; setEditName(group.name); setEditTopic(group.topic); setEditPolicy(group.editGroupInfo ?? "admins"); setSendMessages(group.sendMessages ?? true); setApproveMembers(group.approveNewMembers ?? false); }, [group?.id,group?.name,group?.topic,group?.editGroupInfo,group?.sendMessages,group?.approveNewMembers]);

  useEffect(() => {
    if (!group || !["owner","admin"].includes(group.memberRole ?? "")) { setJoinRequests([]); return; }
    void (supabase as any).from("group_join_requests").select("id,user_id,created_at,status").eq("group_id",group.id).eq("status","pending").order("created_at",{ascending:true}).then(({data}:any)=>setJoinRequests(data ?? []));
  }, [group?.id,group?.memberRole,group?.approveNewMembers]);

  const mapRow = async (row:any):Promise<GroupChatMessage> => {
    let mediaUrl:string|undefined;
    if(row.media_path){const {data}=await (supabase as any).storage.from("circle-panda-group-media").createSignedUrl(row.media_path,3600);mediaUrl=data?.signedUrl;}
    const current=(await supabase.auth.getUser()).data.user?.id;
    return {id:row.id,author:row.user_id===current?"You (anonymous)":"Anonymous Panda",body:row.body??"",at:new Date(row.created_at).getTime(),mine:row.user_id===current,messageType:row.message_type??"text",mediaPath:row.media_path??undefined,mimeType:row.mime_type??undefined,durationSeconds:row.duration_seconds??null,mediaUrl};
  };

  useEffect(() => {
    if(!groupId || !live) return;
    let cancelled=false;
    void (async()=>{const {data,error}=await (supabase as any).from("cp_group_messages").select("id,group_id,user_id,body,created_at,message_type,media_path,mime_type,duration_seconds").eq("group_id",groupId).order("created_at",{ascending:true}).limit(1000); if(error){toast.error(error.message??"Could not load group messages");return;} const rows=await Promise.all((data??[]).map(mapRow)); if(!cancelled)setMessages(rows);})();
    const channel=supabase.channel(`group:${groupId}:messages`).on("postgres_changes",{event:"INSERT",schema:"public",table:"cp_group_messages",filter:`group_id=eq.${groupId}`},(payload:any)=>{void mapRow(payload.new).then(msg=>{if(!cancelled)setMessages(current=>current.some(m=>m.id===msg.id)?current:[...current,msg]);});}).subscribe();
    return()=>{cancelled=true;void supabase.removeChannel(channel);};
  },[groupId,live]);

  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[messages.length]);

  const sendText=async(body:string)=>{const {data,error}=await (supabase as any).rpc("send_group_message_secure",{p_group_id:groupId,p_body:body});if(error){toast.error(error.message??"Message could not be sent");return;}setMessages(current=>[...current,{id:data.id,author:"You (anonymous)",body,at:new Date(data.created_at).getTime(),mine:true,messageType:"text"}]);};
  const sendMedia=async({type,file,durationSeconds}:OutgoingGroupMedia)=>{const user=(await supabase.auth.getUser()).data.user;if(!user){toast.error("Sign in to send media");return;}const ext=file.name.split(".").pop()?.toLowerCase()||(type==="image"?"jpg":type==="video"?"mp4":"webm");const path=`${groupId}/${user.id}/${crypto.randomUUID()}.${ext}`;const {error:uploadError}=await (supabase as any).storage.from("circle-panda-group-media").upload(path,file,{contentType:file.type,upsert:false});if(uploadError){toast.error(uploadError.message??"Media upload failed");return;}const {data,error}=await (supabase as any).rpc("send_group_media_secure",{p_group_id:groupId,p_message_type:type,p_media_path:path,p_mime_type:file.type,p_duration_seconds:durationSeconds??null,p_body:""});if(error){await (supabase as any).storage.from("circle-panda-group-media").remove([path]);toast.error(error.message??"Media message could not be sent");return;}const {data:signed}=await (supabase as any).storage.from("circle-panda-group-media").createSignedUrl(path,3600);setMessages(current=>[...current,{id:data.id,author:"You (anonymous)",body:"",at:new Date(data.created_at).getTime(),mine:true,messageType:type,mediaPath:path,mimeType:file.type,durationSeconds:durationSeconds??null,mediaUrl:signed?.signedUrl}]);};

  const mediaMessages:GroupMediaItem[]=useMemo(()=>messages.map(m=>({id:m.id,author:m.author,body:m.body,at:m.at,mine:m.mine,messageType:m.messageType??"text",mediaUrl:m.mediaUrl})),[messages]);

  if(!group)return <div className="grid h-[100dvh] place-items-center bg-background p-6 text-center"><div><p className="font-semibold">Group not found</p><Button asChild className="mt-4"><Link to="/groups">Back to groups</Link></Button></div></div>;

  return <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
    <header className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl">
      <Button asChild variant="ghost" size="icon" aria-label="Back to groups"><Link to="/groups"><ChevronLeft className="size-5"/></Link></Button>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-lg">🐼</span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display font-bold">{group.name}</p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="size-3"/> {group.members} members · {group.memberRole==="owner"?"Owner":group.memberRole==="admin"?"Admin":"Member"}</p>
      </div>
      <Button variant="ghost" size="icon" aria-label="Group settings" onClick={()=>setSettingsOpen(v=>!v)}><Settings className="size-5"/></Button>
    </header>

    {settingsOpen?<div className="absolute inset-x-0 top-[65px] z-20 mx-auto max-w-lg rounded-b-2xl border border-border/70 bg-background p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Group settings</h2><span className="text-xs text-muted-foreground">{group.memberRole==="owner"?"Owner":group.memberRole==="admin"?"Admin":"Member"}</span></div>
      <div className="space-y-3">
        <div><p className="text-xs text-muted-foreground">Group name</p><p className="font-medium">{group.name}</p></div>
        <div><p className="text-xs text-muted-foreground">Group topic</p><p className="font-medium">{group.topic || "No topic set"}</p></div>
        <div><p className="text-xs text-muted-foreground">Who can edit group info</p><p className="font-medium">{group.editGroupInfo==="admins_members"?"All members":"Admins only"}</p></div>
        <div><p className="text-xs text-muted-foreground">Who can send messages</p><p className="font-medium">{group.sendMessages===false?"Admins only":"All members"}</p></div>
        <div><p className="text-xs text-muted-foreground">New member approval</p><p className="font-medium">{group.approveNewMembers?"Required":"Not required"}</p></div>
        {(group.memberRole==="owner"||group.memberRole==="admin")?<div className="mt-4 border-t border-border/70 pt-4">
          <div className="grid gap-3">
            <Input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Group name"/>
            <textarea value={editTopic} onChange={e=>setEditTopic(e.target.value)} rows={2} className="rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Group topic"/>
            <label className="text-xs font-medium">Who can edit group info<select value={editPolicy} onChange={e=>setEditPolicy(e.target.value as any)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"><option value="admins">Admins only</option><option value="admins_members">All members</option></select></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sendMessages} onChange={e=>setSendMessages(e.target.checked)}/> Members can send messages</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={approveMembers} onChange={e=>setApproveMembers(e.target.checked)}/> Approve new members</label>
            {approveMembers&&joinRequests.length?<div className="space-y-2">{joinRequests.map(request=><div key={request.id} className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2"><span className="flex-1 text-xs text-muted-foreground">Anonymous Panda · {new Date(request.created_at).toLocaleString()}</span><Button size="sm" onClick={()=>void (supabase as any).rpc("review_group_join_request",{p_request_id:request.id,p_approve:true}).then(({error}:any)=>{if(error)throw error;setJoinRequests(x=>x.filter(v=>v.id!==request.id));toast.success("Member approved")}).catch((e:any)=>toast.error(e?.message??"Could not approve request"))}>Approve</Button><Button size="sm" variant="outline" onClick={()=>void (supabase as any).rpc("review_group_join_request",{p_request_id:request.id,p_approve:false}).then(({error}:any)=>{if(error)throw error;setJoinRequests(x=>x.filter(v=>v.id!==request.id));toast.success("Request declined")}).catch((e:any)=>toast.error(e?.message??"Could not decline request"))}>Decline</Button></div>)}</div>:null}
            <div className="flex justify-end"><Button size="sm" onClick={()=>{updateGroupInfo(group.id,editName.trim(),editTopic.trim());updateGroupSettings(group.id,editPolicy,sendMessages,approveMembers);setSettingsOpen(false)}}>Save changes</Button></div>
          </div>
        </div>:<div className="border-t border-border/70 pt-3"><Button variant="ghost" className="w-full justify-start text-destructive" onClick={()=>leaveGroup(group.id)}><LogOut className="mr-2 size-4"/>Leave group</Button></div>}
      </div>
    </div>:null}

    <main className="min-h-0 flex-1 overflow-y-auto bg-secondary/10 px-3 py-4 sm:px-5">
      <div className="mx-auto max-w-4xl space-y-3">
        {!live?<div className="py-12 text-center text-sm text-muted-foreground"><Lock className="mx-auto mb-2 size-6"/>{expired?"This group is locked after its 24-hour chat window.":"This group is waiting to be activated."}</div>:null}
        {live&&mediaMessages.map(m=><div key={m.id} className={m.mine?"text-right":""}><p className="px-2 text-[11px] text-muted-foreground">{m.author}</p><GroupMediaMessage message={m}/></div>)}
        <div ref={bottom}/>
      </div>
    </main>

    <footer className="shrink-0 border-t border-border bg-background px-2 py-2 sm:px-3"><div className="mx-auto max-w-4xl">{live&&group.sendMessages!==false?<GroupComposer disabled={!live} placeholder="Message the group…" onSendText={sendText} onSendMedia={sendMedia}/>:live?<p className="py-2 text-center text-xs text-muted-foreground">Only group admins can send messages right now.</p>:null}</div></footer>
  </div>;>;
}
