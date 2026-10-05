import { useEffect, useRef, useState } from "react";
import { Crown, Phone, Video, X, UserRound, MessageCircle, Flag, Eye, Send } from "lucide-react";
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

type VipMessage = GroupMediaItem & { mediaPath?: string; userId?: string };
type CallConfig = { enabled: boolean; voice_enabled: boolean; video_enabled: boolean };
type MemberProfile = { id: string; display_name: string | null; avatar_url: string | null; country: string | null };

export function VipGroupChat({open,groupId,onOpenChange}:{open:boolean;groupId:string;onOpenChange:(open:boolean)=>void}) {
  const [messages,setMessages]=useState<VipMessage[]>([]);
  const [profiles,setProfiles]=useState<Record<string,MemberProfile>>({});
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

  const loadProfiles = async (ids:string[]) => {
    const unique=[...new Set(ids.filter(Boolean))];
    if(!unique.length)return;
    const {data,error}=await supabase.from("profiles").select("id,display_name,avatar_url,country").in("id",unique);
    if(error)return;
    setProfiles(prev=>Object.fromEntries([...[Object.entries(prev)],...(data??[]).map(p=>[p.id,p])]));
  };

  const mapRow = async(row:any):Promise<VipMessage> => {
    let mediaUrl:string|undefined;
    // View-once media must not receive a reusable URL during message loading.
    if(row.media_path && !Boolean(row.view_once)){
      const {data}=await supabase.storage.from("circle-panda-group-media").createSignedUrl(row.media_path,3600);
      mediaUrl=data?.signedUrl;
    }
    const uid=(await supabase.auth.getUser()).data.user?.id;
    return {
      id:row.id,
      userId:row.sender_id,
      author:row.sender_id===uid?"You":profiles[row.sender_id]?.display_name||"VIP Member",
      body:row.body??"",
      at:new Date(row.created_at).getTime(),
      mine:row.sender_id===uid,
      messageType:row.message_type??"text",
      mediaPath:row.media_path??undefined,
      mediaUrl,
      durationSeconds:row.duration_seconds,
      viewOnce:Boolean(row.view_once)
    };
  };

  useEffect(()=>{
    if(!open||!groupId)return;
    let cancelled=false;
    void (async()=>{
      const wallpaperRes=await (supabase as any).rpc("get_vip_group_wallpaper");
      if(!wallpaperRes.error && wallpaperRes.data?.path && wallpaperRes.data.path!=="__DEFAULT__"){
        const signed=await supabase.storage.from("circle-panda-group-media").createSignedUrl(String(wallpaperRes.data.path),3600);
        if(signed.data?.signedUrl)setWallpaperUrl(signed.data.signedUrl);
      } else setWallpaperUrl(DEFAULT_VIP_WALLPAPER);

      const {data:group,error:groupError}=await supabase.from("groups").select("id,is_vip").eq("id",groupId).maybeSingle();
      if(groupError||!group?.is_vip){toast.error(groupError?.message??"This is not a VIP group");return;}
      const {data:rows,error}=await supabase.from("group_messages").select("id,group_id,sender_id,body,created_at,media_type,media_path,view_once").eq("group_id",groupId).order("created_at",{ascending:true}).limit(1000);
      if(error){toast.error(error.message??"VIP group could not be loaded");return;}
      await loadProfiles(rows.map((r:any)=>r.sender_id));
      const mapped=await Promise.all(rows.map(mapRow));
      if(!cancelled)setMessages(mapped);
    })();
    const ch=supabase.channel(`vip-group:${groupId}:messages`)
      .on("postgres_changes",{event:"*",schema:"public",table:"group_messages",filter:`group_id=eq.${groupId}`},(payload:any)=>{
        if(payload.eventType==="DELETE"){
          if(!cancelled)setMessages(items=>items.filter(m=>m.id!==payload.old?.id));
          return;
        }
        void loadProfiles([payload.new.sender_id]);
        void mapRow(payload.new).then(msg=>{if(!cancelled)setMessages(items=>items.some(m=>m.id===msg.id)?items:[...items,msg])});
      }).subscribe();
    return()=>{cancelled=true;void supabase.removeChannel(ch)};
  },[open,groupId]);

  useEffect(()=>{if(open)bottom.current?.scrollIntoView({behavior:"smooth"})},[messages.length,open]);
  useEffect(()=>{
    if(!open||!groupId)return;
    void (async()=>{
      const {data,error}=await (supabase as any).rpc("get_vip_group_call_runtime",{p_group_id:groupId});
      if(error){console.warn("VIP call settings unavailable",error);return}
      setCallConfig(data?.show?{enabled:Boolean(data.enabled),voice_enabled:Boolean(data.voice_enabled),video_enabled:Boolean(data.video_enabled)}:null);
    })();
  },[open,groupId]);

  const sendText=async(body:string):Promise<boolean>=>{
    const user=(await supabase.auth.getUser()).data.user;
    if(!user){toast.error("Sign in to send messages");return false}
    const {data,error}=await (supabase as any).rpc("send_group_message",{
      p_group_id:groupId,p_body:body,p_media_type:null,p_media_path:null,p_reply_to_id:null,p_view_once:false,p_idempotency_key:crypto.randomUUID()
    });
    if(error){toast.error(error.message??"VIP message could not be sent");return false}
    setMessages(items=>[...items,{id:String(data),userId:user.id,author:"You",body,at:Date.now(),mine:true,messageType:"text"}]);
    return true;
  };

  const sendMedia=async({type,file,durationSeconds,viewOnce}:OutgoingGroupMedia)=>{
    const user=(await supabase.auth.getUser()).data.user;
    if(!user) throw new Error("Sign in to send media");
    if(file.size>25*1024*1024) throw new Error("Media must be 25 MB or smaller.");
    let uploadFile=file;
    if(type==="image"&&/(^image\/(heic|heif)$)|\.(heic|heif)$/i.test(file.type||file.name)){
      try{
        const converted=await heic2any({blob:file,toType:"image/jpeg",quality:0.9});
        const blob=Array.isArray(converted)?converted[0]:converted;
        uploadFile=new File([blob],file.name.replace(/\.(heic|heif)$/i,".jpg"),{type:"image/jpeg"});
      }catch{throw new Error("This HEIC photo could not be converted.")}
    }
    const ext=uploadFile.name.split(".").pop()?.toLowerCase()??(type==="image"?"jpg":type==="video"?"mp4":"webm");
    const path=user.id+"/"+groupId+"/"+crypto.randomUUID()+"."+ext;
    const {error:uploadError}=await supabase.storage.from("circle-panda-group-media").upload(path,uploadFile,{contentType:uploadFile.type||"application/octet-stream",upsert:false});
    if(uploadError) throw new Error(uploadError.message??"Media upload failed");
    const selectedViewOnce=type==="audio"?false:Boolean(viewOnce);
    const {data,error}=await (supabase as any).rpc("send_group_message",{
      p_group_id:groupId,p_body:"",p_media_type:type,p_media_path:path,p_reply_to_id:null,p_view_once:selectedViewOnce,p_idempotency_key:crypto.randomUUID()
    });
    if(error){
      await supabase.storage.from("circle-panda-group-media").remove([path]);
      throw new Error(error.message??"VIP media could not be sent");
    }
    const {data:signed}=await supabase.storage.from("circle-panda-group-media").createSignedUrl(path,3600);
    setMessages(items=>[...items,{id:String(data),userId:user.id,author:"You",body:"",at:Date.now(),mine:true,messageType:type,mediaPath:path,mediaUrl:signed?.signedUrl,durationSeconds,viewOnce:selectedViewOnce}]);
  };

  const deleteMedia=async(message: VipMessage)=>{
    if(!message.mine)return;
    const {data,error}=await (supabase as any).rpc("delete_group_message",{p_message_id:message.id});
    if(error){toast.error(error.message??"Media could not be deleted");return}
    setMessages(items=>items.filter(m=>m.id!==message.id));
    if(data?.media_path){
      const {error:storageError}=await supabase.storage.from("circle-panda-group-media").remove([data.media_path]);
      if(storageError) toast.warning("The message was deleted, but the stored media could not be cleaned up automatically.");
    }
    toast.success("Media deleted");
  };

  const openMember=(userId:string,name:string)=>{
    if(!userId)return;
    setMemberMenu({userId,name});
    setDmText("");
  };

  const sendMemberRequest=async()=>{
    if(!memberMenu)return;
    const currentUserId=(await supabase.auth.getUser()).data.user?.id;
    if(currentUserId===memberMenu.userId){window.dispatchEvent(new CustomEvent("circle-panda-self-message-blocked"));setDmOpen(false);setMemberMenu(null);return;}
    setBusy(true);
    const {error}=await (supabase as any).rpc("start_dm_request",{p_recipient_id:memberMenu.userId,p_body:dmText.trim()||"Hi, I’d like to chat with you.",p_media_path:null,p_media_type:null,p_context_type:"direct",p_context_id:null});
    setBusy(false);
    if(error){toast.error(error.message??"Message request could not be sent");return}
    toast.success(`Message request sent to ${memberMenu.name}`);
    setDmOpen(false);setMemberMenu(null);setDmText("");
  };

  const reportMember=async()=>{
    if(!memberMenu)return;
    setBusy(true);
    const {error}=await (supabase as any).rpc("report_group_user_secure",{p_group_id:groupId,p_target_user_id:memberMenu.userId,p_reason:reportReason||"Other",p_details:"Reported from VIP group"});
    setBusy(false);
    if(error){toast.error(error.message??"Report could not be submitted");return}
    toast.success("Report submitted");
    setReportOpen(false);setMemberMenu(null);setReportReason("");
  };

  const viewProfile=()=>{if(memberMenu)window.location.assign(`/profile/${memberMenu.userId}`)};
  const viewSecrets=()=>{if(memberMenu)window.location.assign(`/profile/${memberMenu.userId}/secrets`)};

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
            return <div key={m.id} className={m.mine?"text-right":""}>
              <button type="button" className="mb-0.5 inline-flex items-center gap-1.5 px-2 text-[11px] text-amber-400/80 hover:text-amber-300" onClick={()=>m.userId&&openMember(m.userId,displayName)} disabled={m.mine}>
                <UserRound className="size-3"/> {displayName}
              </button>
              <GroupMediaMessage message={m} viewOnce={Boolean(m.viewOnce)} onDelete={m.mine ? deleteMedia : undefined}/>
            </div>
          })}
          <div ref={bottom}/>
        </div>
      </main>

      <footer className="shrink-0 border-t border-amber-400/20 bg-background px-2 py-2 sm:px-3"><div className="mx-auto max-w-4xl"><GroupComposer placeholder="Message the VIP group…" onSendText={sendText} onSendMedia={sendMedia} allowViewOnce={true}/></div></footer>
      <VipGroupSponsorGift groupId={groupId}/>
      {activeCall?<VipGroupCallOverlay type={activeCall} groupId={groupId} onClose={()=>setActiveCall(null)}/>:null}
    </div>

    {memberMenu?<div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" onClick={()=>setMemberMenu(null)}>
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-card p-4 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center overflow-hidden rounded-full border border-amber-400/40 bg-amber-500/10">
            {profiles[memberMenu.userId]?.avatar_url?<img src={profiles[memberMenu.userId].avatar_url!} alt="" className="size-full object-cover"/>:<UserRound className="size-5 text-amber-400"/>}
          </div>
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
