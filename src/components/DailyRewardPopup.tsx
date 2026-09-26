import { DailyModalSequence } from "@/components/daily-bonus";

/**
 * Sequential Daily Modal System for Circle Panda
 *
 * Sequence:
 * 1. Daily Login Bonus uses the locked MonâThu 5/10/5/10 BC schedule and FriâSun 50 BC schedule.
 * 2. The separate 9-slot 7-Day Activities popup is built independently and must not be replaced by the old engagement modal.
 */
export function DailyRewardPopup() {
  return <DailyModalSequence />;
}
