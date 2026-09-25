import { supabase, hasSupabaseConfig } from "@/integrations/supabase/client";
import type { SpinPrize } from "./store";

export interface ServerSpinResult {
  success: boolean;
  prize?: SpinPrize;
  newBalance?: number;
  error?: string;
}

/**
 * Executes a verified daily wheel spin on the database server.
 * This guarantees the 24h cooldown is checked server-side and the balance is
 * safely updated using PostgreSQL transactions.
 */
export async function executeServerSpin(): Promise<ServerSpinResult> {
  if (!hasSupabaseConfig()) {
    return { success: false, error: "LOCAL_FALLBACK" };
  }

  try {
    const { data, error } = await supabase.rpc("spin_daily_wheel");

    if (error) {
      return { success: false, error: error.message };
    }

    const payload = data as {
      prize_id: string;
      title: string;
      kind: "coins" | "ticket" | "data" | "vip" | "physical";
      value: number;
      emoji: string;
      blurb: string;
      new_balance: number;
    };

    const prize: SpinPrize = {
      id: payload.prize_id,
      title: payload.title,
      label: payload.title,
      type:
        payload.kind === "coins"
          ? "currency"
          : payload.kind === "vip"
            ? "perk"
            : (payload.kind as "ticket" | "data" | "physical"),
      kind: payload.kind,
      value: payload.value,
      amount: payload.value,
      emoji: payload.emoji,
      rarity:
        payload.value >= 1000 || payload.kind === "physical"
          ? "ultra-rare"
          : payload.kind === "vip"
            ? "rare"
            : "common",
      blurb: payload.blurb,
      weight: 1,
    };

    return {
      success: true,
      prize,
      newBalance: payload.new_balance,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to spin wheel";
    return { success: false, error: message };
  }
}

/**
 * Claims rewarded video ad coins through the server function,
 * adding +10 BC safely in the database with cooldown protection.
 */
export async function claimServerAdReward(): Promise<{
  success: boolean;
  addedCoins?: number;
  newBalance?: number;
  error?: string;
}> {
  if (!hasSupabaseConfig()) {
    return { success: false, error: "LOCAL_FALLBACK" };
  }

  try {
    const { data, error } = await supabase.rpc("claim_rewarded_ad_coins");
    if (error) {
      return { success: false, error: error.message };
    }

    const payload = data as { added_coins: number; new_balance: number };
    return {
      success: true,
      addedCoins: payload.added_coins,
      newBalance: payload.new_balance,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to claim ad reward";
    return { success: false, error: message };
  }
}

/**
 * Submits a confession securely to the database, awarding +2 BC and +15 XP server-side.
 */
export async function submitServerConfession(body: string): Promise<{
  success: boolean;
  confessionId?: string;
  newBalance?: number;
  error?: string;
}> {
  if (!hasSupabaseConfig()) {
    return { success: false, error: "LOCAL_FALLBACK" };
  }

  try {
    const { data, error } = await supabase.rpc("submit_confession", { p_body: body.trim() });
    if (error) {
      return { success: false, error: error.message };
    }

    const payload = data as { confession_id: string; new_balance: number };
    return {
      success: true,
      confessionId: payload.confession_id,
      newBalance: payload.new_balance,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit confession";
    return { success: false, error: message };
  }
}
