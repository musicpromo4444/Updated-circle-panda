import { useEffect, useState } from "react";
import { Trophy, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type WinnerAnnouncement = {
  id:string; cycle_id:string; activity_title:string; winner_name:string;
  winner_avatar?:string|null; prize:string; score?:number|null; message:string;
  visible_until:string; created_at:string;
};
type OpenCycle = {
  id:string; activity_key:string|null; title:string; prize:string;
  previous_winner_name?:string|null; previous_winner_avatar?:string|null;
  previous_winner_prize?:string|null; previous_winner_score?:number|null;
  starts_at:string; ends_at:string;
};

function matchesPath(activityKey:string|null, pathname:string) {
  if (!activityKey || activityKey === "global") return true;
  return pathname.toLowerCase().includes(activityKey.toLowerCase());
}

export function UniversalWinnerFlow() {
  const [announcement,setAnnouncement] = useState<WinnerAnnouncement|null>(null);
  const [cycle,setCycle] = useState<OpenCycle|null>(null);
  const [showPrevious,setShowPrevious] = useState(false);
  const pathname = window.location.pathname;

  const load = async () => {
    await (supabase as any).rpc("cp_finalize_due_winner_cycles");
    const [a,c] = await Promise.all([
      (supabase as any).from("cp_activity_winner_announcements")
        .select("id,cycle_id,activity_title,winner_name,winner_avatar,prize,score,message,visible_until,created_at")
        .gt("visible_until",new Date().toISOString()).order("created_at",{ascending:false}).limit(1),
      (supabase as any).from("cp_activity_winner_cycles")
        .select("id,activity_key,title,prize,previous_winner_name,previous_winner_avatar,previous_winner_prize,previous_winner_score,starts_at,ends_at")
        .in("status",["scheduled","open"]).lte("starts_at",new Date().toISOString()).gt("ends_at",new Date().toISOString())
        .order("starts_at",{ascending:false}).limit(10),
    ]);
    if (!a.error && a.data?.[0]) {
      const next=a.data[0] as WinnerAnnouncement;
      setAnnouncement(next);
    }
    if (!c.error) {
      const next=(c.data ?? []).find((x:OpenCycle)=>matchesPath(x.activity_key,pathname)) as OpenCycle|undefined;
      setCycle(next ?? null);
      setShowPrevious(Boolean(next?.previous_winner_name));
    }
  };

  useEffect(() => {
    void load();
    const channel=(supabase as any).channel("cp-universal-winner-flow")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"cp_activity_winner_announcements"},()=>void load())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"cp_activity_winner_announcements"},()=>void load())
      .subscribe();
    return ()=>{ void (supabase as any).removeChannel(channel); };
  },[pathname]);


  return <>
    {showPrevious && cycle ? (
      <div className="fixed inset-x-0 top-16 z-[60] mx-auto w-[calc(100%-1rem)] max-w-md">
        <div className="rounded-2xl border border-amber-500/30 bg-background/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {cycle.previous_winner_avatar ? <img src={cycle.previous_winner_avatar} className="size-11 rounded-full object-cover" alt="" /> : <div className="grid size-11 place-items-center rounded-full bg-amber-500/15 text-amber-400"><Trophy className="size-5"/></div>}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Previous Winner</p>
              <p className="truncate font-display font-bold">{cycle.previous_winner_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{cycle.previous_winner_prize ?? cycle.prize}{cycle.previous_winner_score != null ? ` · Score ${cycle.previous_winner_score}` : ""}</p>
            </div>
            <button onClick={()=>setShowPrevious(false)} className="text-muted-foreground" aria-label="Close"><X className="size-4"/></button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Complete this activity before the server deadline. You do not need to be online with other players.</p>
        </div>
      </div>
    ) : null}
    {announcement ? (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/40 bg-background p-6 text-center shadow-[0_0_80px_rgba(245,158,11,.25)]">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-500/15 text-amber-400"><Trophy className="size-8"/></div>
          <Sparkles className="mx-auto mt-3 size-5 text-primary"/>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[.22em] text-primary">{announcement.activity_title}</p>
          <h2 className="mt-1 font-display text-2xl font-black">Winner Announcement</h2>
          {announcement.winner_avatar ? <img src={announcement.winner_avatar} className="mx-auto mt-4 size-20 rounded-full object-cover ring-4 ring-amber-400/30" alt="" /> : null}
          <p className="mt-3 text-lg font-black">{announcement.winner_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{announcement.prize}{announcement.score != null ? ` · Score ${announcement.score}` : ""}</p>
          <div className="mt-5 rounded-2xl bg-secondary/60 p-3 text-xs font-semibold">{announcement.message}</div>
          <p className="mt-3 text-[10px] text-muted-foreground">This announcement is shown for 20 seconds and becomes the next activity's previous winner.</p>
        </div>
      </div>
    ) : null}
  </>;
}

export async function submitUniversalWinnerActivity(cycleId:string, score:number, metadata:Record<string,unknown>={}) {
  return (supabase as any).rpc("cp_submit_winner_activity",{p_cycle_id:cycleId,p_score:score,p_metadata:metadata});
}
