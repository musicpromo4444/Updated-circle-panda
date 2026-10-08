import { useEffect, useState } from "react";
import { Lock, Crown, Globe2, MapPin } from "lucide-react";
import { useStore } from "@/lib/store";
import { VipGroupChat } from "./VipGroupChat";
import { VipUpgradeModal } from "./VipUpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { requireCompleteProfile } from "@/lib/profileGate";

type Room={id:string;name:string;country:string|null;is_worldwide:boolean};

export function VipLoungeCard(){
  const {isVip}=useStore();
  const [country,setCountry]=useState("");
  const [rooms,setRooms]=useState<Room[]>([]);
  const [groupId,setGroupId]=useState<string|null>(null);
  const [upgradeOpen,setUpgradeOpen]=useState(false);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    void (async()=>{
      setLoading(true);
      const {data:profile}=await (supabase as any).from("profiles").select("country").maybeSingle();
      if(!active)return;
      const userCountry=String(profile?.country??"").trim();
      setCountry(userCountry);
      if(isVip){
        const {data}=await (supabase as any).rpc("get_vip_group_rooms_for_user");
        if(active)setRooms(Array.isArray(data)?data:[]);
      } else {
        setRooms([]);
      }
      if(active)setLoading(false);
    })();
    return()=>{active=false};
  },[isVip]);

  const worldwide=rooms.find(r=>r.is_worldwide);
  const countryRoom=rooms.find(r=>!r.is_worldwide);
  const open=async (room?:Room)=>{
    if(!(await requireCompleteProfile("use VIP Groups"))) return;
    if(!isVip){setUpgradeOpen(true);return;}
    if(room?.id){setGroupId(room.id);}
  };

  const Card=({kind}:{kind:"worldwide"|"country"})=>{
    const isWorld=kind==="worldwide";
    const label=isWorld?"Worldwide VIP":country?country+" VIP":"My Country VIP";
    const ready=isWorld || Boolean(country);
    const room=isWorld?worldwide:countryRoom;
    return <button type="button" onClick={()=>open(room)} disabled={loading || (!isWorld && !ready)}
      className="group relative w-full overflow-hidden rounded-[1.5rem] border-2 border-amber-300/80 bg-gradient-to-br from-[#3a2505] via-[#15140d] to-[#4b2d04] p-5 text-left shadow-[0_0_34px_rgba(245,158,11,.25)] transition-transform active:scale-[.99] disabled:cursor-default">
      <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-amber-300/20 blur-3xl group-hover:bg-amber-300/30"/>
      <div className="pointer-events-none absolute -bottom-20 -left-12 size-40 rounded-full bg-yellow-500/15 blur-3xl"/>
      <div className="relative flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-amber-300/80 bg-amber-400/15 shadow-[0_0_24px_rgba(245,158,11,.35)]">
          {isWorld?<Globe2 className="size-8 text-amber-300"/>:<MapPin className="size-8 text-amber-300"/>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Crown className="size-4 shrink-0 text-amber-300"/>
            <h3 className="truncate text-lg font-black text-amber-100">{label}</h3>
          </div>
          <p className="mt-1 text-xs text-amber-100/65">{isWorld?"The official Circle Panda worldwide VIP lounge":ready?"Your private VIP lounge for "+country:"Complete your profile to unlock this lounge."}</p>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-amber-300/80 bg-black/25 shadow-[0_0_20px_rgba(245,158,11,.35)]">
          <Lock className="size-6 text-amber-200"/>
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between border-t border-amber-200/15 pt-3">
        <span className="text-[11px] font-black uppercase tracking-[.16em] text-amber-200/80">VIP ACCESS</span>
        <span className="text-xs font-bold text-amber-100">{isVip?(room?"Tap to enter":"Preparing lounge…"):"Tap to become VIP"}</span>
      </div>
    </button>;
  };

  return <div className="space-y-3">
    <Card kind="worldwide"/>
    <Card kind="country"/>
    <VipGroupChat open={Boolean(groupId)} groupId={groupId??""} onOpenChange={open=>{if(!open)setGroupId(null)}}/>
    <VipUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/>
  </div>;
}
