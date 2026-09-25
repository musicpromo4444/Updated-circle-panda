import { DailyModalSequence } from "@/components/daily-bonus";

/**
 * Sequential Daily Modal System for Circle Panda
 *
 * Sequence:
 * 1. Modal 1: Daily Login Bonus (with streak tracking: 10 BC standard, 50 BC on 3-day streak,
 *    and a sleek static banner ad at the top safe for Web & Android WebView).
 * 2. Modal 2: Engagement Features (triggers immediately after Modal 1 is claimed or closed,
 *    showcasing Free Spins, Quizzes, Hot Seat, and Crush Swipes with instant actions).
 */
export function DailyRewardPopup() {
  return <DailyModalSequence />;
}
