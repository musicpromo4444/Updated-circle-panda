import { useEffect, useState } from "react";
import { Loader2, Trophy, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Activity={id:string;title:string;activity_type:string};
type Profile={id:string;display_name:string;avatar_url:string|null};

export function UniversalWinnerManager(){
  const [activities,setActivities]=useState<Activity[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [activityId,setActivityId]=useState("");
  const [activityKey,setActivityKey]=useState("");
  const [title,setTitle]=useState("");
  const [prize,setPrize]=useState("");
  const [start,setStart]=useState("");
  const [end,setEnd]=useState("");
  const [mode,setMode]=useState<"random"|"weighted"|"manual">("weighted");
  const [manual,setManual]=useState("");
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ void (async()=>{
    const [{data:a},{data:p}] = await Promise.all([
      (supabase as any).from("activities").select("id,title,activity_type").eq("is_enabled",true).order("sort_order"),
      (supabase as any).from("profiles").select("id,display_name,avatar_url").order("display_name").limit(200)
    ]);
    setActivities(a??[]); setProfiles(p??[]);
  })(); },[]);

  const create=async()=>{
    if(!activityKey||!title||!prize||!start||!end) return toast.error("Fill the activity, title, prize, start and end time.");
    setSaving(true);
    const {error}=await (supabase as any).rpc("cp_start_winner_cycle",{
      p_scope:"global",p_activity_id:activityId||null,p_activity_key:activityKey.trim(),p_title:title.trim(),
      p_prize:prize.trim(),p_starts_at:new Date(start).toISOString(),p_ends_at:new Date(end).toISOString(),
      p_winner_mode:mode,p_xp_weight:0.5,p_activity_weight:0.5,p_manual_winner_id:manual||null
    });
    setSaving(false);
    if(error) return toast.error(error.message);
    toast.success("Winner activity scheduled.");
  };

  const matches=profiles.filter(p=>p.display_name.toLowerCase().includes(search.toLowerCase())).slice(0,8);

  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div className="flex items-center gap-2"><Trophy className="size-4 text-amber-400"/><h2 className="font-display font-bold">Previous Winner → Activity → Winner Announcement</h2></div>
    <p className="mt-1 text-xs text-muted-foreground">One system for games, giveaways, sweepstakes and multi-user challenges. Players can complete asynchronously; the server closes the window and selects the winner.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold">Activity<select value={activityId} onChange={e=>{const a=activities.find(x=>x.id===e.target.value);setActivityId(e.target.value);setActivityKey(a?.activity_type??"");setTitle(a?.title??"")}} className="mt-1 h-11 w-full rounded-xl border bg-background px-3"><option value="">Global/custom activity</option>{activities.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
      <label className="text-xs font-semibold">Activity key<input value={activityKey} onChange={e=>setActivityKey(e.target.value)} placeholder="coin-drop / giveaway / global" className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Title<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Prize<input value={prize} onChange={e=>setPrize(e.target.value)} placeholder="500 BC / Prize name" className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Starts<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Ends / server cutoff<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Winner selection<select value={mode} onChange={e=>setMode(e.target.value as typeof mode)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3"><option value="weighted">XP + activity weighted</option><option value="random">Random eligible</option><option value="manual">Manual admin selection</option></select></label>
      <div className="text-xs font-semibold"><span>Manual winner</span><div className="relative mt-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Panda name" className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm"/></div>{search&&mode==="manual"?<div className="mt-1 max-h-36 overflow-auto rounded-xl border bg-card">{matches.map(p=><button key={p.id} onClick={()=>{setManual(p.id);setSearch(p.display_name)}} className="flex w-full items-center gap-2 p-2 text-left text-xs hover:bg-secondary">{p.avatar_url?<img src={p.avatar_url} className="size-7 rounded-full" alt=""/>:<span className="size-7 rounded-full bg-secondary"/>}<span>{p.display_name}</span></button>)}</div>:null}</div>
    </div>
    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs"><b>Flow:</b> previous winner is shown → activity opens → everyone completes before the cutoff → server calculates winner → 20-second winner announcement → winner is saved as the next previous winner.</div>
    <Button className="mt-4" onClick={()=>void create()} disabled={saving}>{saving?<Loader2 className="mr-2 size-4 animate-spin"/>:null}Schedule winner activity</Button>
  </section>;
}
