import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { NewMemberOnboarding } from "@/components/NewMemberOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Campaign = {
  id:string; slug:string; title:string; description:string; creative_url:string|null; creative_type:string;
  fallback_icon:string; target_route:string; target_param:string|null; target_label:string; reward_text:string; requires_auth:boolean;
};

function PlayPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [campaign,setCampaign]=useState<Campaign|null>(null);
  const [loading,setLoading]=useState(true);
  const [authOpen,setAuthOpen]=useState(false);
  const [loggedIn,setLoggedIn]=useState(false);

  useEffect(()=>{ void (async()=>{
    const [{data:userData},{data,error}]=await Promise.all([
      supabase.auth.getUser(),
      (supabase as any).rpc("get_play_campaign",{p_slug:slug})
    ]);
    if(error || !data){ setCampaign(null); setLoading(false); return; }
    setCampaign(data as Campaign); setLoggedIn(Boolean(userData.user && !userData.user.is_anonymous)); setLoading(false);
    await (supabase as any).rpc("record_play_campaign_event",{p_campaign_id:data.id,p_event_type:"view"});
  })(); },[slug]);

  const target = () => {
    if(!campaign) return;
    const route=campaign.target_route || "/activities";
    if (route === "/activities") sessionStorage.setItem("circle-panda-play-campaign", campaign.id);
    const url=new URL(route,window.location.origin);
    if(campaign.target_param) url.searchParams.set("play",campaign.target_param);
    window.location.assign(url.pathname+url.search);
  };

  const enter = async () => {
    if(!campaign) return;
    if(!loggedIn && campaign.requires_auth){ setAuthOpen(true); return; }
    await (supabase as any).rpc("record_play_campaign_event",{p_campaign_id:campaign.id,p_event_type:"start"});
    target();
  };

  const share = async () => {
    const url=window.location.href;
    try { if(navigator.share) await navigator.share({title:campaign?.title,text:campaign?.description,url}); else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); } }
    catch {}
    if(campaign) await (supabase as any).rpc("record_play_campaign_event",{p_campaign_id:campaign.id,p_event_type:"share"});
  };

  if(loading) return <main className="min-h-screen bg-[#071412] grid place-items-center text-white">Loading…</main>;
  if(!campaign) return <main className="min-h-screen bg-[#071412] grid place-items-center px-6 text-white"><div className="text-center"><div className="text-6xl">🐼</div><h1 className="mt-3 text-2xl font-black">Challenge unavailable</h1><p className="mt-2 text-sm text-white/60">This campaign is not active right now.</p></div></main>;

  return <main className="min-h-screen bg-[#071412] px-4 py-8 text-white">
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between"><div className="text-sm font-black tracking-[.2em] text-emerald-300">CIRCLE PANDA</div><button onClick={()=>void share()} className="rounded-full border border-white/10 bg-white/5 p-2" aria-label="Share challenge"><Share2 className="size-4"/></button></div>
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.05] shadow-2xl">
        <div className="grid min-h-52 place-items-center bg-black/20 p-6">
          {campaign.creative_url ? <img src={campaign.creative_url} alt="" className="max-h-64 w-full rounded-2xl object-cover" /> : <span className="text-8xl">{campaign.fallback_icon}</span>}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase"><Trophy className="size-4"/>{campaign.target_label}</div>
          <h1 className="mt-2 font-display text-3xl font-black">{campaign.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">{campaign.description}</p>
          {campaign.reward_text ? <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-center text-lg font-black">{campaign.reward_text}</div> : null}
          <Button onClick={()=>void enter()} className="mt-5 w-full rounded-2xl py-6 text-base font-black">{loggedIn ? "Enter Challenge" : "Enter Challenge"}</Button>
          <p className="mt-3 text-center text-[11px] text-white/45">A Circle Panda account is required to compete or claim a challenge.</p>
        </div>
      </section>
      <NewMemberOnboarding challengeMode onFinished={(choice)=>{ if(choice==="explore") void navigate({to:"/home"}); else target(); }} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="signup" onAuthenticated={()=>{setLoggedIn(true);setAuthOpen(false);}} />
    </div>
  </main>;
}

export const Route = createFileRoute("/play/$slug")({ component: PlayPage });
