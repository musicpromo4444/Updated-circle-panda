import { useEffect, useState } from "react";
import { Activity, Coins, Database, Flag, Loader2, Save, ShieldCheck, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type Product={id:string;name:string;price_usd:number;price_ngn:number;coins:number;vip_days:number;enabled:boolean;is_popular:boolean;is_best_value:boolean;is_highlighted:boolean};
type Sweep={id:string;draw:string;ticket_price_bc:number;prize_name:string;prize_description:string|null;closes_at:string|null;is_active:boolean;winner_mode:string;qualification_enabled:boolean;qualification_config:Record<string,unknown>};
type Ops={store:Product[];sweepstakes:Sweep[];finance:Record<string,number>;content:Record<string,number>;hotseat:Record<string,number>;hotseat_presence?:{enabled:boolean;title:string;message:string}};

export function AdminOperationsCenter(){
 const [data,setData]=useState<Ops|null>(null);
 const [presence,setPresence]=useState({enabled:false,title:"Hot Seat",message:"Hot Seat is live."});
 const [loading,setLoading]=useState(true); const [saving,setSaving]=useState<string|null>(null);
 const load=async()=>{
  setLoading(true);
  const {data:d,error}=await (supabase as any).rpc("admin_get_operations_dashboard");
  setLoading(false); if(error){toast.error(error.message);return;} setData(d as Ops); if(d?.hotseat_presence) setPresence(d.hotseat_presence);
 };
 useEffect(()=>{void load()},[]);
 const saveProduct=async(p:Product)=>{
  setSaving("p:"+p.id); const {data:d,error}=await (supabase as any).rpc("admin_update_store_product",{p_id:p.id,p_price_usd:p.price_usd,p_price_ngn:p.price_ngn,p_coins:p.coins,p_vip_days:p.vip_days,p_enabled:p.enabled,p_is_popular:p.is_popular,p_is_best_value:p.is_best_value,p_is_highlighted:p.is_highlighted}); setSaving(null);
  if(error){toast.error(error.message);return;} setData(x=>x?{...x,store:x.store.map(v=>v.id===p.id?d:v)}:x); toast.success("Store product saved");
 };
 const saveSweep=async(s:Sweep)=>{
  setSaving("s:"+s.id); const {data:d,error}=await (supabase as any).rpc("admin_update_sweepstakes_config",{p_id:s.id,p_ticket_price_bc:s.ticket_price_bc,p_prize_name:s.prize_name,p_prize_description:s.prize_description,p_closes_at:s.closes_at,p_is_active:s.is_active,p_winner_mode:s.winner_mode,p_qualification_enabled:s.qualification_enabled,p_qualification_config:s.qualification_config??{}}); setSaving(null);
  if(error){toast.error(error.message);return;} setData(x=>x?{...x,sweepstakes:x.sweepstakes.map(v=>v.id===s.id?d:v)}:x); toast.success("Sweepstakes settings saved");
 };
 const savePresence=async()=>{
  setSaving("presence"); const {data:d,error}=await (supabase as any).rpc("admin_set_hotseat_presence",{p_enabled:presence.enabled,p_title:presence.title,p_message:presence.message}); setSaving(null);
  if(error){toast.error(error.message);return;} setPresence(d); toast.success("Hot Seat presence saved");
 };
 if(loading)return <section className="panda-panel rounded-3xl p-5"><div className="grid min-h-32 place-items-center"><Loader2 className="size-7 animate-spin text-primary"/></div></section>;
 return <section className="panda-panel rounded-3xl p-4 sm:p-5">
  <div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Database className="size-5"/></div><div><h2 className="font-display text-lg font-black">Operations & Money Center</h2><p className="mt-1 text-xs text-muted-foreground">Store, sweepstakes, Hot Seat operations, moderation and payment health. Every sensitive change is server-checked and audited.</p></div></div>
  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
   {[["Successful payments",data?.finance.successful,Coins],["Pending",data?.finance.pending,Activity],["Pending confessions",data?.content.confessions_pending,Flag],["Groups",data?.content.groups,Users]].map(([l,v,I])=><div key={String(l)} className="rounded-2xl border bg-card p-3"><I className="size-4 text-primary"/><p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="text-xl font-black">{Number(v??0).toLocaleString()}</p></div>)}
  </div>
  <div className="mt-4 rounded-2xl border p-4">
   <div className="flex items-center gap-2"><Coins className="size-4 text-primary"/><h3 className="font-bold">Store & BC products</h3></div>
   <div className="mt-3 space-y-3">{(data?.store??[]).map(p=><div key={p.id} className="rounded-2xl border bg-card p-3">
    <div className="flex items-center justify-between gap-2"><div><p className="font-semibold">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.id}</p></div><Switch checked={p.enabled} onCheckedChange={v=>setData(x=>x?{...x,store:x.store.map(a=>a.id===p.id?{...a,enabled:v}:a)}:x)}/></div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
     {[["USD","price_usd"],["NGN","price_ngn"],["BC","coins"],["VIP days","vip_days"]].map(([label,key])=><label key={key} className="text-[10px] font-semibold">{label}<input type="number" min={0} value={(p as any)[key]} onChange={e=>setData(x=>x?{...x,store:x.store.map(a=>a.id===p.id?{...a,[key]:Math.max(0,Number(e.target.value)||0)}:a)}:x)} className="mt-1 h-9 w-full rounded-xl border bg-background px-2 text-sm"/></label>)}
    </div>
    <div className="mt-2 flex flex-wrap gap-3 text-xs">{[["Popular","is_popular"],["Best value","is_best_value"],["Highlight","is_highlighted"]].map(([l,k])=><label key={k} className="flex items-center gap-2"><input type="checkbox" checked={(p as any)[k]} onChange={e=>setData(x=>x?{...x,store:x.store.map(a=>a.id===p.id?{...a,[k]:e.target.checked}:a)}:x)}/>{l}</label>)}</div>
    <Button className="mt-3" size="sm" disabled={saving==="p:"+p.id} onClick={()=>void saveProduct(p)}><Save className="mr-2 size-3.5"/>{saving==="p:"+p.id?"Saving…":"Save product"}</Button>
   </div>)}</div>
  </div>
  <div className="mt-4 rounded-2xl border p-4">
   <div className="flex items-center gap-2"><Trophy className="size-4 text-primary"/><h3 className="font-bold">Sweepstakes</h3></div>
   <div className="mt-3 space-y-3">{(data?.sweepstakes??[]).map(s=><div key={s.id} className="rounded-2xl border bg-card p-3">
    <div className="flex items-center justify-between"><div><p className="font-semibold">{s.draw}</p><p className="text-[10px] text-muted-foreground">{s.prize_name}</p></div><Switch checked={s.is_active} onCheckedChange={v=>setData(x=>x?{...x,sweepstakes:x.sweepstakes.map(a=>a.id===s.id?{...a,is_active:v}:a)}:x)}/></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3"><label className="text-[10px] font-semibold">Ticket BC<input type="number" min={0} value={s.ticket_price_bc} onChange={e=>setData(x=>x?{...x,sweepstakes:x.sweepstakes.map(a=>a.id===s.id?{...a,ticket_price_bc:Math.max(0,Number(e.target.value)||0)}:a)}:x)} className="mt-1 h-9 w-full rounded-xl border bg-background px-2 text-sm"/></label><label className="text-[10px] font-semibold">Winner mode<select value={s.winner_mode} onChange={e=>setData(x=>x?{...x,sweepstakes:x.sweepstakes.map(a=>a.id===s.id?{...a,winner_mode:e.target.value}:a)}:x)} className="mt-1 h-9 w-full rounded-xl border bg-background px-2 text-sm"><option value="random">Random</option><option value="weighted">Weighted</option><option value="manual">Manual</option></select></label><label className="text-[10px] font-semibold">Closes at<input type="datetime-local" value={s.closes_at?new Date(s.closes_at).toISOString().slice(0,16):""} onChange={e=>setData(x=>x?{...x,sweepstakes:x.sweepstakes.map(a=>a.id===s.id?{...a,closes_at:e.target.value?new Date(e.target.value).toISOString():null}:a)}:x)} className="mt-1 h-9 w-full rounded-xl border bg-background px-2 text-sm"/></label></div>
    <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={s.qualification_enabled} onChange={e=>setData(x=>x?{...x,sweepstakes:x.sweepstakes.map(a=>a.id===s.id?{...a,qualification_enabled:e.target.checked}:a)}:x)}/> Qualification required</label>
    <Button className="mt-3" size="sm" disabled={saving==="s:"+s.id} onClick={()=>void saveSweep(s)}><Save className="mr-2 size-3.5"/>{saving==="s:"+s.id?"Saving…":"Save sweepstake"}</Button>
   </div>)}</div>
  </div>
  <div className="mt-4 rounded-2xl border p-4">
   <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary"/><h3 className="font-bold">Hot Seat presence</h3></div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"><input type="checkbox" checked={presence.enabled} onChange={e=>setPresence(v=>({...v,enabled:e.target.checked}))}/> Show Hot Seat presence</label><input value={presence.title} onChange={e=>setPresence(v=>({...v,title:e.target.value}))} className="h-10 rounded-xl border bg-background px-3 text-sm" placeholder="Title"/><textarea value={presence.message} onChange={e=>setPresence(v=>({...v,message:e.target.value}))} className="h-20 rounded-xl border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Message"/></div>
   <Button className="mt-3" size="sm" disabled={saving==="presence"} onClick={()=>void savePresence()}><Save className="mr-2 size-3.5"/>Save Hot Seat</Button>
  </div>
  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground"><strong className="text-foreground">Security:</strong> this panel does not expose payment secrets or streaming credentials. Those remain in the dedicated secure provider/integration panels.</div>
 </section>;
}
