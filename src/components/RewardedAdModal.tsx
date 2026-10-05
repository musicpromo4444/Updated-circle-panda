import { useEffect, useState } from "react";
import { Clapperboard, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase = "loading" | "playing" | "done" | "failed";

export function RewardedAdModal({ open, groupId: _groupId, sessionId, onClose }: { open: boolean; groupId: string; sessionId: string | null; onClose: () => void }) {
  const [phase,setPhase]=useState<Phase>("loading");
  const [progress,setProgress]=useState(0);
  const [creative,setCreative]=useState<any>(null);
  const [claiming,setClaiming]=useState(false);

  useEffect(()=>{ if(!open)return; setPhase("loading"); setProgress(0); setCreative(null); void (async()=>{
    const {data,error}=await supabase.rpc("get_ad_runtime_config");
    if(error){toast.error("The reward ad could not be loaded.");setPhase("failed");return;}
    const selected=(Array.isArray((data as any)?.creatives)?(data as any).creatives:[]).find((x:any)=>x.placement==="group_message_rewarded"&&x.status==="active");
    if(!selected){setPhase("failed");return;} setCreative(selected); setPhase("playing");
  })(); },[open]);

  useEffect(()=>{ if(phase!=="playing"||!creative)return; const started=Date.now(); const duration=Math.max(1000,Number(creative.duration_seconds??5)*1000);
    const timer=window.setInterval(()=>{const pct=Math.min(100,((Date.now()-started)/duration)*100);setProgress(pct);if(pct>=100){window.clearInterval(timer);setPhase("done");}},100);
    return()=>window.clearInterval(timer);
  },[phase,creative]);

  useEffect(()=>{if(phase!=="failed")return;const timer=window.setTimeout(onClose,900);return()=>window.clearTimeout(timer);},[phase,onClose]);

  const claim=async()=>{if(!sessionId||claiming)return;setClaiming(true);const {data,error}=await supabase.rpc("complete_group_reward_ad_secure",{p_session_id:sessionId});setClaiming(false);
    if(error){toast.error(error.message??"Reward could not be claimed");return;}
    toast.success(`+${Number((data as any)?.reward_bc??3)} BC earned`);onClose();
  };

  return <Dialog open={open} onOpenChange={()=>undefined}>
    <DialogContent className="max-w-sm" onPointerDownOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>e.preventDefault()}>
      <DialogHeader><DialogTitle className="flex items-center gap-2 font-display"><Clapperboard className="size-4 text-primary"/>{phase==="done"?"Reward unlocked":"Sponsored message"}</DialogTitle></DialogHeader>
      {phase==="loading"?<p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/> Loading reward ad…</p>:null}
      {phase==="failed"?<div className="py-8 text-center"><X className="mx-auto mb-2 size-6 text-muted-foreground"/><p className="text-sm text-muted-foreground">Reward ad unavailable right now.</p></div>:null}
      {phase==="playing"?<div className="space-y-3 py-2">{creative?.video_url?<video className="h-40 w-full rounded-xl bg-black object-cover" src={creative.video_url} poster={creative.poster_url??creative.image_url??undefined} autoPlay muted playsInline/>:creative?.image_url?<img className="h-40 w-full rounded-xl object-cover" src={creative.image_url} alt={creative.headline??creative.sponsor??"Sponsored ad"}/>:<div className="grid h-40 place-items-center rounded-xl bg-secondary/40 text-4xl">🎬</div>}<div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{width:`${progress}%`}}/></div><p className="text-center text-xs text-muted-foreground">Watch to completion to receive the reward.</p></div>:null}
      {phase==="done"?<div className="space-y-3 py-2 text-center"><div className="grid h-24 place-items-center rounded-xl bg-primary/15 text-4xl">🎁</div><Button className="w-full gap-2" onClick={()=>void claim()} disabled={!sessionId||claiming}>{claiming?<Loader2 className="size-4 animate-spin"/>:<Gift className="size-4"/>}{claiming?"Claiming…":"Claim reward"}</Button></div>:null}
    </DialogContent>
  </Dialog>;
}
