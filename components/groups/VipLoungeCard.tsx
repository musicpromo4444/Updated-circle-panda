import { useState } from "react";
import { ChevronRight, Crown, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { VipGroupChat } from "./VipGroupChat";
import { VipUpgradeModal } from "./VipUpgradeModal";

export function VipLoungeCard() {
  const { isVip, vipExpiresAt } = useStore();
  const [chatOpen,setChatOpen]=useState(false);
  const [upgradeOpen,setUpgradeOpen]=useState(false);
  const daysRemaining=vipExpiresAt?Math.max(0,Math.ceil((vipExpiresAt-Date.now())/(1000*60*60*24))):0;

  return <>
    <section onClick={()=>isVip?setChatOpen(true):setUpgradeOpen(true)} className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/15 via-card to-amber-950/25 p-4 shadow-[0_0_24px_rgba(245,158,11,.25)] ring-1 ring-amber-400/50 transition-all duration-300 hover:border-amber-300">
      <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-amber-500/20 blur-2xl"/>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-xs font-black tracking-wider text-amber-400"><Crown className="size-3.5 fill-amber-500/30"/> VIP GROUP</span>
          {isVip?<span className="text-xs font-semibold text-emerald-400">VIP Active {daysRemaining>0?"("+daysRemaining+"d)":""}</span>:<span className="inline-flex items-center gap-1 text-xs text-amber-400"><Lock className="size-3"/> Restricted</span>}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-400/60 bg-amber-500/15 text-2xl shadow-[0_0_18px_rgba(245,158,11,.35)]">👑</div>
          <div className="min-w-0 flex-1"><h3 className="font-display text-xl font-black">VIP Group</h3><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">A private, full-screen WhatsApp-style group for VIP members — text, photos, videos and voice notes.</p></div>
        </div>
        {!isVip?<div className="mt-4 flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-950/25 p-3"><span className="text-xs font-medium text-amber-400">VIP membership required.</span><Button size="sm" onClick={(e)=>{e.stopPropagation();setUpgradeOpen(true)}} className="bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-neutral-950">Upgrade</Button></div>:<div className="mt-4 flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs"><span className="flex items-center gap-1.5 font-semibold text-amber-400"><Sparkles className="size-3.5"/>Open VIP group chat</span><ChevronRight className="size-4 text-amber-400"/></div>}
      </div>
    </section>
    <VipGroupChat open={chatOpen} onOpenChange={setChatOpen}/>
    <VipUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/>
  </>;
}
