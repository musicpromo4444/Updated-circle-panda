import { useState } from "react";
import { Image as ImageIcon, Play, Volume2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type GroupMediaItem = { id:string; author:string; body:string; at:number; mine?:boolean; messageType:"text"|"image"|"video"|"audio"; mediaUrl?:string; mediaPath?:string };
export function GroupMediaMessage({ message, viewOnce = false, onDelete }: { message: GroupMediaItem; viewOnce?: boolean; onDelete?: (message: GroupMediaItem) => Promise<void> | void }) {
  const [viewerOpen,setViewerOpen]=useState(false);
  const [opened,setOpened]=useState(false);
  const open=async()=>{ if(!message.mediaUrl)return; if(viewOnce && !opened){const{data,error}=await(supabase as any).rpc("claim_group_media_view_once",{p_message_id:message.id});if(error){return;}if(data!==true){setOpened(true);return;}setOpened(true);} setViewerOpen(true); };
  if(message.messageType==="text")return <p className={`mt-0.5 inline-block max-w-[88%] rounded-2xl px-3.5 py-2 text-sm ${message.mine?"bg-primary text-primary-foreground":"bg-card"}`}>{message.body}</p>;
  const locked=viewOnce&&opened&&!viewerOpen;
  const deleteMessage=async()=>{if(!onDelete)return;if(!window.confirm("Delete this media for everyone?"))return;await onDelete(message);setViewerOpen(false);};
  return <><button type="button" onClick={()=>void open()} disabled={locked} className={`mt-1 block max-w-[88%] overflow-hidden rounded-2xl border text-left ${message.mine?"border-primary/40 bg-primary/10":"border-border bg-card"}`}>
    {locked ? <div className="px-4 py-4 text-sm font-medium">✓ View once · already opened</div> : message.messageType==="image"&&message.mediaUrl ? <img src={message.mediaUrl} alt="Group media" className="max-h-[360px] w-full object-cover"/> : message.messageType==="video"&&message.mediaUrl ? <div className="relative"><video src={message.mediaUrl} playsInline preload="metadata" className="max-h-[360px] w-full object-cover"/><span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid size-12 place-items-center rounded-full bg-black/60 text-white"><Play className="size-5 fill-current"/></span></span></div> : <div className="flex items-center gap-3 px-4 py-3"><Volume2 className="size-5"/><span className="text-sm font-medium">Voice note</span></div>}
    {message.body?<p className="px-3 py-2 text-xs text-muted-foreground">{message.body}</p>:null}
  </button>
  {message.mine && onDelete ? <button type="button" onClick={()=>void deleteMessage()} className="mt-1 inline-flex items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5"/> Delete</button> : null}
  {viewerOpen&&message.mediaUrl?<div className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-3" onClick={()=>setViewerOpen(false)}><Button variant="ghost" size="icon" className="absolute right-3 top-3 z-10 text-white hover:bg-white/10" onClick={()=>setViewerOpen(false)}><X className="size-5"/></Button><div className="flex max-h-full max-w-full items-center justify-center" onClick={e=>e.stopPropagation()}>{message.messageType==="image"?<img src={message.mediaUrl} alt="Group media viewer" className="max-h-[92vh] max-w-[96vw] object-contain"/>:message.messageType==="video"?<video src={message.mediaUrl} controls playsInline controlsList="nodownload" className="max-h-[92vh] max-w-[96vw]"/>:<div className="rounded-3xl border border-white/10 bg-white/5 p-8"><Volume2 className="mx-auto mb-4 size-10 text-white"/><audio src={message.mediaUrl} controls controlsList="nodownload"/></div>}</div></div>:null}</>;
}
export function MediaTypeIcon({type}:{type:"image"|"video"|"audio"}){return type==="image"?<ImageIcon className="size-4"/>:type==="video"?<Play className="size-4"/>:<Volume2 className="size-4"/>;}