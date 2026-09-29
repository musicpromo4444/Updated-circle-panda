import { useEffect, useMemo, useState } from "react";
import { Loader2, Shield, UserCog, UserMinus, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Catalog={permission_key:string;label:string;category:string;description:string;sensitive:boolean;sort_order:number};
type AdminUser={user_id:string;role_kind:"owner"|"delegated";active:boolean;created_at:string;display_name:string};
type AppUser={id:string;username:string;email:string|null};
const groups=["Security","System","Monetization","Finance","Users","Content","Activities","Live","Community","Analytics","Administration"];

export function AdminPermissionManager(){
 const [catalog,setCatalog]=useState<Catalog[]>([]),[admins,setAdmins]=useState<AdminUser[]>([]),[users,setUsers]=useState<AppUser[]>([]);
 const [selected,setSelected]=useState<AdminUser|null>(null),[permissions,setPermissions]=useState<string[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[search,setSearch]=useState(""),[userId,setUserId]=useState("");
 const load=async()=>{setLoading(true);const [c,a,u]=await Promise.all([(supabase as any).rpc("admin_get_permission_catalog"),(supabase as any).rpc("admin_get_admin_users"),(supabase as any).rpc("admin_list_users")]);setLoading(false);const err=c.error||a.error||u.error;if(err){toast.error(err.message);return;}setCatalog((c.data??[]).filter((x:any)=>!x.permission_key.startsWith("rpc.")));setAdmins(a.data??[]);setUsers((u.data??[]).map((x:any)=>({id:x.id,username:x.username,email:x.email})));};
 useEffect(()=>{void load()},[]);
 const open=async(a:AdminUser)=>{setSelected(a);const {data,error}=await(supabase as any).rpc("admin_get_admin_permissions",{p_user_id:a.user_id});if(error){toast.error(error.message);return;}setPermissions(data??[]);};
 const toggle=(key:string)=>setPermissions(p=>p.includes(key)?p.filter(x=>x!==key):[...p,key]);
 const create=async()=>{if(!userId)return;setSaving(true);const {error}=await(supabase as any).rpc("admin_create_admin",{p_user_id:userId,p_permissions:permissions});setSaving(false);if(error){toast.error(error.message);return;}toast.success("User is now an administrator");setUserId("");void load();};
 const save=async()=>{if(!selected)return;setSaving(true);const {data,error}=await(supabase as any).rpc("admin_set_admin_permissions",{p_user_id:selected.user_id,p_permissions:permissions});setSaving(false);if(error){toast.error(error.message);return;}setPermissions(data??permissions);toast.success("Admin permissions saved");void load();};
 const remove=async()=>{if(!selected||!confirm("Remove this administrator?"))return;setSaving(true);const {error}=await(supabase as any).rpc("admin_remove_admin",{p_user_id:selected.user_id});setSaving(false);if(error){toast.error(error.message);return;}toast.success("Administrator removed");setSelected(null);void load();};
 const filtered=useMemo(()=>admins.filter(a=>a.display_name.toLowerCase().includes(search.toLowerCase())),[admins,search]);
 const grouped=useMemo(()=>groups.map(g=>[g,catalog.filter(x=>x.category===g)] as const).filter(([,items])=>items.length),[catalog]);
 if(loading)return <div className="grid min-h-32 place-items-center"><Loader2 className="size-6 animate-spin text-primary"/></div>;
 return <div className="space-y-4">
  <div className="rounded-3xl border border-border bg-card p-4">
   <div className="flex items-center gap-2"><Shield className="size-5 text-primary"/><h3 className="font-display text-lg font-black">Administrator Security</h3></div>
   <p className="mt-1 text-xs text-muted-foreground">Owner = full control. Delegated admins only receive the capabilities you tick. Sensitive controls are marked.</p>
   <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><select value={userId} onChange={e=>setUserId(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="">Select a user to make admin</option>{users.filter(u=>!admins.some(a=>a.user_id===u.id&&a.active)).map(u=><option key={u.id} value={u.id}>{u.username}{u.email?" — "+u.email:""}</option>)}</select><Button onClick={()=>void create()} disabled={saving||!userId}><UserCog className="mr-2 size-4"/>Make Admin</Button></div>
  </div>
  <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
   <div className="rounded-3xl border border-border bg-card p-3"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search administrators" className="mb-3 h-9 w-full rounded-xl border bg-background px-3 text-xs"/><div className="space-y-1">{filtered.map(a=><button key={a.user_id} onClick={()=>void open(a)} className={"w-full rounded-xl px-3 py-2 text-left text-sm "+(selected?.user_id===a.user_id?"bg-primary/10 text-primary":"hover:bg-secondary/50")}><span className="font-semibold">{a.display_name}</span><span className="ml-2 text-[10px] text-muted-foreground">{a.role_kind}</span></button>)}{!filtered.length&&<p className="p-3 text-xs text-muted-foreground">No delegated administrators yet.</p>}</div></div>
   <div className="rounded-3xl border border-border bg-card p-4">{selected?<><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-display font-bold">{selected.display_name}</h4><p className="text-xs text-muted-foreground">{selected.role_kind==="owner"?"Owner — permissions cannot be restricted.":"Delegated administrator — permissions are enforced server-side."}</p></div>{selected.role_kind!=="owner"&&<div className="flex gap-2"><Button variant="outline" onClick={()=>void remove()} disabled={saving}><UserMinus className="mr-2 size-4"/>Remove</Button><Button onClick={()=>void save()} disabled={saving}><Save className="mr-2 size-4"/>Save</Button></div>}</div>{selected.role_kind==="owner"?<div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><Lock className="mb-2 size-4 text-primary"/>Owner has unrestricted Circle Panda administration.</div>:<div className="mt-5 space-y-5">{grouped.map(([group,items])=><div key={group}><h5 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{group}</h5><div className="grid gap-2 sm:grid-cols-2">{items.map(item=><label key={item.permission_key} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background p-3"><span><span className="block text-sm font-semibold">{item.label}{item.sensitive&&<span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] text-destructive">SENSITIVE</span>}</span><span className="mt-1 block text-[10px] text-muted-foreground">{item.description}</span></span><Switch checked={permissions.includes(item.permission_key)} onCheckedChange={()=>toggle(item.permission_key)}/></label>)}</div></div>)}</div>}</>:<div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground"><div><Shield className="mx-auto mb-2 size-8 opacity-50"/><p>Select an administrator to manage permissions.</p></div></div>}</div>
  </div>
 </div>;
}