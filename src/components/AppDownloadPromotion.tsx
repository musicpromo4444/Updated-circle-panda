import { useEffect, useState } from "react";
import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Settings = {
  apk_url: string;
  show_download_button: boolean;
  download_popup_enabled: boolean;
  download_popup_title: string;
  download_popup_message: string;
  download_popup_reward: string;
  download_popup_cta: string;
  download_popup_cooldown_hours: number;
  download_popup_mobile_only: boolean;
  download_popup_version: string;
};

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function AppDownloadPromotion() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("apk_url,show_download_button,download_popup_enabled,download_popup_title,download_popup_message,download_popup_reward,download_popup_cta,download_popup_cooldown_hours,download_popup_mobile_only,download_popup_version")
        .eq("id", 1)
        .maybeSingle();
      if (!active || error || !data) return;
      const next = data as Settings;
      setSettings(next);
      if (!next.download_popup_enabled || !next.apk_url) return;
      if (next.download_popup_mobile_only && !isAndroid()) return;
      const key = "circle_panda_download_popup_seen_at";
      const seen = Number(localStorage.getItem(key) || 0);
      const cooldown = Math.max(1, Number(next.download_popup_cooldown_hours || 24)) * 60 * 60 * 1000;
      if (Date.now() - seen >= cooldown) {
        localStorage.setItem(key, String(Date.now()));
        window.setTimeout(() => active && setOpen(true), 1800);
      }
    })();
    return () => { active = false; };
  }, []);

  const startDownload = () => {
    if (!settings?.apk_url) return;
    const anchor = document.createElement("a");
    anchor.href = settings.apk_url;
    anchor.download = "";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setInstallHelp(true);
  };

  if (!open || !settings?.apk_url) return null;

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
      <div className="relative p-5">
        <button onClick={() => setOpen(false)} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground" aria-label="Close"><X className="size-4" /></button>
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-3xl">🐼</div>
        <h2 className="mt-4 pr-8 text-center font-display text-2xl font-black">{settings.download_popup_title}</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">{settings.download_popup_message}</p>
        {settings.download_popup_reward ? <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-center text-sm font-black text-primary">{settings.download_popup_reward}</div> : null}
        {!installHelp ? <Button onClick={startDownload} className="mt-5 h-12 w-full rounded-2xl font-bold"><Download className="mr-2 size-4" />{settings.download_popup_cta}</Button> : <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><div className="flex items-center gap-2 font-bold"><Smartphone className="size-4 text-primary" /> APK download started</div><p className="mt-1 text-xs text-muted-foreground">Android may open the installer automatically when the download finishes. If it doesn't, open your Downloads notification/folder and tap the Circle Panda APK to install it.</p></div>
          <a href={settings.apk_url} className="flex h-11 items-center justify-center rounded-2xl border border-border bg-background text-sm font-bold"><ExternalLink className="mr-2 size-4" />Open APK again</a>
          <Button onClick={() => setOpen(false)} variant="outline" className="h-11 w-full rounded-2xl">Continue on web</Button>
        </div>}
        {settings.download_popup_version ? <p className="mt-3 text-center text-[10px] text-muted-foreground">Version {settings.download_popup_version}</p> : null}
      </div>
    </div>
  </div>;
}
