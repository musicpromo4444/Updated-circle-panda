import { useEffect, useState } from "react";
import type { CoinPackage, PricingConfig, VipPlan } from "@/components/admin/adminTypes";

export const STORAGE_KEY_PRICING_CONFIG = "cp_admin_pricing_config";
export const EVENT_PRICING_CONFIG_UPDATED = "cp_pricing_config_updated";

export const DEFAULT_COIN_PACKAGES: CoinPackage[] = [
  {
    id: "pkg_starter",
    name: "Starter Pack",
    price: 0.5,
    coins: 1000,
    bonusTag: "Starter Entry",
    description: "Instant bankroll for quick Hot Seat unlocks and whisper tips.",
    badge: "Fast Unlock",
    enabled: true,
    isPopular: false,
    isBestValue: false,
    icon: "🪙",
  },
  {
    id: "pkg_popular",
    name: "Panda Popular Pack",
    price: 1.0,
    coins: 2000,
    bonusTag: "Standard anchor price",
    description: "The baseline campus anchor — perfect balance for daily crushes & voting.",
    badge: "Most Popular",
    enabled: true,
    isPopular: true,
    isBestValue: false,
    icon: "🐼",
  },
  {
    id: "pkg_speed_dating",
    name: "Speed-Dating Boost",
    price: 2.5,
    coins: 5500,
    bonusTag: "Includes scaling bonus value",
    description: "Includes +500 bonus BC (+10% extra value) for fast-lane matching & rose gifts.",
    badge: "+10% Bonus",
    enabled: true,
    isPopular: false,
    isBestValue: false,
    icon: "⚡",
  },
  {
    id: "pkg_vip_vault",
    name: "Ultimate VIP Vault",
    price: 5.0,
    coins: 12000,
    bonusTag: "Includes highest bonus value tag",
    description: "Includes +2,000 bonus BC (+20% highest value tag). Dominate campus leaderboards.",
    badge: "Best Value",
    enabled: true,
    isPopular: false,
    isBestValue: true,
    icon: "👑",
  },
];

export const DEFAULT_VIP_PLANS: VipPlan[] = [
  {
    id: "vip_weekly",
    name: "Weekly VIP Pass",
    price: 1.0,
    interval: "week",
    durationDays: 7,
    billingPeriod: "per week",
    description: "Full VIP privileges, speed-dating fast lane, and golden crown badge for 7 days.",
    badge: "Flexible",
    isHighlighted: false,
    enabled: true,
    perks: [
      "Golden Panda VIP Crown badge across feed & chat",
      "Priority speed dating queue & instant rematch",
      "Unlimited Hot Seat questions & answer reveals",
      "Double Daily Wheel spin multiplier (2x BC rewards)",
      "Exclusive access to VIP lounge topics",
    ],
  },
  {
    id: "vip_monthly",
    name: "Monthly VIP Pass",
    price: 3.0,
    interval: "month",
    durationDays: 30,
    billingPeriod: "per month",
    description:
      "Highlighted as a better long-term value option — save over 25% compared to weekly renewals.",
    badge: "Better Long-Term Value",
    isHighlighted: true,
    enabled: true,
    perks: [
      "All perks included in the Weekly VIP Pass",
      "Save 25%+ vs weekly renewals ($3.00 vs $4.00+)",
      "Exclusive monthly VIP sweepstake mega tickets",
      "Custom diamond glow profile border & reactions",
      "Direct priority moderation line & ad-free experience",
    ],
  },
];

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  packages: DEFAULT_COIN_PACKAGES,
  vipPlans: DEFAULT_VIP_PLANS,
  paystack: {
    publicKey: "pk_test_circlepanda_campus_live",
    currency: "USD",
    exchangeRateNgn: 1500, // ₦1,500 = $1.00 USD
    testMode: true,
    merchantName: "Circle Panda Campus Store",
  },
  androidBridge: {
    enabled: true,
    bridgeInterfaceName: "AndroidBridge",
    fallbackToBrowser: true,
    sandboxCheckoutUrl: "https://checkout.circlepanda.app/pay",
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * Loads the active PricingConfig from localStorage or returns the default.
 */
export function getPricingConfig(): PricingConfig {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_PRICING_CONFIG;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PRICING_CONFIG);
    if (!raw) return DEFAULT_PRICING_CONFIG;
    const parsed = JSON.parse(raw);

    return {
      packages:
        Array.isArray(parsed.packages) && parsed.packages.length > 0
          ? parsed.packages
          : DEFAULT_COIN_PACKAGES,
      vipPlans:
        Array.isArray(parsed.vipPlans) && parsed.vipPlans.length > 0
          ? parsed.vipPlans
          : DEFAULT_VIP_PLANS,
      paystack: {
        ...DEFAULT_PRICING_CONFIG.paystack,
        ...(parsed.paystack || {}),
      },
      androidBridge: {
        ...DEFAULT_PRICING_CONFIG.androidBridge,
        ...(parsed.androidBridge || {}),
      },
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
}

/**
 * Persists the PricingConfig and dispatches live notification.
 */
export function savePricingConfig(config: PricingConfig): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const updated = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY_PRICING_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_PRICING_CONFIG_UPDATED, { detail: updated }));
  } catch (err) {
    console.error("Failed to save pricing config:", err);
  }
}

/**
 * Resets pricing configuration back to the default schema.
 */
export function resetPricingConfig(): PricingConfig {
  savePricingConfig(DEFAULT_PRICING_CONFIG);
  return DEFAULT_PRICING_CONFIG;
}

/**
 * React hook to consume live pricing configuration anywhere in the app.
 */
export function usePricingConfig() {
  const [config, setConfig] = useState<PricingConfig>(getPricingConfig);

  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getPricingConfig());
    };

    window.addEventListener(EVENT_PRICING_CONFIG_UPDATED, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_PRICING_CONFIG_UPDATED, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return config;
}
