import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { claimDailyReward } from "@/lib/production/features";
import { supabase } from "@/integrations/supabase/client";
import { DailyBonusModal } from "./DailyBonusModal";
import { SevenDayActivitiesModal } from "@/components/seven-day/SevenDayActivitiesModal";
import { hasDailyModalsCompleted, markDailyModalsCompleted } from "./dailyBonusStorage";

export interface DailyModalSequenceProps {
  /** If true, forces the modal to open regardless of today's completed state (e.g. for testing) */
  forceOpen?: boolean;
}

/**
 * Sequential Daily Modal System for Circle Panda.
 *
 * Sequence Flow:
 * 1. Loads the login streak and reward schedule from Supabase.
 * 2. On first app open of the day, opens Modal 1 (Daily Login Bonus with streak tracker & top banner ad).
 * 3. The daily login claim is server-authoritative. The Daily Activity popup shows only the single activity assigned to the current day by Admin.
 */
export function DailyModalSequence({ forceOpen = false }: DailyModalSequenceProps) {
  const { syncCoins } = useStore();
  const navigate = useNavigate();

  // 0: none open, 1: Daily Bonus, 2: 7-Day Activities
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [streakState, setStreakState] = useState<{
    streak: number;
    reward: number;
    day: number;
    reward_label?: string;
    claimed: boolean;
    calendar?: Array<{ day_number: number; reward_bc: number; reward_label: string }>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await (supabase as any).rpc("get_daily_reward_status");
      if (cancelled) return;
      if (error) {
        toast.error(error.message ?? "Daily reward could not be loaded");
        return;
      }
      const status = data ?? null;
      setStreakState(status);
      if (forceOpen || (!status?.claimed && !hasDailyModalsCompleted())) {
        const timer = setTimeout(() => setActiveStep(1), 700);
        return () => clearTimeout(timer);
      }
      return undefined;
    };
    void load();
    return () => { cancelled = true; };
  }, [forceOpen]);

  // Modal 1: Claim reward handler
  const handleClaimReward = async () => {
    if (!streakState) return;
    try {
      const result = await claimDailyReward();
      if (result.claimed) {
        await syncCoins();
        toast.success(`Claimed +${result.reward} BC! 🎉`, { description: `Day ${result.day} of your Circle Panda login streak is secured on this account.` });
        setStreakState((current) => current ? { ...current, claimed: true, streak: result.streak, reward: result.reward, day: result.day } : current);
      } else {
        toast.info("Today's reward has already been claimed.");
      }
      setActiveStep(2);
    } catch (error: any) {
      toast.error(error?.message ?? "Could not claim the daily reward. Please try again.");
    }
  };

  // Modal 1: Dismiss / Close handler (also immediately opens Modal 2)
  const handleCloseModal1 = () => {
    setActiveStep(0);
  };



  const handleActivitiesClose = () => {
    markDailyModalsCompleted();
    setActiveStep(0);
  };

  const handleActivitiesComplete = () => {
    markDailyModalsCompleted();
    setActiveStep(0);
    void navigate({ to: "/" });
  };

  if (!streakState || activeStep === 0) {
    return null;
  }

  return (
    <>
      {/* Modal 1: Daily Login Bonus */}
      <DailyBonusModal
        open={activeStep === 1}
        streak={streakState.streak}
        rewardAmount={streakState.reward}
        calendar={streakState.calendar}
        onClaim={handleClaimReward}
        onClose={handleCloseModal1}
      />
      <SevenDayActivitiesModal open={activeStep === 2} onClose={handleActivitiesClose} onComplete={handleActivitiesComplete} />
    </>
  );
}
