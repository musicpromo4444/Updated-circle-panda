import { useEffect, useState } from "react";
import { Loader2, Phone, Save, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type Config = {
  enabled: boolean;
  voice_enabled: boolean;
  video_enabled: boolean;
  popup_after_hours: number;
  repeat_every_hours: number;
};

export function VipGroupCallSettings() {
  const [config,setConfig]=useState<Config|null>(null);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{void (async()=>{
    const {data,error}=await (supabase as any).rpc("admin_get_vip_group_call_config");
    if(error){toast.error(error.message);return;}
    setConfig(data as Config);
  })()},[]);

  const save=async()=>{
    if(!config)return;
    setSaving(true);
    const {data,error}=await (supabase as any).rpc("admin_save_vip_group_call_config",{
      p_enabled:config.enabled,
      p_voice_enabled:config.voice_enabled,
      p_video_enabled:config.video_enabled,
      p_popup_after_hours:config.popup_after_hours,
      p_repeat_every_hours:config.repeat_every_hours,
    });
    setSaving(false);
    if(error){toast.error(error.message);return;}
    setConfig(data as Config);
    toast.success("VIP group call settings saved");
  };

  if(!config)return <section className="panda-panel rounded-3xl p-5"><Loader2 className="size-5 animate-spin"/></section>;

  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Phone className="size-5 text-primary"/><Video className="size-5 text-primary"/><h2 className="font-display text-lg font-black">VIP Group Calls</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Supabase-backed controls for the VIP group voice/video buttons. These controls do not affect normal groups.</p>
      </div>
      <Button onClick={()=>void save()} disabled={saving}>{saving?<Loader2 className="mr-2 size-4 animate-spin"/>:<Save className="mr-2 size-4"/>}Save</Button>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm font-semibold">Enable call window<Switch checked={config.enabled} onCheckedChange={v=>setConfig(c=>c?{...c,enabled:v}:c)}/></label>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm font-semibold"><span><Phone className="mr-2 inline size-4"/>Voice</span><Switch checked={config.voice_enabled} onCheckedChange={v=>setConfig(c=>c?{...c,voice_enabled:v}:c)}/></label>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm font-semibold"><span><Video className="mr-2 inline size-4"/>Video</span><Switch checked={config.video_enabled} onCheckedChange={v=>setConfig(c=>c?{...c,video_enabled:v}:c)}/></label>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold">Show after (hours)<input type="number" min={0} max={168} value={config.popup_after_hours} onChange={e=>setConfig(c=>c?{...c,popup_after_hours:Math.max(0,Math.min(168,Number(e.target.value)||0))}:c)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Repeat every (hours)<input type="number" min={1} max={168} value={config.repeat_every_hours} onChange={e=>setConfig(c=>c?{...c,repeat_every_hours:Math.max(1,Math.min(168,Number(e.target.value)||1))}:c)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
    </div>
    <p className="mt-3 text-[11px] text-muted-foreground">Recommended: Enable + Voice + Video, Show after 0 hours, Repeat every 24 hours. The VIP chat only displays the enabled call icons during the configured window.</p>
  </section>;
}
