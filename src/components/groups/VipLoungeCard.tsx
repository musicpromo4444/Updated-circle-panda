import { useEffect, useState } from "react";
import { Crown, Lock, Sparkles, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { VipGroupChat } from "./VipGroupChat";
import { VipUpgradeModal } from "./VipUpgradeModal";
import { supabase } from "@/integrations/supabase/client";

type Room={id:string;name:string;country:string|null;is_worldwide:boolean};

export function VipLoungeCard(){
 const {isVip,vipExpiresAt}=useStore();
 const [rooms,setRooms]=useState<Room[]>([]);
 const [groupId,setGroupId]=useState<string|null>(null);
 const [upgradeOpen,setUpgradeOpen]=useState(false);
 useEffect(()=>{if(!isVip){setRooms([]);return;}void(async()=>{const{data,error}=await(supabase as any).rpc("get_vip_group_rooms_for_user");if(error){console.warn("VIP rooms unavailable",error);return;}setRooms(data??[])})();},[isVip]);
 const daysRemaining=vipExpiresAt?Math.max(0,Math.ceil((vipExpiresAt-Date.now())/(1000*60*60*24))):0;
 const card=(room:Room)=><section key={room.id} onClick={()=>setGroupId(room.id)} className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/15 via-card to-amber-950/25 p-4 shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50 transition-all duration-300 hover:border-amber-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]">
  <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-amber-500/20 blur-2xl"/><div className="pointer-events-none absolute -bottom-12 -left-12 size-36 rounded-full bg-yellow-500/15 blur-2xl"/>
  <div className="relative z-10"><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/25 px-3 py-1 text-xs font-black tracking-wider text-amber-400"><Crown className="size-3.5"/>VIP EXCLUSIVE</span>{isVip?<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"/>VIP Active {daysRemaining>0?"("+daysRemaining+"d)":""}</span>:<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400"><Lock className="size-3"/>Restricted</span>}</div>
  <div className="mt-3.5 flex items-start gap-3.5"><div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-400/60 bg-amber-500/20 text-2xl">👑</div><div className="min-w-0 flex-1"><h3 className="font-display text-lg font-black">{room.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">Private VIP group — free text, photos, videos, voice notes and calls.</p><div className="mt-3 flex flex-wrap gap-1.5 text-[11px]"><span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">Text</span><span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">Photos & Videos</span><span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">Voice Notes</span></div></div></div>
  <div className="mt-3.5 flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs"><span className="font-semibold text-amber-400"><Sparkles className="mr-1 inline size-3.5"/>Tap to open</span><span className="font-bold text-amber-400">Enter Group <ChevronRight className="inline size-4"/></span></div>
  </div></section>;
 return <>{isVip?rooms.map(card):<section onClick={()=>setUpgradeOpen(true)} className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/15 via-card to-amber-950/25 p-4"><div className="flex items-center gap-3"><Crown className="size-7 text-amber-400"/><div><h3 className="font-display font-black">VIP Groups</h3><p className="text-xs text-muted-foreground">Upgrade to unlock the worldwide and country VIP groups.</p></div><ArrowRight className="ml-auto size-5 text-amber-400"/></div></section>}<VipGroupChat open={Boolean(groupId)} groupId={groupId??""} onOpenChange={open=>{if(!open)setGroupId(null)}}/><VipUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/></>;
}