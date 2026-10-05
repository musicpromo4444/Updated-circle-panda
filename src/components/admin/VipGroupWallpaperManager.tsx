import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Shield, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_VIP_WALLPAPER } from "@/components/groups/vipWallpaper";
import { toast } from "sonner";

type OverrideRow={id:string;country:string|null;wallpaper_path:string;enabled:boolean;updated_at:string};

export function VipGroupWallpaperManager(){
 const [country,setCountry]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState(DEFAULT_VIP_WALLPAPER);
 const [rows,setRows]=useState<OverrideRow[]>([]);
 const [saving,setSaving]=useState(false);
 const inputRef=useRef<HTMLInputElement>(null);

 const load=async()=>{
   const {data,error}=await (supabase as any).from("cp_vip_group_wallpapers").select("id,country,wallpaper_path,enabled,updated_at").order("country",{ascending:true,nullsFirst:true});
   if(error){toast.error(error.message);return}
   setRows(data??[]);
 };
 useEffect(()=>{void load()},[]);

 const choose=(f:File|null)=>{
   if(!f)return;
   if(!f.type.startsWith("image/")){toast.error("Choose an image file.");return}
   if(f.size>8*1024*1024){toast.error("Wallpaper must be 8MB or smaller.");return}
   setFile(f);
   const url=URL.createObjectURL(f);
   setPreview(url);
 };

 const save=async()=>{
   if(!file){toast.error("Choose a wallpaper first.");return}
   setSaving(true);
   try{
     const uid=(await supabase.auth.getUser()).data.user?.id;
     if(!uid)throw new Error("Admin session required");
     const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
     const path="vip-wallpaper/"+(country.trim()?country.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-"):"all")+"-"+crypto.randomUUID()+"."+ext;
     const up=await supabase.storage.from("circle-panda-group-media").upload(path,file,{upsert:false,contentType:file.type||"image/jpeg",cacheControl:"3600"});
     if(up.error)throw up.error;
     const {error}=await (supabase as any).rpc("admin_set_vip_group_wallpaper",{p_country:country.trim()||null,p_wallpaper_path:path});
     if(error){await supabase.storage.from("circle-panda-group-media").remove([path]);throw error}
     toast.success(country.trim()?country.trim()+" VIP wallpaper updated":"VIP wallpaper updated for all countries");
     setFile(null);
     if(inputRef.current)inputRef.current.value="";
     await load();
   }catch(e:any){toast.error(e?.message??"Could not save VIP wallpaper")}
   finally{setSaving(false)}
 };

 return <section className="panda-panel rounded-3xl p-4 sm:p-5">
   <div className="flex items-center gap-2"><Shield className="size-4 text-amber-500"/><h2 className="font-display font-bold">VIP Group Wallpaper</h2><span className="ml-auto rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600">Admin controlled</span></div>
   <p className="mt-1 text-xs text-muted-foreground">Choose one wallpaper for every VIP group, or override it for one country. The uploaded PitchSide image is the current default.</p>
   <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
     <div className="overflow-hidden rounded-2xl border border-amber-400/40 bg-black"><img src={preview} alt="VIP wallpaper preview" className="h-40 w-full object-cover"/></div>
     <div className="space-y-3">
       <label className="text-xs font-semibold">Country override <span className="font-normal text-muted-foreground">(leave blank for all countries)</span>
         <input value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. Cameroon" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"/>
       </label>
       <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>choose(e.target.files?.[0]??null)}/>
       <div className="grid grid-cols-2 gap-2">
         <Button type="button" variant="outline" onClick={()=>inputRef.current?.click()} className="gap-2"><ImagePlus className="size-4"/>Choose image</Button>
         <Button type="button" disabled={!file||saving} onClick={()=>void save()} className="gap-2">{saving?<Loader2 className="size-4 animate-spin"/>:<Upload className="size-4"/>}{saving?"Saving…":"Save wallpaper"}</Button>
       </div>
       <p className="text-[10px] text-muted-foreground">Example: choose <strong>Cameroon</strong> to change only the Cameroon VIP group. Leave it blank to change the wallpaper used by all VIP groups.</p>
     </div>
   </div>
   {rows.length?<div className="mt-4 space-y-2">{rows.map(r=><div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/20 p-3"><div className="size-10 overflow-hidden rounded-lg bg-black"><img src={r.wallpaper_path==="__DEFAULT__"?DEFAULT_VIP_WALLPAPER:""} alt="" className="size-full object-cover" onError={e=>{if(r.wallpaper_path!=="__DEFAULT__")e.currentTarget.style.display="none"}}/></div><div className="min-w-0 flex-1"><p className="text-xs font-bold">{r.country||"All countries"}</p><p className="truncate text-[10px] text-muted-foreground">{r.wallpaper_path==="__DEFAULT__"?"Uploaded default wallpaper":"Custom VIP wallpaper"}</p></div></div>)}</div>:null}
 </section>;
}
