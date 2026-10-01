import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type MediaType = "music" | "audio" | "video";
type Source = "spotify" | "audiomack" | "circle_panda_upload" | "direct_sponsor";
type Item = {
  id:string; media_type:MediaType; source:Source; provider_item_type:string; title:string; artist:string|null;
  description:string|null; external_id:string|null; media_url:string|null; thumbnail_url:string|null;
  duration_seconds:number; sort_order:number; is_published:boolean; metadata:Record<string,unknown>;
};

const SOURCE_LABELS:Record<Source,string>={spotify:"Spotify",audiomack:"Audiomack",circle_panda_upload:"Circle Panda Upload",direct_sponsor:"Direct Sponsor"};
const TYPE_OPTIONS:Record<MediaType,string[]>={music:["single","playlist","ep","album"],audio:["podcast","episode","audiobook"],video:["video"]};

async function uploadMedia(file:File,folder:string){
  const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-");
  const path=`circle-panda-media/${folder}/${crypto.randomUUID()}-${safe}`;
  const {error}=await supabase.storage.from("event-media").upload(path,file,{upsert:false,contentType:file.type});
  if(error) throw error;
  const {data}=supabase.storage.from("event-media").getPublicUrl(path);
  return data.publicUrl;
}

export function CirclePandaMediaManager(){
  const [items,setItems]=useState<Item[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [draft,setDraft]=useState<Partial<Item>>({media_type:"music",source:"circle_panda_upload",provider_item_type:"single",title:"",artist:"",description:"",external_id:"",media_url:"",thumbnail_url:"",duration_seconds:0,sort_order:0,is_published:false,metadata:{}});
  const [uploading,setUploading]=useState(false);
  const load=async()=>{setLoading(true);const {data,error}=await (supabase as any).rpc("admin_list_circle_panda_media");setLoading(false);if(error)return toast.error(error.message);setItems((data??[]) as Item[])};
  useEffect(()=>{void load()},[]);
  const options=useMemo(()=>TYPE_OPTIONS[(draft.media_type??"music") as MediaType], [draft.media_type]);
  const set=(patch:Partial<Item>)=>setDraft(d=>({...d,...patch}));
  const reset=()=>setDraft({media_type:"music",source:"circle_panda_upload",provider_item_type:"single",title:"",artist:"",description:"",external_id:"",media_url:"",thumbnail_url:"",duration_seconds:0,sort_order:0,is_published:false,metadata:{}});
  const save=async()=>{if(!draft.title?.trim())return toast.error("Title is required");if((draft.source==="circle_panda_upload"||draft.source==="direct_sponsor")&&!draft.media_url?.trim())return toast.error("Media URL or uploaded file is required");setSaving(true);const {data,error}=await (supabase as any).rpc("admin_upsert_circle_panda_media",{p_id:draft.id??null,p_media_type:draft.media_type,p_source:draft.source,p_provider_item_type:draft.provider_item_type,p_title:draft.title,p_artist:draft.artist??"",p_description:draft.description??"",p_external_id:draft.external_id??"",p_media_url:draft.media_url??"",p_thumbnail_url:draft.thumbnail_url??"",p_duration_seconds:Number(draft.duration_seconds??0),p_sort_order:Number(draft.sort_order??0),p_is_published:Boolean(draft.is_published),p_metadata:draft.metadata??{}});setSaving(false);if(error)return toast.error(error.message);toast.success("Media item saved");setItems(prev=>{const row=data as Item;return row.id?prev.some(x=>x.id===row.id)?prev.map(x=>x.id===row.id?row:x):[row,...prev]:prev});reset();};
  const remove=async(id:string)=>{if(!confirm("Delete this media item?"))return;const {error}=await (supabase as any).rpc("admin_delete_circle_panda_media",{p_id:id});if(error)return toast.error(error.message);setItems(v=>v.filter(x=>x.id!==id));toast.success("Media item deleted")};
  const fileUpload=async(file:File,kind:"media"|"thumbnail")=>{setUploading(true);try{const url=await uploadMedia(file,kind);set(kind==="media"?{media_url:url}:{thumbnail_url:url});toast.success("Upload complete")}catch(e:any){toast.error(e?.message??"Upload failed")}finally{setUploading(false)}};
  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div><h2 className="font-display text-lg font-black">Music · Audio · Video</h2><p className="mt-1 text-xs text-muted-foreground">Admin controls the catalog. Playback gives no XP, BC or VIP reward.</p></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="text-xs font-semibold">Media type<select value={draft.media_type} onChange={e=>{const mt=e.target.value as MediaType;set({media_type:mt,provider_item_type:TYPE_OPTIONS[mt][0]})}} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="music">Music</option><option value="audio">Audio</option><option value="video">Video</option></select></label>
      <label className="text-xs font-semibold">Source<select value={draft.source} onChange={e=>set({source:e.target.value as Source})} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm">{Object.entries(SOURCE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs font-semibold">Content type<select value={draft.provider_item_type} onChange={e=>set({provider_item_type:e.target.value})} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm">{options.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-xs font-semibold">Title<Input className="mt-1" value={draft.title??""} onChange={e=>set({title:e.target.value})} maxLength={160}/></label>
      <label className="text-xs font-semibold">Artist / creator<Input className="mt-1" value={draft.artist??""} onChange={e=>set({artist:e.target.value})}/></label>
      <label className="text-xs font-semibold">External ID / provider ID<Input className="mt-1" value={draft.external_id??""} onChange={e=>set({external_id:e.target.value})}/></label>
      <label className="text-xs font-semibold md:col-span-2">Media URL<Input className="mt-1" value={draft.media_url??""} onChange={e=>set({media_url:e.target.value})} placeholder="Provider/embed/audio/video URL"/></label>
      <label className="text-xs font-semibold">Thumbnail URL<Input className="mt-1" value={draft.thumbnail_url??""} onChange={e=>set({thumbnail_url:e.target.value})}/></label>
      <label className="text-xs font-semibold">Duration (seconds)<Input className="mt-1" type="number" min={0} value={draft.duration_seconds??0} onChange={e=>set({duration_seconds:Number(e.target.value)||0})}/></label>
      <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-xl border bg-secondary/20 px-3 py-3 text-xs font-semibold">Published <Switch checked={Boolean(draft.is_published)} onCheckedChange={v=>set({is_published:v})}/></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold">Order<Input type="number" value={draft.sort_order??0} onChange={e=>set({sort_order:Number(e.target.value)||0})}/></label><label className="text-xs font-semibold">Upload<div className="mt-1"><label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-background text-xs"><Upload className="size-4"/>{uploading?"Uploading…":"Choose media"}<input type="file" accept="audio/*,video/*,image/*" className="hidden" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void fileUpload(f,"media")}}/></label></div></label></div>
      </div>
    </div>
    <div className="mt-3 flex gap-2"><Button onClick={()=>void save()} disabled={saving||uploading}><Save className="mr-2 size-4"/>{saving?"Saving…":"Save media"}</Button><Button variant="outline" onClick={reset}>New item</Button></div>
    <div className="mt-5 space-y-2">{loading?<Loader2 className="mx-auto size-6 animate-spin"/>:items.map(item=><div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">{item.media_type}</span><span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold">{SOURCE_LABELS[item.source]}</span>{item.is_published?<span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold">Published</span>:<span className="rounded-full bg-secondary px-2 py-1 text-[10px]">Draft</span>}</div><p className="mt-1 truncate text-sm font-bold">{item.title}</p><p className="text-[11px] text-muted-foreground">{item.artist??"—"} · {item.provider_item_type}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>setDraft(item)}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>void remove(item.id)}><Trash2 className="size-4"/></Button></div></div>)}</div>
  </section>;
}
