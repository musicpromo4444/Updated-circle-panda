/**
 * Storage and state manager for Circle Panda's daily login bonus and streak tracking.
 *
 * Uses localStorage with graceful fallbacks (in case cookies/storage are restricted in WebViews).
 * Tracks:
 * - Last login date (YYYY-MM-DD)
 * - Current consecutive login streak count (1, 2, 3...)
 * - Completion timestamp of today's modal sequence
 */

const STORAGE_KEYS = {
  LAST_LOGIN_DATE: "cp_daily_last_login_date",
  STREAK_COUNT: "cp_daily_login_streak",
  MODALS_COMPLETED_DATE: "cp_daily_modals_completed_date",
  CLAIMED_DATE: "cp_daily_claimed_date",
} as const;

export interface BonusConfig {
  standardReward: number;
  streakReward: number;
  streakMilestone: number;
}

export const DEFAULT_BONUS_CONFIG: BonusConfig = {
  standardReward: 10,
  streakReward: 50,
  streakMilestone: 3,
};

const BONUS_CONFIG_KEY = "cp_admin_bonus_config";

export function getBonusConfig(): BonusConfig {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(BONUS_CONFIG_KEY);
      if (raw) {
        return { ...DEFAULT_BONUS_CONFIG, ...JSON.parse(raw) };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_BONUS_CONFIG;
}

export function saveBonusConfig(config: Partial<BonusConfig>): BonusConfig {
  const current = getBonusConfig();
  const updated = { ...current, ...config };
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(BONUS_CONFIG_KEY, JSON.stringify(updated));
    }
  } catch {
    // fallback
  }
  return updated;
}

export interface StreakState {
  /** Current streak length in consecutive days (1-indexed) */
  streak: number;
  /** Whether the user has reached the streak milestone */
  isThreeDayStreak: boolean;
  /** Reward amount in Virtual Coins (BC): streakReward for milestone, standardReward otherwise */
  rewardAmount: number;
  /** Whether the modal has already been completed today */
  alreadyCompletedToday: boolean;
  /** Whether the reward was already claimed today */
  alreadyClaimedToday: boolean;
  /** Days remaining until the streak milestone (0 if reached) */
  daysToMilestone: number;
}

/** Formats a Date object to YYYY-MM-DD in local time */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calculates calendar day difference between two YYYY-MM-DD strings */
function getDayDifference(dateStrA: string, dateStrB: string): number {
  const [yA, mA, dA] = dateStrA.split("-").map(Number);
  const [yB, mB, dB] = dateStrB.split("-").map(Number);

  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((utcB - utcA) / msPerDay);
}

/**
 * Evaluates the user's current streak and reward eligibility based on localStorage.
 */
export function evaluateLoginStreak(): StreakState {
  const todayStr = getLocalDateString();

  let lastLoginDate: string | null = null;
  let savedStreak = 1;
  let completedDate: string | null = null;
  let claimedDate: string | null = null;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      lastLoginDate = window.localStorage.getItem(STORAGE_KEYS.LAST_LOGIN_DATE);
      const rawStreak = window.localStorage.getItem(STORAGE_KEYS.STREAK_COUNT);
      savedStreak = rawStreak ? parseInt(rawStreak, 10) || 1 : 1;
      completedDate = window.localStorage.getItem(STORAGE_KEYS.MODALS_COMPLETED_DATE);
      claimedDate = window.localStorage.getItem(STORAGE_KEYS.CLAIMED_DATE);
    }
  } catch {
    // Gracefully proceed if localStorage is blocked by WebView security
  }

  let calculatedStreak = 1;

  if (!lastLoginDate) {
    // First ever login
    calculatedStreak = 1;
  } else {
    const diff = getDayDifference(lastLoginDate, todayStr);

    if (diff === 0) {
      // Same day login: maintain current streak
      calculatedStreak = savedStreak;
    } else if (diff === 1) {
      // Logged in yesterday: increment streak
      calculatedStreak = savedStreak + 1;
    } else {
      // Missed one or more days: reset streak to 1
      calculatedStreak = 1;
    }
  }

  const config = getBonusConfig();
  const isThreeDayStreak = calculatedStreak >= config.streakMilestone;
  const rewardAmount = isThreeDayStreak ? config.streakReward : config.standardReward;
  const daysToMilestone = isThreeDayStreak
    ? 0
    : Math.max(0, config.streakMilestone - calculatedStreak);

  const alreadyCompletedToday = completedDate === todayStr;
  const alreadyClaimedToday = claimedDate === todayStr;

  return {
    streak: calculatedStreak,
    isThreeDayStreak,
    rewardAmount,
    alreadyCompletedToday,
    alreadyClaimedToday,
    daysToMilestone,
  };
}

/**
 * Persists the current login and streak to storage.
 */
export function recordLoginStreak(streak: number): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const todayStr = getLocalDateString();
      window.localStorage.setItem(STORAGE_KEYS.LAST_LOGIN_DATE, todayStr);
      window.localStorage.setItem(STORAGE_KEYS.STREAK_COUNT, String(streak));
    }
  } catch {
    // Storage failure safety
  }
}

/**
 * Marks today's bonus as claimed.
 */
export function markBonusClaimed(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const todayStr = getLocalDateString();
      window.localStorage.setItem(STORAGE_KEYS.CLAIMED_DATE, todayStr);
    }
  } catch {
    // Storage failure safety
  }
}

/**
 * Marks today's daily modal sequence (Modal 1 and Modal 2) as completed
 * so they won't pop up again on subsequent page reloads today.
 */
export function markDailyModalsCompleted(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const todayStr = getLocalDateString();
      window.localStorage.setItem(STORAGE_KEYS.MODALS_COMPLETED_DATE, todayStr);
      window.localStorage.setItem(STORAGE_KEYS.LAST_LOGIN_DATE, todayStr);
    }
  } catch {
    // Storage failure safety
  }
}

/**
 * Developer / testing utility to reset the daily modal state.
 */
export function resetDailyModalState(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN_DATE);
      window.localStorage.removeItem(STORAGE_KEYS.STREAK_COUNT);
      window.localStorage.removeItem(STORAGE_KEYS.MODALS_COMPLETED_DATE);
      window.localStorage.removeItem(STORAGE_KEYS.CLAIMED_DATE);
    }
  } catch {
    // Storage failure safety
  }
}
