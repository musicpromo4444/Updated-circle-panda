import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type Integration={key:string;label:string;enabled:boolean;public_config:Record<string,string>;secret_configured:Record<string,boolean>;updated_at:string};
const CATALOG=[
 {key:"youtube",label:"YouTube",publicFields:[["client_id","Client ID"],["channel_id","Channel ID"]],secrets:[["client_secret","Client Secret"]]},
 {key:"spotify",label:"Spotify",publicFields:[["client_id","Client ID"],["redirect_uri","Redirect URI"]],secrets:[["client_secret","Client Secret"]]},
 {key:"zego",label:"ZEGOCLOUD",publicFields:[["app_id","App ID"]],secrets:[["server_secret","Server Secret"]]},
 {key:"aws_live",label:"AWS Live Streaming",publicFields:[["region","AWS Region"],["distribution_id","Distribution ID"]],secrets:[["access_key_id","Access Key ID"],["secret_access_key","Secret Access Key"]]},
 {key:"resend",label:"Resend Email",publicFields:[["from_email","From Email"]],secrets:[["api_key","API Key"]]},
 {key:"analytics",label:"Analytics",publicFields:[["measurement_id","Measurement ID"],["site_id","Site ID"]],secrets:[]},
] as const;

export function AdminIntegrationCenter(){
 const [items,setItems]=useState<Integration[]>([]); const [draft,setDraft]=useState<Record<string,Integration>>({}); const [secrets,setSecrets]=useState<Record<string,Record<string,string>>>({}); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState<string|null>(null);
 const load=async()=>{setLoading(true);const {data,error}=await (supabase as any).rpc("admin_get_integrations");setLoading(false);if(error)return toast.error(error.message);const rows=(data??[]) as Integration[];setItems(rows);setDraft(Object.fromEntries(rows.map(x=>[x.key,structuredClone(x)])));};
 useEffect(()=>{void load()},[]);
 const updatePublic=(key:string,name:string,value:string)=>setDraft(d=>({...d,[key]:{...d[key],public_config:{...d[key].public_config,[name]:value}}}));
 const save=async(key:string)=>{const x=draft[key];if(!x)return;setSaving(key);const {data,error}=await (supabase as any).rpc("admin_upsert_integration",{p_key:key,p_label:x.label,p_enabled:x.enabled,p_public_config:x.public_config,p_secrets:secrets[key]??{}});setSaving(null);if(error)return toast.error(error.message);setDraft(d=>({...d,[key]:data}));setItems(v=>v.map(i=>i.key===key?data:i));setSecrets(s=>({...s,[key]:{}}));toast.success(x.label+" integration saved");};
 if(loading)return <section className="panda-panel rounded-3xl p-5"><Loader2 className="mx-auto size-7 animate-spin text-primary"/></section>;
 return <section className="panda-panel rounded-3xl p-4 sm:p-5">
  <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-5"/></div><div><h2 className="font-display font-bold">API & Integration Center</h2><p className="mt-1 text-xs text-muted-foreground">All optional third-party connections have a place here. Public IDs stay in configuration; private keys are stored in Supabase Vault and are never displayed back.</p></div></div>
  <div className="mt-4 space-y-3">{CATALOG.map(c=>{const x=draft[c.key]??items.find(i=>i.key===c.key);if(!x)return null;return <div key={c.key} className="rounded-2xl border border-border/70 bg-card p-4">
   <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{c.label}</p><p className="text-[10px] text-muted-foreground">{x.updated_at?"Configured record":"Not configured yet"}</p></div><Switch checked={x.enabled} onCheckedChange={v=>setDraft(d=>({...d,[c.key]:{...d[c.key],enabled:v}}))}/></div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">{c.publicFields.map(([name,label])=><label key={name} className="text-xs font-semibold">{label}<Input className="mt-1" value={x.public_config?.[name]??""} onChange={e=>updatePublic(c.key,name,e.target.value)} placeholder="Enter when ready"/></label>)}{c.secrets.map(([name,label])=><label key={name} className="text-xs font-semibold">{label}<Input className="mt-1" type="password" value={secrets[c.key]?.[name]??""} onChange={e=>setSecrets(s=>({...s,[c.key]:{...(s[c.key]??{}),[name]:e.target.value}}))} placeholder={x.secret_configured?.[name]?"Saved — paste only to replace":"Enter when ready"}/></label>)}</div>
   <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">{Object.entries(x.secret_configured??{}).filter(([,v])=>v).map(([k])=><span key={k} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary"><CheckCircle2 className="size-3"/>{k} saved</span>)}<span className="ml-auto inline-flex items-center gap-1 text-muted-foreground"><ShieldCheck className="size-3"/>Private values protected</span></div>
   <Button className="mt-3 w-full sm:w-auto" onClick={()=>void save(c.key)} disabled={saving===c.key}><Save className="mr-2 size-3.5"/>{saving===c.key?"Saving…":"Save integration"}</Button>
  </div>})}</div>
 </section>;
}
