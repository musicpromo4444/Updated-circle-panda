import { useEffect, useMemo, useState } from "react";
import { Check, Layers3, MousePointerClick, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Page = { page_key:string; label:string; route_path:string; sort_order:number };
type CreativeType = "icon"|"image"|"gif"|"lottie"|"video";
type ActionType = "external_url"|"internal_route"|"sponsor_modal"|"ad_placement"|"rewarded_ad"|"playable"|"offerwall";
type Campaign = {
  id:string; name:string; sponsor_name:string|null; enabled:boolean; page_keys:string[];
  creative_type:CreativeType; creative_url:string|null; fallback_icon:string; label:string;
  action_type:ActionType; action_target:string|null; action_title:string|null; action_body:string|null;
  priority:number; max_impressions:number|null; max_clicks:number|null; max_unique_users:number|null;
  frequency_cap_seconds:number; starts_at:string|null; ends_at:string|null; targeting:Record<string,unknown>;
  impressions:number; clicks:number; unique_users:number;
};

const CREATIVE_TYPES: {value:CreativeType;label:string}[] = [
  {value:"icon",label:"Static icon / emoji"}, {value:"image",label:"Animated image / banner"},
  {value:"gif",label:"GIF animation"}, {value:"lottie",label:"Lottie / dotLottie animation"},
  {value:"video",label:"Looping video animation"},
];
const ACTION_TYPES: {value:ActionType;label:string;help:string}[] = [
  {value:"external_url",label:"Open external website",help:"Always opens in the user's browser."},
  {value:"internal_route",label:"Open Circle Panda page",help:"Navigates inside Circle Panda."},
  {value:"sponsor_modal",label:"Show sponsor banner / popup",help:"Opens the campaign creative and sponsor message inside Circle Panda."},
  {value:"ad_placement",label:"Open another ad placement",help:"Pass the existing placement key as the target."},
  {value:"rewarded_ad",label:"Open rewarded experience",help:"Pass the rewarded placement/experience key as the target."},
  {value:"playable",label:"Open playable experience",help:"Pass the playable URL or experience target."},
  {value:"offerwall",label:"Open offerwall",help:"Pass the offerwall URL or experience target."},
];
const EMPTY = {
  name:"", sponsor_name:"", enabled:false, page_keys:[] as string[], creative_type:"lottie" as CreativeType, creative_url:"",
  fallback_icon:"🔥", label:"SPONSORED", action_type:"external_url" as ActionType, action_target:"", action_title:"", action_body:"",
  priority:100, max_impressions:null as number|null, max_clicks:null as number|null, max_unique_users:null as number|null,
  frequency_cap_seconds:0, starts_at:null as string|null, ends_at:null as string|null, targeting:{},
};
function toLocalInput(value:string|null) {
  if (!value) return "";
  const d = new Date(value), pad=(n:number)=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
}
function fromLocalInput(value:string|null) { return value ? new Date(value).toISOString() : null; }

export function UniversalFloatingIconManager() {
  const [pages,setPages]=useState<Page[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [draft,setDraft]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=async()=>{
    setLoading(true);
    const {data,error}=await (supabase as any).rpc("admin_get_floating_campaign_config");
    setLoading(false);
    if(error){toast.error(error.message);return;}
    setPages((data?.pages??[]) as Page[]);
    setCampaigns((data?.campaigns??[]) as Campaign[]);
  };
  useEffect(()=>{void load();},[]);
  const pageGroups=useMemo(()=>pages,[pages]);
  const setField=(key:string,value:any)=>setDraft((d:any)=>d?{...d,[key]:value}:d);
  const togglePage=(key:string)=>setDraft((d:any)=>d?{...d,page_keys:d.page_keys.includes(key)?d.page_keys.filter((x:string)=>x!==key):[...d.page_keys,key]}:d);

  const save=async()=>{
    if(!draft)return;
    if(!draft.name.trim()) return toast.error("Campaign name is required");
    if(!draft.page_keys.length) return toast.error("Choose at least one page");
    if(draft.action_type==="external_url" && !/^https?:\/\//i.test(draft.action_target.trim())) return toast.error("External action needs an http/https link");
    if(draft.creative_type!=="icon" && !/^https?:\/\//i.test(draft.creative_url.trim())) return toast.error("Animated/media creative needs an http/https URL");
    setSaving(true);
    const {data,error}=await (supabase as any).rpc("admin_upsert_floating_campaign",{
      p_id:draft.id??null,p_name:draft.name,p_sponsor_name:draft.sponsor_name,p_enabled:draft.enabled,p_page_keys:draft.page_keys,
      p_creative_type:draft.creative_type,p_creative_url:draft.creative_url,p_fallback_icon:draft.fallback_icon,p_label:draft.label,
      p_action_type:draft.action_type,p_action_target:draft.action_target,p_action_title:draft.action_title,p_action_body:draft.action_body,
      p_priority:Number(draft.priority)||100,p_max_impressions:draft.max_impressions===null||draft.max_impressions===""?null:Number(draft.max_impressions),
      p_max_clicks:draft.max_clicks===null||draft.max_clicks===""?null:Number(draft.max_clicks),
      p_max_unique_users:draft.max_unique_users===null||draft.max_unique_users===""?null:Number(draft.max_unique_users),
      p_frequency_cap_seconds:Number(draft.frequency_cap_seconds)||0,p_starts_at:fromLocalInput(draft.starts_at),p_ends_at:fromLocalInput(draft.ends_at),p_targeting:draft.targeting??{},
    });
    setSaving(false);
    if(error){toast.error(error.message);return;}
    setDraft(null); await load(); toast.success("Floating campaign saved");
  };
  const remove=async(id:string)=>{
    if(!confirm("Delete this floating campaign?"))return;
    const {error}=await (supabase as any).rpc("admin_delete_floating_campaign",{p_id:id});
    if(error){toast.error(error.message);return;}
    setCampaigns(prev=>prev.filter(x=>x.id!==id)); toast.success("Campaign deleted");
  };
  const edit=(c:Campaign)=>setDraft({...c,starts_at:toLocalInput(c.starts_at),ends_at:toLocalInput(c.ends_at)});
  const add=()=>setDraft({...EMPTY,page_keys:pages.length?[pages[0].page_key]:[]});

  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><Layers3 className="size-5 text-primary"/><h2 className="font-display text-lg font-black">Universal Floating Sponsor Icon</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">The lower-left floating slot can be placed on any selected pages. Each campaign controls its animation, action, audience limits and delivery.</p></div>
      <Button onClick={add}><Plus className="mr-2 size-4"/>New campaign</Button>
    </div>
    {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading floating campaigns…</div> :
      <div className="mt-4 space-y-3">{campaigns.map(c=><div key={c.id} className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{c.name}</p>{c.sponsor_name?<span className="text-[10px] text-muted-foreground">· {c.sponsor_name}</span>:null}
          <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold "+(c.enabled?"bg-emerald-500/10 text-emerald-500":"bg-secondary text-muted-foreground")}>{c.enabled?"LIVE":"OFF"}</span></div>
          <p className="mt-1 text-[11px] text-muted-foreground">{c.page_keys.length} page(s) · {c.creative_type} · {ACTION_TYPES.find(x=>x.value===c.action_type)?.label}</p></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>edit(c)}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>void remove(c.id)}><Trash2 className="size-4 text-destructive"/></Button></div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border p-2"><p className="text-[9px] uppercase text-muted-foreground">Impressions</p><p className="font-black">{c.impressions.toLocaleString()}{c.max_impressions?" / "+c.max_impressions.toLocaleString():""}</p></div>
          <div className="rounded-xl border p-2"><p className="text-[9px] uppercase text-muted-foreground">Clicks</p><p className="font-black">{c.clicks.toLocaleString()}{c.max_clicks?" / "+c.max_clicks.toLocaleString():""}</p></div>
          <div className="rounded-xl border p-2"><p className="text-[9px] uppercase text-muted-foreground">Unique users</p><p className="font-black">{c.unique_users.toLocaleString()}{c.max_unique_users?" / "+c.max_unique_users.toLocaleString():""}</p></div>
        </div>
      </div>)}
      {!campaigns.length?<div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No floating sponsor campaigns yet.</div>:null}</div>
    }
    {draft ? <div className="mt-5 rounded-3xl border border-primary/30 bg-secondary/20 p-4">
      <div className="flex items-center justify-between gap-2"><div><p className="font-display font-black">{draft.id?"Edit campaign":"Create floating campaign"}</p><p className="text-[11px] text-muted-foreground">Select exactly where this campaign appears.</p></div><Button variant="ghost" size="sm" onClick={()=>setDraft(null)}>Cancel</Button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Campaign name<Input value={draft.name} onChange={e=>setField("name",e.target.value)} className="mt-1"/></label>
        <label className="text-xs font-semibold">Sponsor name<Input value={draft.sponsor_name??""} onChange={e=>setField("sponsor_name",e.target.value)} className="mt-1" placeholder="MTN"/></label>
        <label className="text-xs font-semibold">Label below icon<Input value={draft.label} onChange={e=>setField("label",e.target.value)} maxLength={40} className="mt-1" placeholder="SPONSORED"/></label>
        <label className="text-xs font-semibold">Fallback icon<Input value={draft.fallback_icon} onChange={e=>setField("fallback_icon",e.target.value)} maxLength={8} className="mt-1" placeholder="🔥"/></label>
      </div>
      <div className="mt-4 rounded-2xl border p-3">
        <p className="text-xs font-bold">Pages where the icon appears</p><p className="mt-1 text-[11px] text-muted-foreground">Only checked pages show this campaign. Select three pages, one page, or all pages.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{pageGroups.map(p=><label key={p.page_key} className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs font-semibold"><input type="checkbox" checked={draft.page_keys.includes(p.page_key)} onChange={()=>togglePage(p.page_key)}/>{p.label}</label>)}</div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Animation / creative type<select value={draft.creative_type} onChange={e=>setField("creative_type",e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm">{CREATIVE_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        <label className="text-xs font-semibold">Creative URL {draft.creative_type!=="icon"?"(required)":""}<Input value={draft.creative_url??""} onChange={e=>setField("creative_url",e.target.value)} className="mt-1" placeholder="https://…"/></label>
        <div className="sm:col-span-2 rounded-xl border bg-background/50 p-3 text-[11px] text-muted-foreground"><Sparkles className="mr-1 inline size-3.5 text-primary"/>{draft.creative_type==="lottie"?"Lottie/dotLottie URLs are supported as looping animated icons. The app uses a fixed player, not arbitrary sponsor JavaScript.":"Animated GIFs, images and videos are rendered as media; campaigns cannot execute arbitrary JavaScript."}</div>
      </div>
      <div className="mt-4 rounded-2xl border p-3">
        <p className="text-xs font-bold">Click action</p><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">When clicked<select value={draft.action_type} onChange={e=>setField("action_type",e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm">{ACTION_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label className="text-xs font-semibold">Destination / target<Input value={draft.action_target??""} onChange={e=>setField("action_target",e.target.value)} className="mt-1" placeholder={draft.action_type==="internal_route"?"/dating":"https://sponsor.com"}/></label>
          <p className="sm:col-span-2 text-[11px] text-muted-foreground">{ACTION_TYPES.find(x=>x.value===draft.action_type)?.help}</p>
          {draft.action_type==="sponsor_modal"?<><label className="text-xs font-semibold">Popup title<Input value={draft.action_title??""} onChange={e=>setField("action_title",e.target.value)} className="mt-1"/></label><label className="text-xs font-semibold">Popup message<Textarea value={draft.action_body??""} onChange={e=>setField("action_body",e.target.value)} className="mt-1"/></label></>:null}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border p-3"><div className="flex items-center gap-2"><MousePointerClick className="size-4 text-primary"/><p className="text-xs font-bold">Campaign delivery limits</p></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold">Max impressions<input type="number" min={1} value={draft.max_impressions??""} onChange={e=>setField("max_impressions",e.target.value||null)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" placeholder="50,000"/></label>
          <label className="text-xs font-semibold">Max clicks<input type="number" min={1} value={draft.max_clicks??""} onChange={e=>setField("max_clicks",e.target.value||null)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label>
          <label className="text-xs font-semibold">Max unique users<input type="number" min={1} value={draft.max_unique_users??""} onChange={e=>setField("max_unique_users",e.target.value||null)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label>
          <label className="text-xs font-semibold">Frequency cap (seconds)<input type="number" min={0} value={draft.frequency_cap_seconds} onChange={e=>setField("frequency_cap_seconds",Math.max(0,Number(e.target.value)||0))} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label>
          <label className="text-xs font-semibold">Priority<input type="number" min={0} value={draft.priority} onChange={e=>setField("priority",Math.max(0,Number(e.target.value)||0))} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label>
          <label className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-xs font-semibold">Campaign enabled<Switch checked={draft.enabled} onCheckedChange={v=>setField("enabled",v)}/></label>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Starts at<input type="datetime-local" value={draft.starts_at??""} onChange={e=>setField("starts_at",e.target.value||null)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label>
        <label className="text-xs font-semibold">Ends at<input type="datetime-local" value={draft.ends_at??""} onChange={e=>setField("ends_at",e.target.value||null)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-background p-3 text-[11px] text-muted-foreground"><span><Check className="mr-1 inline size-3.5 text-emerald-500"/>Server counts impressions/clicks and stops campaigns at their limits.</span><Button onClick={()=>void save()} disabled={saving}>{saving?<span>Saving…</span>:<><Save className="mr-2 size-4"/>Save campaign</>}</Button></div>
    </div>:null}
    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground"><strong className="text-foreground">Security:</strong> sponsor URLs are validated server-side, campaign events are recorded server-side, and Admin never gets a field for arbitrary JavaScript.</div>
  </section>;
}
