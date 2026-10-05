import { useEffect, useState } from "react";
import { ChevronRight, Crown, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { VipGroupChat } from "./VipGroupChat";
import { VipUpgradeModal } from "./VipUpgradeModal";
import { supabase } from "@/integrations/supabase/client";

type VipRoom={id:string;name:string;country:string|null;is_worldwide:boolean};

export function VipLoungeCard() {
  const { isVip, vipExpiresAt } = useStore();
  const [rooms,setRooms]=useState<VipRoom[]>([]);
  const [activeRoom,setActiveRoom]=useState<string|null>(null);
  const [upgradeOpen,setUpgradeOpen]=useState(false);
  const daysRemaining=vipExpiresAt?Math.max(0,Math.ceil((vipExpiresAt-Date.now())/(1000*60*60*24))):0;

  useEffect(()=>{ if(!isVip){setRooms([]);return;} void (supabase as any).rpc("get_vip_group_rooms_for_user").then(({data,error}:any)=>{ if(error){console.warn(error.message);return;} setRooms(data??[]); }); },[isVip]);

  const openUpgrade=()=>setUpgradeOpen(true);

  return <>
    <section className="relative overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/15 via-card to-amber-950/25 p-4 shadow-[0_0_24px_rgba(245,158,11,.25)] ring-1 ring-amber-400/50">
      <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-amber-500/20 blur-2xl"/>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-xs font-black tracking-wider text-amber-400"><Crown className="size-3.5 fill-amber-500/30"/> VIP GROUPS</span>
          {isVip?<span className="text-xs font-semibold text-emerald-400">VIP Active {daysRemaining>0?"("+daysRemaining+"d)":""}</span>:<span className="inline-flex items-center gap-1 text-xs text-amber-400"><Lock className="size-3"/> Restricted</span>}
        </div>
        <div className="mt-3">
          <h3 className="font-display text-xl font-black">VIP Groups</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Worldwide VIP and your country VIP are separate full-screen rooms.</p>
        </div>
        {!isVip ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-950/25 p-3"><span className="text-xs font-medium text-amber-400">VIP membership required.</span><Button size="sm" onClick={openUpgrade} className="bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-neutral-950">Upgrade</Button></div>
        ) : (
          <div className="mt-4 grid gap-2">
            {rooms.map(room=><button key={room.id} type="button" onClick={()=>setActiveRoom(room.id)} className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-left transition hover:bg-amber-500/15">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-400/50 bg-amber-500/10 text-lg">👑</span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{room.name}</span><span className="block text-[11px] text-muted-foreground">{room.is_worldwide?"All VIP members":"Country VIP room"}</span></span>
              <ChevronRight className="size-4 text-amber-400"/>
            </button>)}
            {!rooms.length?<p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">Loading VIP rooms…</p>:null}
          </div>
        )}
      </div>
    </section>
    {activeRoom?<VipGroupChat open={true} onOpenChange={open=>{if(!open)setActiveRoom(null)}} groupId={activeRoom}/>:null}
    <VipUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/>
  </>;
}
