import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Plus, RefreshCw, Shield, Users, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type Campaign = {
  id:string; campaign_code:string; campaign_name:string; advertiser_name:string; partner_id:string|null; partner_name:string|null;
  pricing_model:string; budget:number; currency:string; target_countries:string[]; start_at:string|null; end_at:string|null; status:string;
  creative_count:number; impressions:number; clicks:number; completions:number; skips:number; tracked_value:number; created_at:string;
};
type Partner = { id:string; partner_code:string; partner_name:string; contact_name:string|null; contact_email:string|null; status:string; campaign_count:number; impressions:number; clicks:number; completions:number; tracked_value:number; created_at:string };
type Country = { country_code:string; impressions:number; clicks:number; completions:number; skips:number; tracked_value:number };

const money=(v:number,c:string)=>new Intl.NumberFormat(undefined,{style:"currency",currency:c||"USD",maximumFractionDigits:2}).format(Number(v)||0);
const pct=(a:number,b:number)=>b?((a/b)*100).toFixed(1)+"%":"0%";

async function copyText(value:string,label:string){
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      toast.success(label+" copied");
      return;
    }
  } catch {}
  toast.error("Copy is not available on this device.");
}

function downloadCsv(name:string, rows:Record<string,unknown>[]){
  if(!rows.length){toast.error("There is no report data to export yet.");return;}
  const keys=Object.keys(rows[0]); const esc=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=[keys.map(esc).join(","),...rows.map(r=>keys.map(k=>esc(r[k])).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}

export function AdminCampaignReports(){
  const {isAdmin}=useStore();
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [partners,setPartners]=useState<Partner[]>([]);
  const [selected,setSelected]=useState<string>("");
  const [countries,setCountries]=useState<Country[]>([]);
  const [loading,setLoading]=useState(true);
  const [showCampaign,setShowCampaign]=useState(false);
  const [showPartner,setShowPartner]=useState(false);
  const [campaignDraft,setCampaignDraft]=useState({code:"",name:"",advertiser:"",pricing:"impressions",budget:"0",currency:"USD",countries:"",status:"draft"});
  const [partnerDraft,setPartnerDraft]=useState({code:"",name:"",contact:"",email:"",status:"active"});

  const load=async()=>{
    if(!isAdmin)return;
    setLoading(true);
    const {data,error}=await (supabase as any).rpc("admin_get_campaign_reporting");
    setLoading(false);
    if(error){toast.error(error.message);return;}
    const nextC=(data?.campaigns??[]) as Campaign[]; setCampaigns(nextC); setPartners((data?.partners??[]) as Partner[]);
    setSelected(prev=>prev&&nextC.some(c=>c.id===prev)?prev:nextC[0]?.id??"");
  };
  useEffect(()=>{void load();},[isAdmin]);

  useEffect(()=>{
    if(!selected){setCountries([]);return;}
    void (async()=>{const {data,error}=await (supabase as any).rpc("admin_get_campaign_country_report",{p_campaign_id:selected}); if(error){toast.error(error.message);return;} setCountries((data??[]) as Country[]);})();
  },[selected]);

  const active=campaigns.find(c=>c.id===selected)??null;
  const totals=useMemo(()=>campaigns.reduce((a,c)=>({impressions:a.impressions+Number(c.impressions||0),clicks:a.clicks+Number(c.clicks||0),completions:a.completions+Number(c.completions||0),value:a.value+Number(c.tracked_value||0)}),{impressions:0,clicks:0,completions:0,value:0}),[campaigns]);

  const saveCampaign=async()=>{
    if(!campaignDraft.code||!campaignDraft.name||!campaignDraft.advertiser){toast.error("Campaign code, name and advertiser are required.");return;}
    const {error}=await (supabase as any).rpc("admin_save_ad_campaign",{p_id:null,p_campaign_code:campaignDraft.code,p_campaign_name:campaignDraft.name,p_advertiser_name:campaignDraft.advertiser,p_partner_id:null,p_pricing_model:campaignDraft.pricing,p_budget:Number(campaignDraft.budget)||0,p_currency:campaignDraft.currency,p_target_countries:campaignDraft.countries.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean),p_start_at:null,p_end_at:null,p_status:campaignDraft.status});
    if(error){toast.error(error.message);return;} setShowCampaign(false); setCampaignDraft({code:"",name:"",advertiser:"",pricing:"impressions",budget:"0",currency:"USD",countries:"",status:"draft"}); toast.success("Campaign created"); void load();
  };
  const savePartner=async()=>{
    if(!partnerDraft.code||!partnerDraft.name){toast.error("Partner code and name are required.");return;}
    const {error}=await (supabase as any).rpc("admin_save_circle_partner",{p_id:null,p_partner_code:partnerDraft.code,p_partner_name:partnerDraft.name,p_contact_name:partnerDraft.contact,p_contact_email:partnerDraft.email,p_notes:null,p_status:partnerDraft.status});
    if(error){toast.error(error.message);return;} setShowPartner(false); setPartnerDraft({code:"",name:"",contact:"",email:"",status:"active"}); toast.success("Circle Partner saved"); void load();
  };

  if(!isAdmin)return <AppShell title="Campaign Reports" hidePageHeader><div className="p-6 text-center text-sm text-muted-foreground">Admin access required.</div></AppShell>;

  return <AppShell title="Campaign Reports" hidePageHeader>
    <main className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Business reporting</p><h1 className="font-display text-2xl font-black">Campaigns & Circle Partners</h1><p className="text-sm text-muted-foreground">Real delivery reporting for advertisers, sponsors and partners.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button><Button variant="outline" onClick={()=>downloadCsv("circle-panda-campaigns.csv",campaigns.map(c=>({code:c.campaign_code,campaign:c.campaign_name,advertiser:c.advertiser_name,partner:c.partner_name??"",status:c.status,impressions:c.impressions,clicks:c.clicks,completions:c.completions,tracked_value:c.tracked_value})))}><Download className="mr-2 size-4"/>CSV</Button></div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Campaigns",campaigns.length],["Impressions",totals.impressions],["Clicks",totals.clicks],["Tracked value",totals.value.toFixed(2)]].map(([l,v])=><div key={String(l)} className="panda-panel rounded-2xl p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-xl font-black">{v}</p></div>)}
      </div>

      <section className="panda-panel rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Megaphone className="size-5 text-primary"/><h2 className="font-display text-lg font-bold">Campaign delivery</h2></div><Button size="sm" onClick={()=>setShowCampaign(v=>!v)}><Plus className="mr-1 size-4"/>Campaign</Button></div>
        {showCampaign?<div className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 sm:grid-cols-2">
          <Input placeholder="Campaign code" value={campaignDraft.code} onChange={e=>setCampaignDraft(x=>({...x,code:e.target.value}))}/><Input placeholder="Campaign name" value={campaignDraft.name} onChange={e=>setCampaignDraft(x=>({...x,name:e.target.value}))}/>
          <Input placeholder="Advertiser / brand" value={campaignDraft.advertiser} onChange={e=>setCampaignDraft(x=>({...x,advertiser:e.target.value}))}/><Input placeholder="Budget" type="number" value={campaignDraft.budget} onChange={e=>setCampaignDraft(x=>({...x,budget:e.target.value}))}/>
          <Input placeholder="Currency (USD)" value={campaignDraft.currency} onChange={e=>setCampaignDraft(x=>({...x,currency:e.target.value.toUpperCase()}))}/><Input placeholder="Target countries: NG, GH, KE" value={campaignDraft.countries} onChange={e=>setCampaignDraft(x=>({...x,countries:e.target.value}))}/>
          <select value={campaignDraft.pricing} onChange={e=>setCampaignDraft(x=>({...x,pricing:e.target.value}))} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="impressions">Impressions</option><option value="clicks">Clicks</option><option value="completions">Completions</option><option value="fixed">Fixed</option><option value="mixed">Mixed</option></select>
          <select value={campaignDraft.status} onChange={e=>setCampaignDraft(x=>({...x,status:e.target.value}))} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></select>
          <Button onClick={()=>void saveCampaign()} className="sm:col-span-2">Create campaign</Button>
        </div>:null}
        {loading?<p className="py-8 text-center text-sm text-muted-foreground">Loading real campaign data…</p>:campaigns.length===0?<p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create the first campaign when an advertiser signs on.</p>:
        <div className="mt-4 space-y-2">{campaigns.map(c=><button key={c.id} onClick={()=>setSelected(c.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selected===c.id?"border-primary bg-primary/5":"border-border/70 bg-card"}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="font-bold">{c.campaign_name}</span><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{c.status}</span></div><p className="text-xs text-muted-foreground">{c.advertiser_name} · {c.campaign_code} · {c.partner_name??"Direct"}</p></div><div className="grid grid-cols-3 gap-4 text-right text-xs"><span><b className="block text-sm">{c.impressions}</b>impressions</span><span><b className="block text-sm">{c.clicks}</b>clicks</span><span><b className="block text-sm">{c.completions}</b>completed</span></div></div></button>)}</div>}
      </section>

      {active?<section className="panda-panel rounded-3xl p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] uppercase tracking-wider text-primary">Campaign report</p><h2 className="font-display text-xl font-black">{active.campaign_name}</h2><p className="text-xs text-muted-foreground">{active.advertiser_name} · {active.campaign_code}</p></div><Button variant="outline" size="sm" onClick={()=>copyText(JSON.stringify({campaign:active.campaign_code,advertiser:active.advertiser_name,partner:active.partner_name,pricing_model:active.pricing_model,budget:active.budget,currency:active.currency,target_countries:active.target_countries},null,2),"Campaign details")}><Copy className="mr-2 size-3.5"/>Copy details</Button></div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">{[["Impressions",active.impressions],["Clicks",active.clicks],["CTR",pct(active.clicks,active.impressions)],["Completions",active.completions],["Value",money(active.tracked_value,active.currency)]].map(([l,v])=><div key={String(l)} className="rounded-2xl border border-border/70 bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">{l}</p><p className="mt-1 text-lg font-black">{v}</p></div>)}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><div><div className="flex items-center justify-between"><h3 className="font-bold">Country delivery</h3><Button size="sm" variant="ghost" onClick={()=>downloadCsv(`${active.campaign_code}-countries.csv`,countries.map(x=>({...x})))}><Download className="mr-1 size-3.5"/>CSV</Button></div><div className="mt-2 space-y-2">{countries.length?countries.map(x=><div key={x.country_code} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2 text-xs"><span className="font-bold">{x.country_code}</span><span>{x.impressions} views · {x.clicks} clicks · {x.completions} completed</span></div>):<p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">Country delivery will appear as real ad events arrive.</p>}</div></div><div><h3 className="font-bold">Campaign details</h3><div className="mt-2 rounded-2xl border border-border/70 bg-card p-3 text-xs leading-6"><p><b>Pricing:</b> {active.pricing_model}</p><p><b>Budget:</b> {money(active.budget,active.currency)}</p><p><b>Countries:</b> {active.target_countries.length?active.target_countries.join(", "):"Worldwide"}</p><p><b>Creatives:</b> {active.creative_count}</p><p><b>Partner:</b> {active.partner_name??"Direct Circle Panda campaign"}</p><p><b>Tracked value:</b> {money(active.tracked_value,active.currency)}</p></div></div></div>
        </section>:null}

      <section className="panda-panel rounded-3xl p-4 sm:p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users className="size-5 text-primary"/><h2 className="font-display text-lg font-bold">Circle Partners</h2></div><Button size="sm" onClick={()=>setShowPartner(v=>!v)}><Plus className="mr-1 size-4"/>Partner</Button></div>
        {showPartner?<div className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 sm:grid-cols-2"><Input placeholder="Partner code" value={partnerDraft.code} onChange={e=>setPartnerDraft(x=>({...x,code:e.target.value}))}/><Input placeholder="Partner / agency name" value={partnerDraft.name} onChange={e=>setPartnerDraft(x=>({...x,name:e.target.value}))}/><Input placeholder="Contact name" value={partnerDraft.contact} onChange={e=>setPartnerDraft(x=>({...x,contact:e.target.value}))}/><Input placeholder="Contact email" value={partnerDraft.email} onChange={e=>setPartnerDraft(x=>({...x,email:e.target.value}))}/><Button onClick={()=>void savePartner()} className="sm:col-span-2">Save Circle Partner</Button></div>:null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">{partners.length?partners.map(p=><div key={p.id} className="rounded-2xl border border-border/70 bg-card p-4"><div className="flex items-start justify-between"><div><p className="font-bold">{p.partner_name}</p><p className="text-xs text-muted-foreground">{p.partner_code} · {p.status}</p></div><Button size="sm" variant="ghost" onClick={()=>copyText(JSON.stringify({partner_code:p.partner_code,partner_name:p.partner_name,campaigns:p.campaign_count,impressions:p.impressions,clicks:p.clicks,completions:p.completions,tracked_value:p.tracked_value},null,2),"Partner report")}>Copy</Button></div><div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><span><b className="block text-sm">{p.campaign_count}</b>campaigns</span><span><b className="block text-sm">{p.impressions}</b>views</span><span><b className="block text-sm">{p.clicks}</b>clicks</span><span><b className="block text-sm">{p.completions}</b>completed</span></div></div>):<p className="py-7 text-center text-sm text-muted-foreground">No Circle Partners yet.</p>}</div>
      </section>
      <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground"><Shield className="size-4 shrink-0 text-primary"/>This page is admin-only. Reports use server-side reporting functions and never expose the raw ad-event ledger to users.</div>
    </main>
  </AppShell>;
}
