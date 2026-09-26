/** UI-only persistence for the daily modal sequence.
 *
 * Reward eligibility, streaks and BC amounts are server-authoritative in Supabase.
 * localStorage is used only to remember that the presentation sequence was closed today.
 */
const MODALS_COMPLETED_KEY = "cp_daily_modals_completed_date";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hasDailyModalsCompleted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage?.getItem(MODALS_COMPLETED_KEY) === todayKey();
  } catch {
    return false;
  }
}

export function markDailyModalsCompleted(): void {
  try {
    window.localStorage?.setItem(MODALS_COMPLETED_KEY, todayKey());
  } catch {
    // Presentation state is best-effort only.
  }
}

export function resetDailyModalState(): void {
  try {
    window.localStorage?.removeItem(MODALS_COMPLETED_KEY);
  } catch {
    // Presentation state is best-effort only.
  }
}
