import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DailyBannerSlot } from "@/components/ads/DailyBannerSlot";

export interface DailyBonusModalProps {
  open: boolean;
  streak: number;
  rewardAmount: number;
  calendar?: Array<{ day_number: number; reward_bc: number; reward_label: string }>;
  onClaim: () => void;
  onClose: () => void;
}

export function DailyBonusModal({ open, streak, rewardAmount, calendar, onClaim, onClose }: DailyBonusModalProps) {
  const currentStep = ((Math.max(1, streak) - 1) % 7) + 1;
  const rewards = calendar?.length ? calendar : Array.from({ length: 7 }, (_, i) => ({ day_number: i + 1, reward_bc: 0, reward_label: "" }));
  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : null)}>
      <DialogContent className="max-h-[92vh] w-[92vw] max-w-sm overflow-y-auto rounded-3xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-md" style={{ width: "clamp(320px, 92vw, 440px)" }}>
        <DailyBannerSlot placement="popup_1_daily_login" />
        <div className="px-5 pb-6 pt-4 text-center sm:px-6">
          <div className="relative mx-auto mb-3 flex size-20 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-b from-primary/20 to-background text-4xl shadow-inner">🐼</div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-xl font-bold tracking-tight sm:text-2xl">Daily Login Bonus</DialogTitle>
            <DialogDescription className="text-xs">Welcome back to Circle Panda! Claim your daily coins below.</DialogDescription>
          </DialogHeader>
          <div className="my-4 rounded-2xl border border-border/80 bg-secondary/30 p-3.5 sm:p-4">
            <div className="mb-2.5 flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">Login Streak</span><span className="font-bold text-primary">Day {currentStep} of 7</span></div>
            <div className="grid grid-cols-7 gap-1.5">{rewards.map((day) => { const completed=currentStep>day.day_number; const isCurrent=currentStep===day.day_number; return <div key={day.day_number} className={`flex min-w-0 flex-col items-center justify-center rounded-xl border p-1.5 ${isCurrent?"border-primary bg-primary/10 text-primary":completed?"border-primary/30 bg-primary/5 text-primary":"border-border/60 bg-card/60 text-muted-foreground"}`}><span className="text-[9px] font-bold uppercase">D{day.day_number}</span><span className="my-1 font-display text-xs font-black">{day.reward_bc} BC</span><div className="flex size-3.5 items-center justify-center text-[9px]">{completed?<Check className="size-3 stroke-[3]" />:isCurrent?"•":""}</div></div>; })}</div>
            <p className="mt-2.5 text-[11px] text-muted-foreground">Keep checking in daily. Today is Day {currentStep} of your 7-day login cycle.</p>
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-primary"><Sparkles className="size-4" /><span className="text-xs font-semibold">Today&apos;s Reward:</span><span className="font-display text-lg font-black">+{rewardAmount} BC</span></div>
          <Button type="button" onClick={onClaim} className="h-12 w-full rounded-2xl bg-primary font-display text-base font-bold text-primary-foreground shadow-lg">Claim {rewardAmount} BC &amp; Explore</Button>
          <p className="mt-2 text-[10px] text-muted-foreground">Coins are credited instantly to your Circle Panda wallet.</p>
        </div>
        <DailyBannerSlot placement="popup_1_daily_login_bottom" />
      </DialogContent>
    </Dialog>
  );
}
