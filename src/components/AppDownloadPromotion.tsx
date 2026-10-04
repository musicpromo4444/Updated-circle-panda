import { useEffect, useState } from "react";
import { Download, X, Sparkles, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Settings = {
  android_app_url: string;
  ios_app_url: string;
  download_popup_enabled: boolean;
  download_popup_title: string;
  download_popup_message: string;
  download_popup_cooldown_hours: number;
};

type RewardState = {
  eligible: boolean;
  claimed: boolean;
  next_download_prompt_at: string | null;
  download_prompt_last_at: string | null;
  download_dismissed: boolean;
  admin: boolean;
};

export function AppDownloadPromotion() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [reward, setReward] = useState<RewardState | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = async () => {
    const [{ data: app }, { data: state }] = await Promise.all([
      (supabase as any).from("app_settings").select("android_app_url,ios_app_url,download_popup_enabled,download_popup_title,download_popup_message,download_popup_cooldown_hours").eq("id",1).maybeSingle(),
      (supabase as any).rpc("get_onboarding_reward_state"),
    ]);
    if (app) setSettings(app as Settings);
    if (state) setReward(state as RewardState);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (!active) return;
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!reward || reward.admin || !settings?.download_popup_enabled) return;

    if (reward.eligible) {
      setWelcomeOpen(true);
      return;
    }

    const next = reward.next_download_prompt_at ? new Date(reward.next_download_prompt_at).getTime() : 0;
    if (next && Date.now() >= next && !reward.download_dismissed) {
      const timer = window.setTimeout(() => setDownloadOpen(true), 300);
      return () => window.clearTimeout(timer);
    }
  }, [reward, settings]);

  const claim = async () => {
    setClaiming(true);
    const { data, error } = await (supabase as any).rpc("claim_new_user_bc_reward");
    setClaiming(false);
    if (error) return;
    if (data?.claimed && Number(data.amount) > 0) {
      setWelcomeOpen(false);
      window.setTimeout(() => setDownloadOpen(true), 3000);
    } else {
      setWelcomeOpen(false);
    }
    await load();
  };

  const closeDownload = async () => {
    setDownloadOpen(false);
    await (supabase as any).rpc("dismiss_app_download_prompt");
    await load();
  };

  const download = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    void (supabase as any).rpc("mark_app_download_prompt_shown");
    setDownloadOpen(false);
  };

  if (!settings || reward?.admin || (!welcomeOpen && !downloadOpen)) return null;

  if (welcomeOpen) return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black/75 p-4 backdrop-blur-md">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({length:22},(_,i)=><Sparkles key={i} className="absolute size-4 animate-ping text-emerald-300" style={{left:`${(i*37)%100}%`,top:`${(i*53)%100}%`,animationDelay:`${(i%7)*120}ms`}} />)}
      </div>
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-emerald-300/30 bg-[#092019] p-6 text-white shadow-2xl">
        <div className="mx-auto flex size-28 animate-bounce items-center justify-center rounded-full bg-emerald-400/10 text-7xl shadow-[0_0_50px_rgba(52,211,153,.25)]">🐼</div>
        <div className="mt-3 text-center text-3xl animate-pulse">✨ 🎉 ✨</div>
        <h2 className="mt-2 text-center text-2xl font-black">Welcome to Circle Panda!</h2>
        <p className="mt-3 text-center text-sm leading-6 text-white/75">You have successfully created an account. Now you have <b className="text-emerald-300">200 free BC</b> to use for chatting and everything across the app.</p>
        <p className="mt-3 text-center text-sm font-bold text-emerald-200">Click the button below to claim your BC.</p>
        <Button onClick={() => void claim()} disabled={claiming} className="mt-5 h-12 w-full rounded-2xl bg-emerald-400 font-black text-[#06120f]">
          {claiming ? "Adding your BC…" : "Claim 200 BC"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[2rem] border border-emerald-300/20 bg-card p-6 shadow-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-3xl">🐼</div>
        <h2 className="mt-4 text-center text-xl font-black">{settings.download_popup_title || "Download the Circle Panda App"}</h2>
        <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">{settings.download_popup_message || "Please download the app to earn extra BC and gain access to VIP packages, free VIP packages."}</p>
        <div className="mt-5 grid gap-3">
          {settings.android_app_url ? <Button onClick={() => download(settings.android_app_url)} className="h-12 rounded-2xl font-black"><Smartphone className="mr-2 size-4" />Android App</Button> : null}
          {settings.ios_app_url ? <Button onClick={() => download(settings.ios_app_url)} variant="outline" className="h-12 rounded-2xl font-black"><Smartphone className="mr-2 size-4" />iOS App</Button> : null}
        </div>
        <Button onClick={() => void closeDownload()} variant="ghost" className="mt-2 h-11 w-full rounded-2xl"><X className="mr-2 size-4" />Cancel</Button>
      </div>
    </div>
  );
}
