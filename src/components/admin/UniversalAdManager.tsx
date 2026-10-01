import { useEffect, useMemo, useState } from "react";
import { Apple, Check, Globe, Layers3, Plus, Save, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Platform = "web" | "android" | "ios";
type Strategy = "single" | "mediation";
type Provider = "admob_mediation" | "admob" | "adsterra" | "direct_sponsor" | "custom_adapter";
type Format = "banner" | "native" | "interstitial" | "rewarded" | "playable" | "sponsor" | "offerwall" | "link";

type Placement = { id:string; placement_key:string; label:string; default_format:Format; enabled:boolean; frequency_cap_seconds:number; targeting:Record<string,unknown> };
type ProviderConfig = { id:string; placement_id:string; platform:Platform; strategy:Strategy; provider:Provider; format:Format; provider_label:string|null; ad_unit_id:string|null; app_id:string|null; placement_code:string|null; adapter_key:string|null; priority:number; enabled:boolean; targeting:Record<string,unknown>; schedule_start:string|null; schedule_end:string|null; frequency_cap_seconds:number };

const PROVIDERS: {value:Provider;label:string}[] = [
  {value:"admob_mediation",label:"AdMob Mediation"},
  {value:"admob",label:"Google AdMob"},
  {value:"adsterra",label:"Adsterra"},
  {value:"direct_sponsor",label:"Direct Sponsor"},
  {value:"custom_adapter",label:"Other / Custom Adapter"},
];
const FORMATS: Format[] = ["banner","native","interstitial","rewarded","playable","sponsor","offerwall","link"];

function PlatformIcon({platform}:{platform:Platform}) {
  if (platform === "web") return <Globe className="size-4"/>;
  if (platform === "android") return <Smartphone className="size-4"/>;
  return <Apple className="size-4"/>;
}

export function UniversalAdManager() {
  const [placements,setPlacements]=useState<Placement[]>([]);
  const [providers,setProviders]=useState<ProviderConfig[]>([]);
  const [selected,setSelected]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState<string|null>(null);

  const load=async()=>{
    setLoading(true);
    const {data,error}=await (supabase as any).rpc("get_universal_ad_runtime_config");
    setLoading(false);
    if(error){toast.error(error.message);return;}
    const ps=(data?.placements??[]) as Array<Placement & {providers?:ProviderConfig[]}>;
    setPlacements(ps);
    setProviders(ps.flatMap(p=>(p.providers??[]).map(c=>({...c,placement_id:p.id}))));
    setSelected(prev=>prev||ps[0]?.id||"");
  };
  useEffect(()=>{void load();},[]);

  const activePlacement=placements.find(p=>p.id===selected);
  const platformRows=useMemo(()=>({web:providers.filter(c=>c.placement_id===selected&&c.platform==="web"),android:providers.filter(c=>c.placement_id===selected&&c.platform==="android"),ios:providers.filter(c=>c.placement_id===selected&&c.platform==="ios")}),[providers,selected]);

  const saveProvider=async(c:Partial<ProviderConfig>&{placement_id:string;platform:Platform})=>{
    setSaving(c.id??c.platform);
    const {data,error}=await (supabase as any).rpc("admin_upsert_universal_ad_provider",{
      p_id:c.id??null,p_placement_id:c.placement_id,p_platform:c.platform,p_strategy:c.strategy??"single",
      p_provider:c.provider??"admob_mediation",p_format:c.format??activePlacement?.default_format??"banner",
      p_provider_label:c.provider_label??"",p_ad_unit_id:c.ad_unit_id??"",p_app_id:c.app_id??"",
      p_placement_code:c.placement_code??"",p_adapter_key:c.adapter_key??"",p_priority:Number(c.priority??100),
      p_enabled:c.enabled!==false,p_targeting:c.targeting??{},p_schedule_start:c.schedule_start??null,
      p_schedule_end:c.schedule_end??null,p_frequency_cap_seconds:Number(c.frequency_cap_seconds??0),
    });
    setSaving(null);
    if(error){toast.error(error.message);return;}
    setProviders(prev=>c.id?prev.map(x=>x.id===c.id?{...x,...data}:x):[...prev,{...data,placement_id:c.placement_id}]);
    toast.success("Ad provider configuration saved");
  };

  const addProvider=(platform:Platform)=>{
    if(!activePlacement)return;
    void saveProvider({placement_id:activePlacement.id,platform,strategy:"single",provider:"admob_mediation",format:activePlacement.default_format,provider_label:"AdMob Mediation",priority:100,enabled:true,targeting:{},frequency_cap_seconds:0});
  };

  const removeProvider=async(id:string)=>{
    const {error}=await (supabase as any).rpc("admin_delete_universal_ad_provider",{p_id:id});
    if(error){toast.error(error.message);return;}
    setProviders(prev=>prev.filter(x=>x.id!==id));toast.success("Provider removed");
  };

  const update=(id:string,patch:Partial<ProviderConfig>)=>setProviders(prev=>prev.map(x=>x.id===id?{...x,...patch}:x));

  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><Layers3 className="size-5 text-primary"/><h2 className="font-display text-lg font-black">Universal Ad System</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">One placement. Separate Web, Android and iOS configurations. Add multiple providers when using mediation.</p></div>
      <Button variant="outline" size="sm" onClick={()=>void load()}><Check className="mr-2 size-3.5"/>Refresh</Button>
    </div>

    {loading?<div className="py-10 text-center text-sm text-muted-foreground">Loading ad architecture…</div>:<div className="mt-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">{placements.map(p=><button key={p.id} onClick={()=>setSelected(p.id)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${selected===p.id?"border-primary bg-primary/10 text-primary":"border-border bg-card"}`}>{p.label}</button>)}</div>
      {activePlacement?<div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold">{activePlacement.label}</p><p className="text-[11px] text-muted-foreground">Placement key: {activePlacement.placement_key} · Default format: {activePlacement.default_format}{activePlacement.placement_key.startsWith("video_")?" · Required for Circle Panda video playback":""}</p></div>
          <Switch disabled={activePlacement.placement_key==="video_preroll"||activePlacement.placement_key==="video_postroll"} checked={activePlacement.enabled} onCheckedChange={async enabled=>{const {data,error}=await (supabase as any).rpc("admin_upsert_universal_ad_placement",{p_id:activePlacement.id,p_placement_key:activePlacement.placement_key,p_label:activePlacement.label,p_default_format:activePlacement.default_format,p_enabled:enabled,p_frequency_cap_seconds:activePlacement.frequency_cap_seconds,p_targeting:activePlacement.targeting});if(error){toast.error(error.message);return;}setPlacements(prev=>prev.map(x=>x.id===activePlacement.id?{...x,...data}:x));toast.success("Placement updated");}}/>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(["web","android","ios"] as Platform[]).map(platform=><div key={platform} className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-bold"><PlatformIcon platform={platform}/>{platform==="web"?"Web":platform==="android"?"Android":"Apple / iOS"}</div><Button size="sm" variant="outline" onClick={()=>addProvider(platform)}><Plus className="mr-1 size-3"/>Provider</Button></div>
            <div className="mt-3 space-y-3">
              {(platformRows[platform]??[]).map(c=><div key={c.id} className="rounded-xl border border-border/70 bg-background p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider configuration</span><button onClick={()=>void removeProvider(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove provider"><Trash2 className="size-3.5"/></button></div>
                <div className="mt-2 grid gap-2">
                  <select value={c.strategy} onChange={e=>update(c.id,{strategy:e.target.value as Strategy})} className="h-9 rounded-xl border bg-background px-2 text-xs"><option value="single">Single provider</option><option value="mediation">Mediation / multiple providers</option></select>
                  <select value={c.provider} onChange={e=>update(c.id,{provider:e.target.value as Provider})} className="h-9 rounded-xl border bg-background px-2 text-xs">{PROVIDERS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
                  <select value={c.format} onChange={e=>update(c.id,{format:e.target.value as Format})} className="h-9 rounded-xl border bg-background px-2 text-xs">{FORMATS.map(x=><option key={x} value={x}>{x}</option>)}</select>
                  <Input value={c.ad_unit_id??""} onChange={e=>update(c.id,{ad_unit_id:e.target.value})} placeholder="Ad unit ID / platform code"/>
                  <Input value={c.app_id??""} onChange={e=>update(c.id,{app_id:e.target.value})} placeholder="App ID (if provider requires it)"/>
                  <Input value={c.placement_code??""} onChange={e=>update(c.id,{placement_code:e.target.value})} placeholder="Placement / tag ID"/>
                  <Input value={c.adapter_key??""} onChange={e=>update(c.id,{adapter_key:e.target.value})} placeholder="Adapter key (mediation partner)"/>
                  <div className="grid grid-cols-2 gap-2"><Input type="number" min={0} value={c.priority} onChange={e=>update(c.id,{priority:Number(e.target.value)||0})} placeholder="Priority"/><Input type="number" min={0} value={c.frequency_cap_seconds} onChange={e=>update(c.id,{frequency_cap_seconds:Number(e.target.value)||0})} placeholder="Cap (seconds)"/></div>
                  <label className="flex items-center justify-between rounded-xl border bg-secondary/30 px-3 py-2 text-xs font-semibold">Enabled <Switch checked={c.enabled} onCheckedChange={enabled=>update(c.id,{enabled})}/></label>
                  <Button onClick={()=>void saveProvider(c)} disabled={saving===c.id} className="w-full"><Save className="mr-2 size-3.5"/>{saving===c.id?"Saving…":"Save provider"}</Button>
                </div>
              </div>)}
              {(platformRows[platform]??[]).length===0?<p className="py-5 text-center text-[11px] text-muted-foreground">No provider configured yet.</p>:null}
            </div>
          </div>)}
        </div>
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground">
          <strong className="text-foreground">Important:</strong> enter provider IDs/configuration here; do not paste arbitrary JavaScript into Admin. A provider adapter/SDK handles the actual rendering on each platform.
        </div>
      </div>:null}
    </div>}
  </section>;
}
