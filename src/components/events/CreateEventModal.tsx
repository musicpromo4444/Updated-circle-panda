import { useEffect, useState } from "react";
import { CalendarPlus, ImagePlus, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type PandaEvent } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { requestLogin } from "@/components/auth/LoginRequiredDialog";
import { requireCompleteProfile } from "@/lib/profileGate";

const EVENT_TAGS=["Meetup","Nightlife","Gaming","Music & Vinyl","Study & Chill","Foodie","Arts","Sports","Business","Party","Other"];

export function CreateEventModal({open,onOpenChange,onCreated}:{open:boolean;onOpenChange:(open:boolean)=>void;onCreated?:(event:PandaEvent)=>void}) {
 const {createEvent}=useStore();
 const [title,setTitle]=useState(""); const [tag,setTag]=useState("Meetup"); const [date,setDate]=useState("");
 const [duration,setDuration]=useState(120); const [venue,setVenue]=useState(""); const [address,setAddress]=useState("");
 const [country,setCountry]=useState(""); const [state,setState]=useState(""); const [city,setCity]=useState(""); const [area,setArea]=useState("");
 const [price,setPrice]=useState<string>(""); const [currency,setCurrency]=useState("NGN"); const [blurb,setBlurb]=useState(""); const [details,setDetails]=useState("");
 const [imageUrl,setImageUrl]=useState(""); const [uploading,setUploading]=useState(false); const [publishing,setPublishing]=useState(false);
 const [reachScope,setReachScope]=useState<"worldwide"|"country"|"state"|"city"|"area">("worldwide");
 const [reachCountry,setReachCountry]=useState(""); const [reachState,setReachState]=useState(""); const [reachCity,setReachCity]=useState(""); const [reachArea,setReachArea]=useState("");

 useEffect(() => {
  if (!open) return;
  let active = true;
  void supabase.auth.getUser().then(async ({ data }) => {
   if (!active) return;
   if (!data.user || data.user.is_anonymous) {
    onOpenChange(false);
    requestLogin("create an event");
   }
  });
  return () => { active = false; };
 }, [open, onOpenChange]);

 const uploadImage=async(file:File)=>{ if(!file.type.startsWith("image/")) return toast.error("Choose an image file."); if(file.size>8*1024*1024) return toast.error("Image must be 8MB or smaller."); setUploading(true);
  try{const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new Error("Sign in first."); const path=`${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`; const {error}=await supabase.storage.from("event-media").upload(path,file,{upsert:false,contentType:file.type}); if(error) throw error; const {data}=supabase.storage.from("event-media").getPublicUrl(path); setImageUrl(data.publicUrl); toast.success("Event picture added.");}catch(e){toast.error(e instanceof Error?e.message:"Image upload failed.");}finally{setUploading(false);}
 };
 const submit=(e:React.FormEvent)=>{e.preventDefault(); if(publishing||uploading) return;
  void supabase.auth.getUser().then(async ({ data }) => {
   if(!data.user || data.user.is_anonymous){ onOpenChange(false); requestLogin("create an event"); return; }
   if(!(await requireCompleteProfile("create an event"))) return;
   setPublishing(true);
   if(!title.trim()||!date||!venue.trim()||!address.trim()||!country.trim()||!city.trim()||!blurb.trim()) return toast.error("Complete the title, date, venue, address, country, city and summary.");

  const gateFee = price.trim() === "" ? 0 : Number(price);
  if(!Number.isFinite(gateFee) || gateFee < 0) return toast.error("Enter a valid gate fee.");
  if(gateFee>0 && currency!=="NGN") return toast.error("Paid gate fees currently use NGN.");
   void (async () => {
    const created = await createEvent({title:title.trim(),tag,date,time:`${duration} minutes`,place:venue.trim(),cost:Math.max(0,gateFee),currency,blurb:blurb.trim(),details:details.trim()||blurb.trim(),coverUrl:imageUrl,venueName:venue.trim(),addressLine:address.trim(),country:country.trim(),stateProvince:state.trim(),city:city.trim(),area:area.trim(),reachScope,reachCountry:reachCountry.trim(),reachState:reachState.trim(),reachCity:reachCity.trim(),reachArea:reachArea.trim(),durationMinutes:duration});
    if (!created) { setPublishing(false); return; }
    setTitle("");setBlurb("");setDetails("");setVenue("");setAddress("");setCountry("");setState("");setCity("");setArea("");setPrice("");setImageUrl("");setDuration(120);onOpenChange(false);
    onCreated?.(created);
    setPublishing(false);
   })();
  });
 };
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl rounded-2xl p-6">
  <DialogHeader><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary"><CalendarPlus className="size-5"/></span><div><DialogTitle className="font-display text-xl font-bold">Create an Event</DialogTitle><DialogDescription className="text-xs">Give people everything they need to find and attend your event.</DialogDescription></div></div></DialogHeader>
  <form onSubmit={submit} className="mt-4 space-y-5">
   <div><label className="mb-1 block text-xs font-semibold">Event name</label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Circle Panda Music Night" required/></div>
   <div><label className="mb-1.5 block text-xs font-semibold">Type of event</label><div className="flex flex-wrap gap-1.5">{EVENT_TAGS.map(x=><button type="button" key={x} onClick={()=>setTag(x)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tag===x?"bg-primary text-primary-foreground":"border border-border bg-secondary/60"}`}>{x}</button>)}</div></div>
   <div><label className="mb-1 block text-xs font-semibold">Event picture</label><div className="rounded-2xl border border-dashed border-border p-3">{imageUrl?<div className="space-y-2"><img src={imageUrl} alt="Event cover" className="h-40 w-full rounded-xl object-cover"/><Button type="button" variant="outline" size="sm" onClick={()=>setImageUrl("")}>Change picture</Button></div>:<label className="flex cursor-pointer items-center justify-center gap-2 py-7 text-sm text-muted-foreground"><ImagePlus className="size-5"/>{uploading?"Uploading…":"Add event picture"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void uploadImage(f)}}/></label>}</div></div>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">Date & time</label><Input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} required/></div><div><label className="mb-1 block text-xs font-semibold">Duration (minutes)</label><Input type="number" min={15} max={10080} value={duration} onChange={e=>setDuration(Math.max(15,Number(e.target.value)||120))}/></div></div>
   <div className="rounded-2xl border border-border p-4 space-y-3"><p className="flex items-center gap-2 text-sm font-bold"><MapPin className="size-4 text-primary"/>Exact event location</p><Input value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Venue / place name" required/><Textarea value={address} onChange={e=>setAddress(e.target.value)} placeholder="Full street address" rows={2} required/><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country" required/><Input value={state} onChange={e=>setState(e.target.value)} placeholder="State / Province"/></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Input value={city} onChange={e=>setCity(e.target.value)} placeholder="City" required/><Input value={area} onChange={e=>setArea(e.target.value)} placeholder="Area / Neighborhood"/></div><p className="text-[11px] text-muted-foreground">The venue and full address are shown to people viewing the event.</p></div>
   <div className="rounded-2xl border border-border p-4"><label className="mb-2 block text-xs font-semibold">Gate fee</label><div className="grid grid-cols-[1fr_110px] gap-2"><Input type="number" min={0} step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Leave blank if free"/><Input value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())} maxLength={3}/></div><p className="mt-2 text-[11px] text-muted-foreground">Paid at the event gate, not in Circle Panda. Leave blank for a free event.</p></div>
   <div><label className="mb-1 block text-xs font-semibold">Short summary</label><Input value={blurb} onChange={e=>setBlurb(e.target.value)} placeholder="What is this event about?" required/></div>
   <div><label className="mb-1 block text-xs font-semibold">About the event</label><Textarea rows={4} value={details} onChange={e=>setDetails(e.target.value)} placeholder="What should people know, bring, expect, or prepare for?"/></div>
   <div className="rounded-2xl border border-border p-4 space-y-3"><label className="block text-xs font-semibold">Who should see this event?</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{(["worldwide","country","state","city","area"] as const).map(x=><button type="button" key={x} onClick={()=>setReachScope(x)} className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize ${reachScope===x?"bg-primary text-primary-foreground":"border border-border bg-secondary/60"}`}>{x}</button>)}</div>{reachScope!=="worldwide"?<div className="grid gap-2 sm:grid-cols-2">{<Input value={reachCountry} onChange={e=>setReachCountry(e.target.value)} placeholder="Target country"/>}{(reachScope==="state"||reachScope==="city"||reachScope==="area")&&<Input value={reachState} onChange={e=>setReachState(e.target.value)} placeholder="Target state / province"/>}{(reachScope==="city"||reachScope==="area")&&<Input value={reachCity} onChange={e=>setReachCity(e.target.value)} placeholder="Target city"/>}{reachScope==="area"&&<Input value={reachArea} onChange={e=>setReachArea(e.target.value)} placeholder="Target area / neighborhood"/>}</div>:null}</div>
   <DialogFooter><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={publishing||uploading} className="gap-1.5 font-bold"><Sparkles className="size-4"/>{publishing?"Publishing…":"Publish Event"}</Button></DialogFooter>
  </form>
 </DialogContent></Dialog>;
}