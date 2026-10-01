import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Headphones, Music2, Play, Square, Video, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveAdCreative } from "@/components/ads/adInventoryStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/music-time")({ component: MusicTimePage });

type MediaType = "music" | "audio" | "video";
type Source = "spotify" | "audiomack" | "circle_panda_upload" | "direct_sponsor";
type MediaItem = {
  id:string; media_type:MediaType; source:Source; provider_item_type:string; title:string; artist:string|null;
  description:string|null; external_id:string|null; media_url:string|null; thumbnail_url:string|null;
  duration_seconds:number; sort_order:number; is_published:boolean;
};

const SOURCE_LABELS:Record<Source,string>={spotify:"Spotify",audiomack:"Audiomack",circle_panda_upload:"Circle Panda",direct_sponsor:"Direct Sponsor"};
const TABS:{id:MediaType;label:string;icon:any}[]=[{id:"music",label:"Music",icon:Music2},{id:"audio",label:"Audio",icon:Headphones},{id:"video",label:"Video",icon:Video}];

function MediaAdGate({placement,onDone}:{placement:"video_preroll"|"video_postroll";onDone:()=>void}){
  const ad=useActiveAdCreative(placement); const [seconds,setSeconds]=useState(5); const [done,setDone]=useState(false);
  const finished=()=>{if(done)return;setDone(true);onDone()};
  useEffect(()=>{if(ad?.format==="playable"&&ad.videoUrl)return;const t=window.setInterval(()=>setSeconds(s=>{if(s<=1){window.clearInterval(t);return 0}return s-1}),1000);return()=>window.clearInterval(t)},[ad]);
  useEffect(()=>{if(ad && !(ad.format==="playable"&&ad.videoUrl) && seconds===0) finished()},[ad,seconds]);
  useEffect(()=>{if(ad?.format==="playable"&&ad.videoUrl){setSeconds(0)}},[ad]);
  if(!ad)return <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white"><div className="text-center"><p className="font-display text-xl font-bold">Preparing video…</p><p className="mt-2 text-sm text-white/70">The video will start automatically.</p></div></div>;
  const playable=ad.format==="playable"&&Boolean(ad.videoUrl);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/95 p-4 text-white">
    <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3 text-xs"><span className="rounded-full bg-white/10 px-2 py-1 font-bold uppercase">Advertisement</span><span>{placement==="video_preroll"?"Before video":"After video"}</span></div>
      {playable?<video autoPlay playsInline controls={false} className="max-h-[70vh] w-full bg-black object-contain" src={ad.videoUrl} poster={ad.posterUrl||ad.imageUrl} onEnded={finished}/>:<div className="p-5">
        {ad.imageUrl?<img src={ad.imageUrl} alt={ad.headline} className="mb-4 max-h-[45vh] w-full rounded-2xl object-cover"/>:null}
        <p className="text-lg font-bold">{ad.headline}</p><p className="mt-1 text-sm text-white/70">{ad.description}</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-center"><p className="text-xs text-white/60">Please wait</p><p className="mt-1 text-2xl font-black">{seconds>0?seconds:"Ready"}</p></div>
      </div>}
      {!playable&&seconds>0?<div className="px-4 pb-4 text-center text-xs text-white/60">This ad is required and will continue automatically.</div>:null}
    </div>
  </div>;
}

function MusicTimePage(){
  const [tab,setTab]=useState<MediaType>("music"); const [items,setItems]=useState<MediaItem[]>([]); const [selected,setSelected]=useState<MediaItem|null>(null);
  const [playing,setPlaying]=useState(false); const [sessionId,setSessionId]=useState<string|null>(null); const [remaining,setRemaining]=useState(1800);
  const [showAd,setShowAd]=useState<"video_preroll"|"video_postroll"|null>(null); const [pendingVideo,setPendingVideo]=useState<MediaItem|null>(null);
  const audioRef=useRef<HTMLAudioElement|null>(null); const videoRef=useRef<HTMLVideoElement|null>(null);
  const load=async(type:MediaType)=>{const {data,error}=await (supabase as any).rpc("get_circle_panda_media_catalog",{p_media_type:type});if(error){toast.error(error.message);return}setItems((data??[]) as MediaItem[]);setSelected(null);setPlaying(false);};
  useEffect(()=>{void load(tab)},[tab]);

  const goToCurrentHotSeat=async()=>{
    const {data}=await supabase.from("hot_seat_hosts").select("id").eq("is_active",true).order("started_at",{ascending:false}).limit(1).maybeSingle();
    if(data?.id){ window.location.assign("/hot-seat"); return true; }
    return false;
  };
  const startSession=async(item:MediaItem, timed=true)=>{
    const {data,error}=await (supabase as any).rpc("start_circle_panda_media_session",{p_media_type:tab,p_media_item_id:item.id});
    if(error){toast.error(error.message);return null} setSessionId(data as string);setRemaining(1800);setPlaying(timed);return data as string;
  };
  const stopSession=async(continueToHotSeat=false)=>{
    if(sessionId) await (supabase as any).rpc("stop_circle_panda_media_session",{p_session_id:sessionId});
    setSessionId(null);setPlaying(false);setRemaining(1800);
    if(continueToHotSeat) await goToCurrentHotSeat();
  };
  const playItem=async(item:MediaItem)=>{
    setSelected(item);
    if(tab==="video"){setPendingVideo(item);setShowAd("video_preroll");return}
    await startSession(item);
    window.setTimeout(()=>{if(tab==="audio"||tab==="music")void audioRef.current?.play().catch(()=>{})},50);
  };
  const beginVideo=async()=>{if(!pendingVideo)return;setShowAd(null);await startSession(pendingVideo,false);window.setTimeout(()=>{const v=videoRef.current;void v?.play().catch(()=>{});if(v?.requestFullscreen)void v.requestFullscreen().catch(()=>{})},50)};
  const onVideoEnded=async()=>{await stopSession();setShowAd("video_postroll")};
  useEffect(()=>{if(!playing)return;const t=window.setInterval(()=>setRemaining(s=>{if(s<=1){void stopSession(true);return 1800}return s-1}),1000);return()=>window.clearInterval(t)},[playing,sessionId]);
  const switchTab=async(next:MediaType)=>{if(sessionId) await stopSession();setShowAd(null);setPendingVideo(null);setSelected(null);setPlaying(false);setTab(next)};
  useEffect(()=>{ return ()=>{ if(sessionId) void (supabase as any).rpc("stop_circle_panda_media_session",{p_session_id:sessionId}); }; },[sessionId]);
  const sourceUrl=selected?.media_url??"";
  const external=selected?.source==="spotify"||selected?.source==="audiomack";
  const audioContent=selected&&external&&sourceUrl?<iframe title={selected.title} src={sourceUrl} className="h-72 w-full rounded-2xl border-0 bg-black"/>:selected?.media_url?<audio ref={audioRef} src={selected.media_url} controls className="w-full"/>:null;
  return <AppShell title="Music Time" subtitle="Music, audio and video — no viewing or listening rewards.">
    <main className="mx-auto max-w-5xl space-y-4 p-4 pb-24 sm:p-6">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2">{TABS.map(({id,label,icon:Icon})=><button key={id} onClick={()=>void switchTab(id)} className={`flex min-w-28 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${tab===id?"bg-primary text-primary-foreground":"text-muted-foreground"}`}><Icon className="size-4"/>{label}</button>)}</div>
      {tab!=="video"?<><StandardBannerAd variant="inline" placement={tab==="audio"?"audio_time_top":"music_time_top"}/><section className="panda-panel rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-primary">{tab==="audio"?"Audio Time":"Music Time"}</p><h2 className="font-display text-xl font-black">30-minute listening session</h2></div><span className="text-xs font-bold text-muted-foreground">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")}</span></div>
        <div className="mt-5 min-h-56 rounded-3xl border border-border/70 bg-secondary/20 p-5">{selected?<><div className="flex items-center gap-4">{selected.thumbnail_url?<img src={selected.thumbnail_url} alt="" className="size-20 rounded-2xl object-cover"/>:<div className="grid size-20 place-items-center rounded-2xl bg-primary/10"><Volume2 className="size-8 text-primary"/></div>}<div><p className="font-display text-lg font-black">{selected.title}</p><p className="text-sm text-muted-foreground">{selected.artist??SOURCE_LABELS[selected.source]}</p></div></div><div className="mt-6">{audioContent}</div></>:<div className="grid min-h-44 place-items-center text-center text-sm text-muted-foreground">Choose an item below. Music and audio play in the middle of the screen.</div>}</div>
        {playing?<Button variant="outline" className="mt-4 w-full gap-2" onClick={()=>{audioRef.current?.pause();void stopSession(true)}}><Square className="size-4"/>Stop session</Button>:null}
      </section><StandardBannerAd variant="inline" placement={tab==="audio"?"audio_time_bottom":"music_time_bottom"}/></>:<section className="relative min-h-[calc(100vh-190px)] overflow-hidden rounded-none bg-black sm:rounded-3xl">{selected?.media_url?<video ref={videoRef} src={selected.media_url} poster={selected.thumbnail_url??undefined} controls playsInline className="h-[calc(100vh-190px)] w-full bg-black object-contain" onEnded={onVideoEnded}/>:<div className="grid min-h-[calc(100vh-190px)] place-items-center p-6 text-center text-white/70">Choose a video below. Circle Panda videos play full-screen with no banner ads.</div>}</section>}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><button key={item.id} onClick={()=>void playItem(item)} className="overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition hover:border-primary/50">{item.thumbnail_url?<img src={item.thumbnail_url} alt="" className="aspect-video w-full object-cover"/>:<div className="grid aspect-video place-items-center bg-secondary"><Play className="size-8 text-primary"/></div>}<div className="p-3"><p className="truncate text-sm font-bold">{item.title}</p><p className="text-xs text-muted-foreground">{item.artist??SOURCE_LABELS[item.source]}</p></div></button>)}</section>
    </main>
    {showAd?<MediaAdGate placement={showAd} onDone={()=>{if(showAd==="video_preroll"){void beginVideo()}else{setShowAd(null);setSelected(null);setPendingVideo(null);setPlaying(false);void goToCurrentHotSeat()}}}/>:null}
  </AppShell>;
}
