import { useEffect, useState } from "react";
import { Clock3, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type UniversalActivityCycle = {
  id:string; activity_key:string|null; title:string; prize:string; starts_at:string; ends_at:string; status:string;
  max_attempts:number; entry_limit:number|null; completion_reward_bc:number; completion_reward_xp:number;
  winner_reward_bc:number; winner_reward_xp:number; winner_badge:string|null;
};

export async function getUniversalActivityCycle(activityKey:string) {
  const {data,error}=await (supabase as any).rpc("cp_get_winner_cycle",{p_activity_key:activityKey});
  return {cycle:(data ?? null) as UniversalActivityCycle|null,error};
}

export async function submitUniversalActivity(cycleId:string,score:number,metadata:Record<string,unknown>={}) {
  return (supabase as any).rpc("cp_submit_winner_activity",{p_cycle_id:cycleId,p_score:Math.max(0,score),p_metadata:metadata});
}

export function useUniversalActivity(activityKey:string) {
  const [cycle,setCycle]=useState<UniversalActivityCycle|null>(null);
  const [loading,setLoading]=useState(true);
  const [result,setResult]=useState<any>(null);
  const load=async()=>{setLoading(true);const r=await getUniversalActivityCycle(activityKey);if(!r.error)setCycle(r.cycle);setLoading(false);};
  useEffect(()=>{void load();const ch=(supabase as any).channel("cp-engine-"+activityKey).on("postgres_changes",{event:"*",schema:"public",table:"cp_activity_winner_cycles"},()=>void load()).subscribe();return()=>{void (supabase as any).removeChannel(ch)};},[activityKey]);
  const submit=async(score:number,metadata:Record<string,unknown>={})=>{if(!cycle)return {data:null,error:new Error("No active activity cycle")};const r=await submitUniversalActivity(cycle.id,score,metadata);if(!r.error)setResult(r.data);return r;};
  return {cycle,loading,result,submit,refresh:load};
}

export function UniversalActivityStatus({activityKey}:{activityKey:string}) {
  const {cycle,loading}=useUniversalActivity(activityKey);
  if(loading||!cycle)return null;
  const remaining=Math.max(0,Math.floor((new Date(cycle.ends_at).getTime()-Date.now())/1000));
  const h=Math.floor(remaining/3600),m=Math.floor((remaining%3600)/60),s=remaining%60;
  return <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
    <div className="flex items-center gap-2"><Trophy className="size-4 text-amber-400"/><div className="min-w-0 flex-1"><p className="text-xs font-black">{cycle.title}</p><p className="text-[11px] text-muted-foreground">Complete anytime before the server cutoff · {cycle.prize}</p></div><Zap className="size-4 text-primary"/></div>
    <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><Clock3 className="size-3.5"/> {h>0?h+"h ":""}{m}m {s}s remaining · {cycle.max_attempts} attempt{cycle.max_attempts===1?"":"s"}</div>
  </div>;
}