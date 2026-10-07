import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, Phone, Video, X, UserRound, MessageCircle, Flag, Eye, Send, Reply, Trash2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupComposer, type OutgoingGroupMedia } from "@/components/groups/GroupComposer";
import { GroupMediaMessage, type GroupMediaItem } from "@/components/groups/GroupMediaMessage";
import { VipGroupCallOverlay } from "@/components/groups/VipGroupCallOverlay";
import { VipGroupSponsorGift } from "@/components/groups/VipGroupSponsorGift";
import { supabase } from "@/integrations/supabase/client";
import heic2any from "heic2any";
import { toast } from "sonner";
import { DEFAULT_VIP_WALLPAPER } from "./vipWallpaper";

type VipMessage = GroupMediaItem & {
  mediaPath?: string;
  userId?: string;
  replyToId?: string | null;
  avatarId?: string | null;
  country?: string | null;
};
type CallConfig = { enabled: boolean; voice_enabled: boolean; video_enabled: boolean };
type MemberProfile = { id: string; display_name: string | null; avatar_id: string | null; country: string | null };
type Reaction = { reaction: string; count: number; mine: boolean };
const REACTIONS = ["❤️","😂","😮","😡","🐼"];

export function VipGroupChat({open,groupId,onOpenChange}:{open:boolean;groupId:string;onOpenChange:(open:boolean)=>void}) {
  const [messages,setMessages]=useState<VipMessage[]>([]);
  const [profiles,setProfiles]=useState<Record<string,MemberProfile>>({});
  const [reactions,setReactions]=useState<Record<string,Reaction[]>>({});
  const [reactionFor,setReactionFor]=useState<string|null>(null);
  const [replyTo,setReplyTo]=useState<{id:string;author:string;body:string}|null>(null);
  const [callConfig,setCallConfig]=useState<CallConfig|null>(null);
  const [activeCall,setActiveCall]=useState<"voice"|"video"|null>(null);
  const [memberMenu,setMemberMenu]=useState<{userId:string;name:string}|null>(null);
  const [dmOpen,setDmOpen]=useState(false);
  const [dmText,setDmText]=useState("");
  const [reportOpen,setReportOpen]=useState(false);
  const [reportReason,setReportReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [wallpaperUrl,setWallpaperUrl]=useState(DEFAULT_VIP_WALLPAPER);
  const bottom=useRef<HTMLDivElement>(null);

  const loadProfiles = useCallback(async(ids:string[])=>{
    const unique=[...new Set(ids.filter(Boolean))];
    if(!unique.length)return;
    const {data,error}=await supabase.from("profiles").select("id,display_name,avatar_id,country").in("id",unique);
    if(!error)setProfiles(prev=>({...prev,...Object.fromEntries((data??[]).map(p=>[p.id,p]))}));
  },[]);

  const loadReactions = useCallback(async(ids:string[])=>{
    if(!ids.length){setReactions({});return;}
    const {data,error}=await (supabase as any).rpc("get_group_message_reactions",{p_message_ids:ids});
    if(error){console.warn("VIP reactions unavailable",error);return;}
    const next:Record<string,Reaction[]>={};
    for(const row of (data??[])) (next[row.message_id]??=[]).push({reaction:row.reaction,count:Number(row.count),mine:Boolean(row.mine)});
    setReactions(next);
  },[]);

  const loadMessages = useCallback(async()=>{
    if(!groupId)return;
    const {data,error}=await (supabase as any).rpc("get_vip_group_messages",{p_group_id:groupId});
    if(error){toast.error(error.message??"VIP group could not be loaded");return;}
    const rows=data??[];
    await loadProfiles(rows.map((r:any)=>r.user_id));
    const uid=(await supabase.auth.getUser()).data.user?.id;
    const mapped=await Promise.all(rows.map(async(row:any):Promise<VipMessage>=>{
      let mediaUrl:string|undefined;
      if(row.media_path){
        const {data:signed}=await supabase.storage.from("circle-panda-group-media").createSignedUrl(row.media_path,3600);
        mediaUrl=signed?.signedUrl;
      }
      return {
        id:row.id,userId:row.user_id,author:row.user_id===uid?"You":row.display_name||"VIP Member",
        body:row.body??"",at:new Date(row.created_at).getTime(),mine:row.user_id===uid,
        messageType:row.message_type??"text",mediaPath:row.media_path??undefined,mediaUrl,
        durationSeconds:row.duration_seconds,viewOnce:false,replyToId:row.reply_to_id,
        avatarId:row.avatar_id,country:row.country
      };
    }));
    setMessages(mapped);
    await loadReactions(mapped.map(m=>m.id));
  },[groupId,loadProfiles,loadReactions]);

  useEffect(()=>{
    if(!open||!groupId)return;
    let cancelled=false;
    void (async()=>{
      const join=await (supabase as any).rpc("join_vip_group",{p_group_id:groupId});
      if(join.error){toast.error(join.error.message??"VIP group access failed");onOpenChange(false);return;}
      const wallpaperRes=await (supabase as any).rpc("get_vip_group_wallpaper");
      if(!wallpaperRes.error && wallpaperRes.data?.path && wallpaperRes.data.path!=="__DEFAULT__"){
        const signed=await supabase.storage.from("circle-panda-group-media").createSignedUrl(String(wallpaperRes.data.path),3600);
        if(signed.data?.signedUrl&&!cancelled)setWallpaperUrl(signed.data.signedUrl);
      } else if(!cancelled)setWallpaperUrl(DEFAULT_VIP_WALLPAPER);
      if(!cancelled)await loadMessages();
    })();
    const ch=supabase.channel("vip-group:"+groupId+":messages")
      .on("postgres_changes",{event:"*",schema:"public",table:"group_messages",filter:"group_id=eq."+groupId},()=>{if(!cancelled)void loadMessages()})
      .on("postgres_changes",{event:"*",schema:"public",table:"group_message_reactions"},(payload:any)=>{
        if(!cancelled && payload?.new?.message_id)void loadReactions(messages.map(m=>m.id));
      }).subscribe();
    return()=>{cancelled=true;void supabase.removeChannel(ch)};
  },[open,groupId,loadMessages,loadReactions,onOpenChange]);

  useEffect(()=>{if(open)bottom.current?.scrollIntoView({behavior:"smooth"})},[messages.length,open]);

  useEffect(()=>{
    if(!open||!groupId)return;
    void (async()=>{
      const {data,error}=await (supabase as any).rpc("get_vip_group_call_runtime",{p_group_id:groupId});
      if(error){console.warn("VIP call settings unavailable",error);setCallConfig(null);return;}
      setCallConfig(data?.show?{enabled:Boolean(data.enabled),voice_enabled:Boolean(data.voice_enabled),video_enabled:Boolean(data.video_enabled)}:null);
    })();
  },[open,groupId]);

  const sendText=async(body:string,replyToId?:string)=>{
    const {error}=await (supabase as any).rpc("send_vip_group_message_secure",{p_group_id:groupId,p_body:body,p_reply_to_id:replyToId??null});
    if(error){toast.error(error.message??"VIP message could not be sent");return;}
    setReplyTo(null);
    await loadMessages();
  };

  const sendMedia=async({type,file,durationSeconds,replyToId}:OutgoingGroupMedia)=>{
    const user=(await supabase.auth.getUser()).data.user;
    if(!user){toast.error("Sign in to send media");return;}
    if(file.size>25*1024*1024){toast.error("Media must be 25 MB or smaller.");return;}
    let uploadFile=file;
    if(type==="image"&&/(^image\/(heic|heif)$)|\.(heic|heif)$/i.test(file.type||file.name)){
      try{
        const converted=await heic2any({blob:file,toType:"image/jpeg",quality:0.9});
        const blob=Array.isArray(converted)?converted[0]:converted;
        uploadFile=new File([blob],file.name.replace(/\.(heic|heif)$/i,".jpg"),{type:"image/jpeg"});
      }catch{toast.error("This HEIC photo could not be converted.");return;}
    }
    const ext=uploadFile.name.split(".").pop()?.toLowerCase()??(type==="image"?"jpg":type==="video"?"mp4":"webm");
    const path=`vip/${user.id}/${groupId}/${crypto.randomUUID()}.${ext}`;
    const {error:uploadError}=await supabase.storage.from("circle-panda-group-media").upload(path,uploadFile,{contentType:uploadFile.type||"application/octet-stream",upsert:false});
    if(uploadError){toast.error(uploadError.message??"Media upload failed");return;}
    const {error}=await (supabase as any).rpc("send_vip_group_media_secure",{p_group_id:groupId,p_message_type:type,p_media_path:path,p_mime_type:uploadFile.type||null,p_duration_seconds:durationSeconds??null,p_body:"",p_view_once:false,p_reply_to_id:replyToId??null});
    if(error){await supabase.storage.from("circle-panda-group-media").remove([path]);toast.error(error.message??"VIP media could not be sent");return;}
    setReplyTo(null);
    await loadMessages();
  };

  const deleteMessage=async(m:VipMessage)=>{
    if(!m.mine)return;
    const {data,error}=await (supabase as any).rpc("delete_group_message",{p_message_id:m.id});
    if(error){toast.error(error.message??"Message could not be deleted");return;}
    if(data?.media_path)await supabase.storage.from("circle-panda-group-media").remove([String(data.media_path)]);
    setMessages(items=>items.filter(x=>x.id!==m.id));
    setReactions(prev=>{const n={...prev};delete n[m.id];return n});
    toast.success("Message deleted");
  };

  const react=async(id:string,reaction:string)=>{
    const {error}=await (supabase as any).rpc("toggle_group_message_reaction",{p_message_id:id,p_reaction:reaction});
    if(error){toast.error(error.message??"Reaction failed");return;}
    setReactionFor(null);
    await loadReactions(messages.map(m=>m.id));
  };

  const openMember=(userId:string,name:string)=>{if(userId){setMemberMenu({userId,name});setDmText("");}};

  const sendMemberRequest=async()=>{
    if(!memberMenu)return;
    const currentUserId=(await supabase.auth.getUser()).data.user?.id;
    if(currentUserId===memberMenu.userId){setDmOpen(false);setMemberMenu(null);return;}
    setBusy(true);
    const {error}=await (supabase as any).rpc("request_direct_message_secure",{p_recipient_id:memberMenu.userId,p_message:dmText.trim()||"Hi, I’d like to chat with you."});
    setBusy(false);
    if(error){toast.error(error.message??"Message request could not be sent");return;}
    toast.success(`Message request sent to ${memberMenu.name}`);
    setDmOpen(false);setMemberMenu(null);setDmText("");
  };

  const reportMember=async()=>{
    if(!memberMenu)return;
    setBusy(true);
    const {error}=await (supabase as any).rpc("report_group_user_secure",{p_group_id:groupId,p_target_user_id:memberMenu.userId,p_reason:reportReason||"Other",p_details:"Reported from VIP group"});
    setBusy(false);
    if(error){toast.error(error.message??"Report could not be submitted");return;}
    toast.success("Report submitted");setReportOpen(false);setMemberMenu(null);setReportReason("");
  };

  const viewProfile=()=>{if(memberMenu)window.location.assign("/profile/"+memberMenu.userId)};
  const viewSecrets=()=>{if(memberMenu)window.location.assign("/profile/"+memberMenu.userId+"/secrets")};

  if(!open)return null;
  return <>
    <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-400/30 bg-background/95 px-3 py-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={()=>onOpenChange(false)} aria-label="Close VIP group"><X className="size-5"/></Button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-400/60 bg-amber-500/15 text-amber-400"><Crown className="size-5"/></span>
        <div className="min-w-0 flex-1"><p className="font-display font-bold">VIP Group</p><p className="text-[11px] text-amber-400/80">Private VIP community · full-screen chat</p></div>
        {callConfig?.enabled&&callConfig.voice_enabled?<Button variant="ghost" size="icon" title="VIP group voice call" onClick={()=>setActiveCall("voice")}><Phone className="size-5 text-amber-400"/></Button>:null}
        {callConfig?.enabled&&callConfig.video_enabled?<Button variant="ghost" size="icon" title="VIP group video call" onClick={()=>setActiveCall("video")}><Video className="size-5 text-amber-400"/></Button>:null}
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" style={{backgroundImage:`linear-gradient(rgba(5,12,10,.72),rgba(5,12,10,.82)),url(${wallpaperUrl})`,backgroundSize:"cover",backgroundPosition:"center",backgroundAttachment:"fixed"}}>
        <div className="mx-auto max-w-4xl space-y-3">
          {messages.map(m=>{
            const displayName=m.mine?"You":(profiles[m.userId||""]?.display_name||m.author||"VIP Member");
            const reply=m.replyToId?messages.find(x=>x.id===m.replyToId):null;
            const rs=reactions[m.id]??[];
            return <div key={m.id} className={m.mine?"text-right":""}>
              <button type="button" className="mb-0.5 inline-flex items-center gap-1.5 px-2 text-[11px] text-amber-400/80 hover:text-amber-300" onClick={()=>m.userId&&openMember(m.userId,displayName)} disabled={m.mine}><UserRound className="size-3"/> {displayName}</button>
              <div className="group relative inline-block max-w-[92%] text-left">
                {reply?<div className="mb-1 rounded-xl border border-amber-400/20 bg-black/20 px-3 py-1.5 text-[11px] text-amber-100/70"><b>Replying to {reply.mine?"You":reply.author}</b><div className="truncate">{reply.body||"Media"}</div></div>:null}
                <GroupMediaMessage message={m} viewOnce={false}/>
                <div className="mt-1 flex items-center gap-1 opacity-100">
                  <Button variant="ghost" size="icon" className="size-7" title="React" onClick={()=>setReactionFor(reactionFor===m.id?null:m.id)}><Smile className="size-4"/></Button>
                  <Button variant="ghost" size="icon" className="size-7" title="Reply" onClick={()=>setReplyTo({id:m.id,author:displayName,body:m.body})}><Reply className="size-4"/></Button>
                  {m.mine?<Button variant="ghost" size="icon" className="size-7 text-destructive" title="Delete" onClick={()=>void deleteMessage(m)}><Trash2 className="size-4"/></Button>:null}
                </div>
                {reactionFor===m.id?<div className="mt-1 flex gap-1 rounded-full border border-amber-400/20 bg-background/95 p-1 shadow-xl">{REACTIONS.map(r=><button key={r} type="button" className="grid size-8 place-items-center rounded-full hover:bg-amber-500/15" onClick={()=>void react(m.id,r)}>{r}</button>)}</div>:null}
                {rs.length?<div className="mt-1 flex flex-wrap gap-1">{rs.map(r=><button key={r.reaction} type="button" className={r.mine?"rounded-full border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-xs":"rounded-full bg-black/20 px-2 py-0.5 text-xs"} onClick={()=>void react(m.id,r.reaction)}>{r.reaction} {r.count}</button>)}</div>:null}
              </div>
            </div>;
          })}
          <div ref={bottom}/>
        </div>
      </main>

      <footer className="shrink-0 border-t border-amber-400/20 bg-background px-2 py-2 sm:px-3"><div className="mx-auto max-w-4xl"><GroupComposer placeholder="Message the VIP group…" onSendText={sendText} onSendMedia={sendMedia} replyTo={replyTo} onCancelReply={()=>setReplyTo(null)}/></div></footer>
      <VipGroupSponsorGift groupId={groupId}/>
      {activeCall?<VipGroupCallOverlay type={activeCall} groupId={groupId} onClose={()=>setActiveCall(null)}/>:null}
    </div>

    {memberMenu?<div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" onClick={()=>setMemberMenu(null)}>
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-card p-4 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center overflow-hidden rounded-full border border-amber-400/40 bg-amber-500/10"><span className="text-xl">🐼</span></div>
          <div className="min-w-0 flex-1"><p className="font-bold truncate">{memberMenu.name}</p><p className="text-[11px] text-muted-foreground">{profiles[memberMenu.userId]?.country||"VIP member"}</p></div>
          <Button variant="ghost" size="icon" onClick={()=>setMemberMenu(null)}><X className="size-4"/></Button>
        </div>
        <div className="mt-4 grid gap-2">
          <Button variant="outline" className="justify-start gap-2" onClick={viewProfile}><UserRound className="size-4"/>View profile</Button>
          <Button variant="outline" className="justify-start gap-2" onClick={()=>setDmOpen(true)}><MessageCircle className="size-4"/>Message directly</Button>
          <Button variant="outline" className="justify-start gap-2" onClick={viewSecrets}><Eye className="size-4"/>View Secrets</Button>
          <Button variant="outline" className="justify-start gap-2 text-destructive" onClick={()=>setReportOpen(true)}><Flag className="size-4"/>Report person</Button>
        </div>
      </div>
    </div>:null}

    {dmOpen&&memberMenu?<div className="fixed inset-0 z-[130] grid place-items-center bg-black/70 p-4" onClick={()=>setDmOpen(false)}>
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-card p-4" onClick={e=>e.stopPropagation()}>
        <p className="font-bold">Message {memberMenu.name}</p><p className="mt-1 text-xs text-muted-foreground">This sends a direct-message request.</p>
        <Input value={dmText} onChange={e=>setDmText(e.target.value)} placeholder="Write a short message…" className="mt-3"/>
        <Button className="mt-3 w-full" disabled={busy} onClick={()=>void sendMemberRequest()}><Send className="mr-2 size-4"/>Send request</Button>
      </div>
    </div>:null}

    {reportOpen&&memberMenu?<div className="fixed inset-0 z-[130] grid place-items-center bg-black/70 p-4" onClick={()=>setReportOpen(false)}>
      <div className="w-full max-w-sm rounded-3xl border border-destructive/30 bg-card p-4" onClick={e=>e.stopPropagation()}>
        <p className="font-bold">Report {memberMenu.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">Choose a reason. The report goes to Circle Panda moderation.</p>
        <select value={reportReason} onChange={e=>setReportReason(e.target.value)} className="mt-3 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
          <option value="">Select reason</option><option>Spam</option><option>Harassment</option><option>Scam or fraud</option><option>Inappropriate content</option><option>Other</option>
        </select>
        <Button variant="destructive" className="mt-3 w-full" disabled={busy||!reportReason} onClick={()=>void reportMember()}><Flag className="mr-2 size-4"/>Submit report</Button>
      </div>
    </div>:null}
  </>;
}
