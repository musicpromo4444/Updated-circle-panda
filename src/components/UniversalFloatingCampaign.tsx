import { useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Campaign = {
  id:string; name:string; sponsor_name:string|null; creative_type:"icon"|"image"|"gif"|"lottie"|"video";
  creative_url:string|null; fallback_icon:string; label:string; action_type:string;
  action_target:string|null; action_title:string|null; action_body:string|null;
};

function isExternal(value:string) { return /^https?:\/\//i.test(value); }

const LottieElement: any = "dotlottie-wc";

function Creative({campaign}:{campaign:Campaign}) {
  if (campaign.creative_type === "icon" || !campaign.creative_url) {
    return <span className="text-3xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{campaign.fallback_icon}</span>;
  }
  if (campaign.creative_type === "video") {
    return <video src={campaign.creative_url} autoPlay loop muted playsInline className="size-12 rounded-full object-cover" />;
  }
  if (campaign.creative_type === "lottie") {
    return <LottieElement src={campaign.creative_url} autoplay loop style={{width:"52px",height:"52px"}} />;
  }
  return <img src={campaign.creative_url} alt="" className="size-12 rounded-full object-cover" draggable={false} />;
}

export function UniversalFloatingCampaign({pageKey}:{pageKey:string}) {
  const [campaign,setCampaign]=useState<Campaign|null>(null);
  const [modalOpen,setModalOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    void (supabase as any).rpc("get_floating_campaign_runtime",{p_page_key:pageKey}).then(async({data,error}:any)=>{
      if(!active || error || !data) return;
      setCampaign(data as Campaign);
      await (supabase as any).rpc("record_floating_campaign_event",{p_campaign_id:data.id,p_event_type:"impression"});
    });
    if(typeof customElements !== "undefined" && !customElements.get("dotlottie-wc")) {
      const script=document.createElement("script");
      script.type="module";
      script.src="https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js";
      script.dataset.circlePandaLottie="true";
      document.head.appendChild(script);
    }
    return()=>{active=false;};
  },[pageKey]);

  if(!campaign) return null;

  const click=async()=>{
    await (supabase as any).rpc("record_floating_campaign_event",{p_campaign_id:campaign.id,p_event_type:"click"});
    const target=campaign.action_target||"";
    if(campaign.action_type==="sponsor_modal"){
      setModalOpen(true);
      return;
    }
    if(campaign.action_type==="internal_route" && target.startsWith("/")){
      window.location.assign(target);
      return;
    }
    if(isExternal(target)){
      window.open(target,"_blank","noopener,noreferrer");
      return;
    }
    if(campaign.action_type==="ad_placement" || campaign.action_type==="rewarded_ad" || campaign.action_type==="playable" || campaign.action_type==="offerwall"){
      window.dispatchEvent(new CustomEvent("circle-panda-ad-action",{detail:{type:campaign.action_type,target}}));
      toast.success("Sponsored experience opened");
      return;
    }
    toast.error("This sponsor action is not configured yet");
  };

  return <>
    <button type="button" onClick={()=>void click()} aria-label={campaign.label}
      className="fixed bottom-[5.5rem] left-3 z-50 flex flex-col items-center gap-0.5 select-none transition-transform hover:scale-105 active:scale-95">
      <span className="relative grid size-14 place-items-center overflow-hidden rounded-full border border-primary/50 bg-black/90 shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <span className="absolute inset-0 animate-pulse rounded-full bg-primary/15"/>
        <span className="relative"><Creative campaign={campaign}/></span>
      </span>
      <span className="max-w-24 truncate rounded-full bg-black/85 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-lg">
        {campaign.label}
      </span>
    </button>

    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogTitle className="flex items-center gap-2 font-display font-black"><Sparkles className="size-5 text-primary"/>{campaign.action_title || campaign.sponsor_name || "Sponsored"}</DialogTitle>
        <DialogDescription>{campaign.action_body || "Sponsored experience"}</DialogDescription>
        <div className="overflow-hidden rounded-2xl border bg-black/20 p-3">
          <div className="grid min-h-36 place-items-center"><Creative campaign={campaign}/></div>
        </div>
        {campaign.action_target && isExternal(campaign.action_target) ? <button type="button" onClick={()=>window.open(campaign.action_target as string,"_blank","noopener,noreferrer")} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Continue <ExternalLink className="size-4"/></button> : null}
      </DialogContent>
    </Dialog>
  </>;
}
