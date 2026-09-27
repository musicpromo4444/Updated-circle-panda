import { useEffect, useState } from "react";
import type { CoinPackage, PricingConfig, VipPlan } from "@/lib/pricingTypes";
import { supabase } from "@/integrations/supabase/client";

export const STORAGE_KEY_PRICING_CONFIG = "cp_admin_pricing_config";
export const EVENT_PRICING_CONFIG_UPDATED = "cp_pricing_config_updated";

export const DEFAULT_COIN_PACKAGES: CoinPackage[] = [];

export const DEFAULT_VIP_PLANS: VipPlan[] = [];


export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  packages: DEFAULT_COIN_PACKAGES,
  vipPlans: DEFAULT_VIP_PLANS,
  paystack: {
    publicKey: (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined) ?? "",
    currency: "NGN",
    exchangeRateNgn: 1, // Store prices are maintained directly in NGN
    testMode: false,
    merchantName: "Circle Panda Campus Store",
  },
  androidBridge: {
    enabled: true,
    bridgeInterfaceName: "AndroidBridge",
    fallbackToBrowser: true,
    sandboxCheckoutUrl: "https://checkout.circlepanda.app/pay",
  },
  googlePlay: {
    provider: "google_play",
    enabled: true,
    productIds: {},
    subscriptionIds: {},
  },
  appleIap: {
    provider: "apple_iap",
    enabled: true,
    productIds: {},
    subscriptionIds: {},
  },
  lastUpdated: new Date().toISOString(),
};



export function mergeServerCatalog(rows: any[]): PricingConfig {
  const current = DEFAULT_PRICING_CONFIG;
  const packages: CoinPackage[] = rows.filter((r) => r.item_type === "coin_package").map((r) => {
    const fallback = current.packages.find((p) => p.id === r.id);
    return {
      id: r.id, name: r.name, price: Number(r.price_usd), priceNgn: Number(r.price_ngn), coins: Number(r.coins),
      description: r.description ?? fallback?.description ?? "Panda Coin package",
      bonusTag: r.bonus_tag ?? fallback?.bonusTag, badge: r.badge ?? fallback?.badge,
      enabled: Boolean(r.enabled), isPopular: Boolean(r.is_popular), isBestValue: Boolean(r.is_best_value),
      icon: r.icon ?? fallback?.icon ?? "🪙",
      paystackProductCode: r.paystack_product_code ?? fallback?.paystackProductCode,
      androidProductId: r.android_product_id ?? fallback?.androidProductId,
      iosProductId: r.ios_product_id ?? fallback?.iosProductId,
    };
  });
  const vipPlans: VipPlan[] = rows.filter((r) => r.item_type === "vip_subscription").map((r) => {
    const fallback = current.vipPlans.find((p) => p.id === r.id);
    return {
      id: r.id, name: r.name, price: Number(r.price_usd), priceNgn: Number(r.price_ngn), interval: r.interval === "month" ? "month" : "week",
      durationDays: Number(r.vip_days), billingPeriod: r.billing_period ?? fallback?.billingPeriod ?? "per period",
      description: r.description ?? fallback?.description ?? "Circle Panda VIP Pass", badge: r.badge ?? fallback?.badge,
      isHighlighted: Boolean(r.is_highlighted), enabled: Boolean(r.enabled), perks: Array.isArray(r.perks) ? r.perks : (fallback?.perks ?? []),
      paystackProductCode: r.paystack_product_code ?? fallback?.paystackProductCode,
      androidProductId: r.android_product_id ?? fallback?.androidProductId,
      iosProductId: r.ios_product_id ?? fallback?.iosProductId,
    };
  });
  return { ...current, packages, vipPlans, lastUpdated: new Date().toISOString() };
}

export function getPricingConfig(): PricingConfig {
  return DEFAULT_PRICING_CONFIG;
}

export async function loadPricingConfig(): Promise<PricingConfig> {
  const { data, error } = await (supabase as any).from("store_catalog").select("id,item_type,name,price_usd,coins,vip_days,enabled,description,bonus_tag,badge,icon,is_popular,is_best_value,interval,billing_period,is_highlighted,perks,paystack_product_code,android_product_id,ios_product_id");
  if (error || !Array.isArray(data)) return DEFAULT_PRICING_CONFIG;
  return mergeServerCatalog(data);
}

/** Admin-only persistence. Customer checkout never trusts this local state. */
export async function savePricingConfig(config: PricingConfig): Promise<void> {
  const rows = [
    ...config.packages.map((item) => ({ id:item.id,item_type:"coin_package",name:item.name,price_usd:item.price,price_ngn:Math.round(item.price*(config.paystack.exchangeRateNgn||1500)*100)/100,coins:item.coins,vip_days:0,enabled:item.enabled,description:item.description,bonus_tag:item.bonusTag ?? null,badge:item.badge ?? null,icon:item.icon ?? null,is_popular:Boolean(item.isPopular),is_best_value:Boolean(item.isBestValue),paystack_product_code:item.paystackProductCode ?? null,android_product_id:item.androidProductId ?? null,ios_product_id:item.iosProductId ?? null,updated_at:new Date().toISOString() })),
    ...config.vipPlans.map((item) => ({ id:item.id,item_type:"vip_subscription",name:item.name,price_usd:item.price,price_ngn:Math.round(item.price*(config.paystack.exchangeRateNgn||1500)*100)/100,coins:0,vip_days:item.durationDays,enabled:item.enabled,description:item.description,badge:item.badge ?? null,interval:item.interval,billing_period:item.billingPeriod,is_highlighted:Boolean(item.isHighlighted),perks:item.perks,paystack_product_code:item.paystackProductCode ?? null,android_product_id:item.androidProductId ?? null,ios_product_id:item.iosProductId ?? null,updated_at:new Date().toISOString() })),
  ];
  const { error } = await (supabase as any).from("store_catalog").upsert(rows, { onConflict:"id" });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT_PRICING_CONFIG_UPDATED));
}

export function resetPricingConfig(): PricingConfig {
  void savePricingConfig(DEFAULT_PRICING_CONFIG).catch((err) => console.error("Failed to reset pricing:", err));
  return DEFAULT_PRICING_CONFIG;
}

export function usePricingConfig() {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await (supabase as any).from("store_catalog").select("id,item_type,name,price_usd,coins,vip_days,enabled,description,bonus_tag,badge,icon,is_popular,is_best_value,interval,billing_period,is_highlighted,perks,paystack_product_code,android_product_id,ios_product_id").eq("enabled", true);
      if (!cancelled && !error && Array.isArray(data) && data.length) setConfig(mergeServerCatalog(data));
    };
    void load();
    const handleUpdate = () => void load();
    window.addEventListener(EVENT_PRICING_CONFIG_UPDATED, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => { cancelled = true; window.removeEventListener(EVENT_PRICING_CONFIG_UPDATED, handleUpdate); window.removeEventListener("storage", handleUpdate); };
  }, []);
  return config;
}
