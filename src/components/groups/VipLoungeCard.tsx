import { useEffect, useState } from "react";
import { Crown, Lock, ArrowRight, Users } from "lucide-react";
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
 const [serverVip,setServerVip]=useState(false);
 useEffect(()=>{
   let active=true;
   void (async()=>{
     const {data:profile}=await (supabase as any).from("profiles").select("is_vip,vip_expires_at").maybeSingle();
     setServerVip(Boolean(profile?.is_vip && (!profile?.vip_expires_at || new Date(profile.vip_expires_at).getTime()>Date.now())));
     const {data,error}=await (supabase as any).rpc("get_vip_group_rooms_for_user");
     if(!active)return;
     if(error){console.warn("VIP rooms unavailable",error);setRooms([]);return;}
     setRooms(Array.isArray(data)?data:[]);
   })();
   return()=>{active=false};
 },[isVip,serverVip]);
 const effectiveVip=isVip||serverVip;
 const openRoom=(room:Room)=>{if(!effectiveVip){setUpgradeOpen(true);return;}setGroupId(room.id)};
 const shareRoom=async(room:Room)=>{
   const url=window.location.origin+"/groups?vip="+encodeURIComponent(room.id);
   try{if(navigator.share)await navigator.share({title:room.name,text:"Join this Circle Panda VIP group.",url});else await navigator.clipboard.writeText(url)}catch{}
 };
 return <div className="space-y-3">
   {rooms.length?rooms.map(room=><section key={room.id} className="relative overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/10 via-card to-amber-950/25 p-3.5 shadow-[0_0_26px_rgba(245,158,11,.22)] ring-1 ring-amber-300/30">
     <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-amber-400/20 blur-3xl"/>
     <div className="pointer-events-none absolute -bottom-12 -left-12 size-32 rounded-full bg-yellow-500/15 blur-3xl"/>
     <div className="relative flex items-center gap-3">
       <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-400/60 bg-amber-500/15 text-2xl shadow-[0_0_18px_rgba(245,158,11,.18)]">👑</span>
       <div className="min-w-0 flex-1">
         <div className="flex items-center gap-2">
           <h3 className="truncate font-display text-base font-black text-amber-950 dark:text-amber-100">{room.is_worldwide?"Worldwide VIP":(room.country||"Country")+" VIP"}</h3>
           <span className="shrink-0 rounded-full border border-amber-400/60 bg-amber-400/15 px-2 py-0.5 text-[9px] font-black tracking-wide text-amber-700 dark:text-amber-300">VIP</span>
         </div>
         <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{room.is_worldwide?"Official Circle Panda worldwide VIP community":"Private VIP group for "+(room.country||"your country")}</p>
         <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700/80 dark:text-amber-300/80"><Users className="size-3"/> VIP-only · Free messages & media</div>
       </div>
       {effectiveVip?<Button size="sm" onClick={()=>openRoom(room)} className="shrink-0 rounded-full border border-amber-300 bg-amber-500 px-4 text-black shadow-[0_0_16px_rgba(245,158,11,.35)] hover:bg-amber-400">Join Group</Button>
       :<Button size="sm" variant="outline" onClick={()=>setUpgradeOpen(true)} className="shrink-0 rounded-full border-amber-400/60 text-amber-700 dark:text-amber-300"><Lock className="mr-1 size-3"/>VIP Only</Button>}
     </div>
     <div className="relative mt-2 flex justify-end">
       <button type="button" onClick={()=>void shareRoom(room)} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">Share <ArrowRight className="size-3"/></button>
     </div>
   </section>):<section onClick={()=>setUpgradeOpen(true)} className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/15 via-card to-amber-950/25 p-3.5 shadow-[0_0_24px_rgba(245,158,11,.2)]">
      <div className="flex items-center gap-3"><Crown className="size-7 text-amber-400"/><div><h3 className="font-display font-black">VIP Groups</h3><p className="text-xs text-muted-foreground">Upgrade to unlock the worldwide and country VIP groups.</p></div><ArrowRight className="ml-auto size-5 text-amber-400"/></div>
   </section>}
   <VipGroupChat open={Boolean(groupId)} groupId={groupId??""} onOpenChange={open=>{if(!open)setGroupId(null)}}/>
   <VipUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/>
 </div>;
}
