import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { DailyBonusModal } from "./DailyBonusModal";
import { EngagementFeaturesModal } from "./EngagementFeaturesModal";
import {
  evaluateLoginStreak,
  markBonusClaimed,
  markDailyModalsCompleted,
  recordLoginStreak,
  type StreakState,
} from "./dailyBonusStorage";

export interface DailyModalSequenceProps {
  /** If true, forces the modal to open regardless of today's completed state (e.g. for testing) */
  forceOpen?: boolean;
}

/**
 * Sequential Daily Modal System for Circle Panda.
 *
 * Sequence Flow:
 * 1. Checks localStorage for last login date and streak.
 * 2. On first app open of the day, opens Modal 1 (Daily Login Bonus with streak tracker & top banner ad).
 * 3. Immediately when Modal 1 is claimed or dismissed, opens Modal 2 (Engagement Features: Free Spins, Quizzes, Hot Seat, Crushes).
 * 4. Once Modal 2 finishes, records completion in localStorage so it does not reappear until the next calendar day.
 */
export function DailyModalSequence({ forceOpen = false }: DailyModalSequenceProps) {
  const { addCoins } = useStore();

  // 0: none open, 1: Daily Bonus Modal, 2: Engagement Features Modal
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [streakState, setStreakState] = useState<StreakState | null>(null);

  useEffect(() => {
    const state = evaluateLoginStreak();
    setStreakState(state);

    if (forceOpen || !state.alreadyCompletedToday) {
      // Delay slightly for smooth page entrance transition
      const timer = setTimeout(() => {
        setActiveStep(1);
        recordLoginStreak(state.streak);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  // Modal 1: Claim reward handler
  const handleClaimReward = () => {
    if (!streakState) return;

    const { rewardAmount, isThreeDayStreak } = streakState;
    const reason = isThreeDayStreak
      ? `3-Day Login Streak Bonus (+${rewardAmount} BC)`
      : `Daily Login Bonus (+${rewardAmount} BC)`;

    addCoins(rewardAmount, reason);
    markBonusClaimed();

    toast.success(`Claimed +${rewardAmount} BC! 🎉`, {
      description: isThreeDayStreak
        ? "Awesome 3-day streak! 50 Virtual Coins added to your wallet."
        : "10 Virtual Coins added to your wallet.",
    });

    // Immediately trigger Modal 2
    setActiveStep(2);
  };

  // Modal 1: Dismiss / Close handler (also immediately opens Modal 2)
  const handleCloseModal1 = () => {
    setActiveStep(2);
  };

  // Modal 2: Final Dismiss / Close handler
  const handleCloseModal2 = () => {
    markDailyModalsCompleted();
    setActiveStep(0);
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
        rewardAmount={streakState.rewardAmount}
        isStreakBonus={streakState.isThreeDayStreak}
        onClaim={handleClaimReward}
        onClose={handleCloseModal1}
      />

      {/* Modal 2: Engagement Features */}
      <EngagementFeaturesModal open={activeStep === 2} onClose={handleCloseModal2} />
    </>
  );
}
