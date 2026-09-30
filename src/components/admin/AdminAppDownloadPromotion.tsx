import { useEffect, useState } from "react";
import { Download, Loader2, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type AppSettings = {
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

const defaults: AppSettings = {
  apk_url: "",
  show_download_button: false,
  download_popup_enabled: true,
  download_popup_title: "Download Circle Panda",
  download_popup_message: "Get the full Circle Panda Android experience. Download the app and install it on your phone.",
  download_popup_reward: "Get 500 BC",
  download_popup_cta: "Download & Install",
  download_popup_cooldown_hours: 24,
  download_popup_mobile_only: true,
  download_popup_version: "",
};

export function AdminAppDownloadPromotion() {
  const [value, setValue] = useState<AppSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error } = await (supabase as any).rpc("admin_get_app_control_center");
      setLoading(false);
      if (error) return toast.error(error.message);
      setValue(v => ({ ...v, ...(data?.app ?? {}) }));
    })();
  }, []);

  const set = <K extends keyof AppSettings>(key: K, next: AppSettings[K]) =>
    setValue(v => ({ ...v, [key]: next }));

  const save = async () => {
    setSaving(true);
    const { data: current, error: loadError } = await (supabase as any).rpc("admin_get_app_control_center");
    if (loadError) { setSaving(false); return toast.error(loadError.message); }
    const app = { ...(current?.app ?? {}), ...value };
    const { data, error } = await (supabase as any).rpc("admin_save_app_control_center", {
      p_app: app,
      p_ads: current?.ads ?? {},
      p_crush: current?.crush ?? {},
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setValue(v => ({ ...v, ...(data?.app ?? {}) }));
    toast.success("App download promotion saved");
  };

  if (loading) return <section className="panda-panel rounded-3xl p-5"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></section>;

  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Smartphone className="size-5 text-primary" /><h2 className="font-display text-xl font-black">Android App Download Promotion</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Control the web popup that sends users to the Circle Panda APK and guides them through Android installation.</p>
      </div>
      <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Save</Button>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold sm:col-span-2">APK download URL
        <input value={value.apk_url} onChange={e => set("apk_url", e.target.value)} placeholder="https://your-host.com/CirclePanda.apk" className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" />
      </label>
      <label className="flex items-center justify-between rounded-xl border bg-background px-3 py-3 text-sm font-semibold"><span>Show download button</span><Switch checked={value.show_download_button} onCheckedChange={v => set("show_download_button", v)} /></label>
      <label className="flex items-center justify-between rounded-xl border bg-background px-3 py-3 text-sm font-semibold"><span>Show promotional popup</span><Switch checked={value.download_popup_enabled} onCheckedChange={v => set("download_popup_enabled", v)} /></label>
      <label className="text-xs font-semibold">Popup title<input value={value.download_popup_title} onChange={e => set("download_popup_title", e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Reward / benefit<input value={value.download_popup_reward} onChange={e => set("download_popup_reward", e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" placeholder="Get 500 BC" /></label>
      <label className="text-xs font-semibold sm:col-span-2">Popup message<textarea value={value.download_popup_message} onChange={e => set("download_popup_message", e.target.value)} rows={3} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold">Button text<input value={value.download_popup_cta} onChange={e => set("download_popup_cta", e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">APK version<input value={value.download_popup_version} onChange={e => set("download_popup_version", e.target.value)} placeholder="1.0.0" className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Show again after (hours)<input type="number" min={1} value={value.download_popup_cooldown_hours} onChange={e => set("download_popup_cooldown_hours", Math.max(1, Number(e.target.value) || 1))} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
      <label className="flex items-center justify-between rounded-xl border bg-background px-3 py-3 text-sm font-semibold"><span>Mobile users only</span><Switch checked={value.download_popup_mobile_only} onCheckedChange={v => set("download_popup_mobile_only", v)} /></label>
    </div>

    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-bold"><Download className="size-4 text-primary" /> User flow</div>
      <p className="mt-1 text-xs text-muted-foreground">Download → Android/browser handles the APK → user approves installation. If automatic installer handoff is blocked, the popup tells the user to open Downloads and install the APK.</p>
    </div>
  </section>;
}
