import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_AD_CONFIG,
  DEFAULT_ENGAGEMENT_CONFIG,
  EVENT_AD_CONFIG_UPDATED,
  EVENT_ENGAGEMENT_UPDATED,
  INITIAL_CREATIVES,
  STORAGE_KEY_AD_CONFIG,
  STORAGE_KEY_ENGAGEMENT,
} from "@/components/ads/adInventoryStorage";
import {
  type ActionLogCategory,
  type AdCreative,
  type AdminActivityLog,
  type AdminUser,
  type AdPerformanceMetrics,
  type AdPlacementConfig,
  type AndroidBridgeGatewayConfig,
  type CoinPackage,
  type EngagementConfig,
  type ExternalSurveyConfig,
  type PaystackGatewayConfig,
  type PricingConfig,
  type VipPlan,
} from "./adminTypes";
import {
  DEFAULT_PRICING_CONFIG,
  getPricingConfig,
  savePricingConfig,
} from "@/components/store/pricingStorage";

const INITIAL_USERS: AdminUser[] = [];

const INITIAL_AD_METRICS: AdPerformanceMetrics = {
  impressionsWeb: 0, impressionsAndroid: 0, revenueWeb: 0, revenueAndroid: 0,
  ctrWeb: 0, ctrAndroid: 0, fillRateWeb: 0, fillRateAndroid: 0, eCpmWeb: 0, eCpmAndroid: 0,
};

const INITIAL_AD_CONFIG: AdPlacementConfig = {
  dailyLoginPopupBanner: true,
  mainFeedBanner: true,
  feedBannerInterval: 4,
  videoAdCrushFrequency: 5,
  androidNativeBridgeEnabled: true,
  sponsorPartners: [],
};

const STORAGE_KEY_ADMIN_USERS = "cp_admin_users_data";
const STORAGE_KEY_LOGS = "cp_admin_audit_logs";

export function useAdminStore() {
  const [users, setUsers] = useState<AdminUser[]>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY_ADMIN_USERS);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  const [adConfig, setAdConfig] = useState<AdPlacementConfig>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY_AD_CONFIG);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_AD_CONFIG,
            ...parsed,
            creatives:
              Array.isArray(parsed.creatives) && parsed.creatives.length > 0
                ? parsed.creatives
                : INITIAL_CREATIVES,
          };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_AD_CONFIG;
  });

  const [adMetrics] = useState<AdPerformanceMetrics>(INITIAL_AD_METRICS);

  const [engagementConfig, setEngagementConfig] = useState<EngagementConfig>(() => {
    const defaults: EngagementConfig = { ...DEFAULT_ENGAGEMENT_CONFIG };

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY_ENGAGEMENT);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...defaults,
            ...parsed,
            externalSurvey: {
              ...defaults.externalSurvey,
              ...(parsed.externalSurvey || {}),
            },
          };
        }
      }
    } catch {
      // ignore
    }
    return defaults;
  });

  const [logs, setLogs] = useState<AdminActivityLog[]>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY_LOGS);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [
      {
        id: "log-1",
        timestamp: "Today at 09:15 AM",
        adminAction: "SYSTEM_INITIALIZED",
        details: "Admin panel connected to Web and Android WebView telemetry.",
      },
    ];
  });

  const loadRealUsers = async () => {
    const { data, error } = await (supabase as any).rpc("admin_list_users");
    if (error) {
      toast.error(error.message ?? "Could not load real users");
      return;
    }
    const mapped: AdminUser[] = (data ?? []).map((u: any) => ({
      id: String(u.id),
      username: String(u.username ?? "Anonymous Panda"),
      avatar: String(u.avatar ?? "🐼"),
      platform: u.platform === "android_webview" ? "android_webview" : "web_browser",
      coins: Number(u.coins ?? 0),
      streak: Number(u.streak ?? 0),
      status: u.status === "banned" ? "banned" : "active",
      joinedDate: String(u.joined_date ?? ""),
      lastActive: u.last_active ? new Date(u.last_active).toLocaleString() : "Never",
      reputation: Number(u.reputation ?? 0),
      email: u.email ?? undefined,
    }));
    setUsers(mapped);
  };

  useEffect(() => { void loadRealUsers(); }, []);
  useEffect(() => {
    void (async () => {
      const { data, error } = await (supabase as any).rpc("get_ad_runtime_config");
      if (error) { toast.error(error.message ?? "Could not load live ad inventory"); return; }
      const config = data?.config ?? {};
      const creatives: AdCreative[] = (Array.isArray(data?.creatives) ? data.creatives : []).map((a: any) => ({
        id: String(a.id),
        sponsor: String(a.sponsor ?? ""),
        headline: String(a.headline ?? ""),
        description: String(a.description ?? ""),
        imageUrl: a.image_url ?? undefined,
        destinationUrl: String(a.destination_url ?? ""),
        placement: a.placement as any,
        category: String(a.category ?? "Sponsored Partner"),
        callToAction: String(a.call_to_action ?? "Learn More"),
        status: a.status === "paused" ? "paused" : "active",
        impressions: Number(a.impressions ?? 0),
        clicks: Number(a.clicks ?? 0),
        createdAt: String(a.created_at ?? new Date().toISOString()),
      }));
      setAdConfig((prev) => ({ ...prev, dailyLoginPopupBanner: config.daily_login_popup_banner !== false, mainFeedBanner: config.main_feed_banner !== false, feedBannerInterval: Number(config.feed_banner_interval ?? prev.feedBannerInterval), videoAdCrushFrequency: Number(config.crush_video_frequency ?? prev.videoAdCrushFrequency), androidNativeBridgeEnabled: config.android_native_bridge_enabled !== false, hotSeatCommentsAdsEnabled: config.hot_seat_comments_ads_enabled !== false, hotSeatQuestionsAdsEnabled: config.hot_seat_questions_ads_enabled !== false, hotSeatWaterBreakAdsEnabled: config.hot_seat_water_break_ads_enabled === true, creatives }));
    })();
  }, []);

  // Sync users to storage
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(users));
      }
    } catch {
      // ignore
    }
  }, [users]);

  // Sync adConfig to storage & dispatch live event
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_AD_CONFIG, JSON.stringify(adConfig));
        window.dispatchEvent(new CustomEvent(EVENT_AD_CONFIG_UPDATED));
      }
    } catch {
      // ignore
    }
  }, [adConfig]);

  // Sync engagementConfig to storage + update dailyBonusStorage & dispatch live event
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_ENGAGEMENT, JSON.stringify(engagementConfig));
        window.dispatchEvent(new CustomEvent(EVENT_ENGAGEMENT_UPDATED));
      }
    } catch {

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(0, 50)));
      }
    } catch {
      // ignore
    }
  }, [logs]);

  // Pricing & Subscription Config State
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(getPricingConfig);

  // Load the real server catalog; never seed customer pricing from local demo data.
  useEffect(() => {
    void loadPricingConfig().then(setPricingConfig).catch((err) => console.error("Failed to load pricing:", err));
  }, []);

  useEffect(() => {
    if (pricingConfig.packages.length || pricingConfig.vipPlans.length) void savePricingConfig(pricingConfig);
  }, [pricingConfig]);

  const addLog = (adminAction: string, details: string, targetUser?: string) => {
    const newLog: AdminActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      adminAction,
      details,
      targetUser,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Adjust User BC
  const adjustUserCoins = (userId: string, amount: number, reason: string) => {
    void (async () => {
      const { error } = await (supabase as any).rpc("admin_adjust_user_bc", { p_user_id: userId, p_amount: amount, p_reason: reason });
      if (error) { toast.error(error.message); return; }
      await loadRealUsers();
      toast.success("BC balance updated");
    })();
  };

  // Toggle Ban/Unban
  const toggleUserBan = (userId: string) => {
    void (async () => {
      const { error } = await (supabase as any).rpc("admin_toggle_user_ban", { p_user_id: userId });
      if (error) { toast.error(error.message); return; }
      await loadRealUsers();
      toast.success("User security status updated");
    })();
  };

  // Reset Streak
  const resetUserStreak = (userId: string) => {
    void (async () => {
      const { error } = await (supabase as any).rpc("admin_reset_user_streak", { p_user_id: userId });
      if (error) { toast.error(error.message); return; }
      await loadRealUsers();
      toast.success("Login streak reset to Day 1");
    })();
  };

  // Update Ad Configuration
  const updateAdConfig = (partial: Partial<AdPlacementConfig>) => {
    setAdConfig((prev) => {
      const updated = { ...prev, ...partial };
      return updated;
    });
    addLog("UPDATE_AD_CONFIG", "Updated ad monetization parameters");
    toast.success("Ad & monetization settings updated");
  };

  // Live server-backed ad inventory
  const addCreative = (creativeData: Omit<AdCreative, "id" | "impressions" | "clicks" | "createdAt">) => {
    void (async () => {
      const { data, error } = await (supabase as any).rpc("admin_upsert_ad_creative", {
        p_id: null,
        p_sponsor: creativeData.sponsor,
        p_headline: creativeData.headline,
        p_description: creativeData.description,
        p_tagline: "",
        p_image_url: creativeData.imageUrl ?? null,
        p_destination_url: creativeData.destinationUrl,
        p_video_url: null,
        p_poster_url: null,
        p_placement: creativeData.placement,
        p_format: "banner",
        p_category: creativeData.category,
        p_call_to_action: creativeData.callToAction,
        p_duration_seconds: 8,
        p_skip_after_seconds: 5,
        p_status: creativeData.status,
      });
      if (error) { toast.error(error.message); return; }
      const created: AdCreative = { ...creativeData, id: String(data), impressions: 0, clicks: 0, createdAt: new Date().toISOString() };
      setAdConfig((prev) => ({ ...prev, creatives: [created, ...(prev.creatives || [])] }));
      addLog("ADD_AD_CREATIVE", `Created live ad creative "${created.headline}" for ${created.placement}`);
      toast.success("Live ad creative added");
    })();
  };

  const updateCreative = (id: string, partial: Partial<AdCreative>) => {
    void (async () => {
      const current = adConfig.creatives.find((x) => x.id === id);
      if (!current) { toast.error("Ad creative not found"); return; }
      const next = { ...current, ...partial };
      const { error } = await (supabase as any).rpc("admin_upsert_ad_creative", {
        p_id: id, p_sponsor: next.sponsor, p_headline: next.headline, p_description: next.description,
        p_tagline: "", p_image_url: next.imageUrl ?? null, p_destination_url: next.destinationUrl,
        p_video_url: null, p_poster_url: null, p_placement: next.placement, p_format: "banner",
        p_category: next.category, p_call_to_action: next.callToAction, p_duration_seconds: 8,
        p_skip_after_seconds: 5, p_status: next.status,
      });
      if (error) { toast.error(error.message); return; }
      setAdConfig((prev) => ({ ...prev, creatives: (prev.creatives || []).map((x) => x.id === id ? next : x) }));
      toast.success("Live ad creative updated");
    })();
  };

  const toggleCreativeStatus = (id: string) => {
    const current = adConfig.creatives.find((x) => x.id === id);
    if (!current) return;
    updateCreative(id, { status: current.status === "active" ? "paused" : "active" });
  };

  const deleteCreative = (id: string) => {
    void (async () => {
      const { error } = await (supabase as any).rpc("admin_delete_ad_creative", { p_id: id });
      if (error) { toast.error(error.message); return; }
      setAdConfig((prev) => ({ ...prev, creatives: (prev.creatives || []).filter((x) => x.id !== id) }));
      addLog("DELETE_AD_CREATIVE", `Deleted live ad creative ${id}`);
      toast.success("Live ad creative removed");
    })();
  };

  // Update Sponsor Partner
  const toggleSponsorPartner = (partnerId: string) => {
    setAdConfig((prev) => ({
      ...prev,
      sponsorPartners: prev.sponsorPartners.map((p) =>
        p.id === partnerId ? { ...p, active: !p.active } : p,
      ),
    }));
    toast.success("Partner placement status toggled");
  };

  // Update Engagement Config
  const updateEngagementConfig = (partial: Partial<EngagementConfig>) => {
    setEngagementConfig((prev) => ({ ...prev, ...partial }));
    addLog("UPDATE_ENGAGEMENT_CONFIG", "Updated login bonus & engagement switches");
    toast.success("Engagement configurations saved and applied");
  };

  // Update External Survey Configuration
  const updateExternalSurveyConfig = (partial: Partial<ExternalSurveyConfig>) => {
    setEngagementConfig((prev) => {
      const updatedExternal = {
        ...prev.externalSurvey,
        ...partial,
      };
      return {
        ...prev,
        externalSurvey: updatedExternal,
      };
    });

    const isModeSwitch = "enabled" in partial;
    if (isModeSwitch) {
      addLog(
        "SWITCH_QUIZ_ENGINE",
        `Quiz engine switched to ${partial.enabled ? "External Partner API" : "Internal Manual Trivia"}`,
      );
      toast.success(
        partial.enabled
          ? "Switched to External Survey & Quiz Partner API"
          : "Switched to Internal Manual Trivia Questions",
      );
    } else {
      addLog("UPDATE_SURVEY_API", "Updated external quiz/survey API parameters");
      toast.success("External survey partner integration updated");
    }
  };

  // Export Users CSV
  const exportUsersCSV = () => {
    const headers = [
      "ID",
      "Username",
      "Platform",
      "Coins (BC)",
      "Streak",
      "Status",
      "Reputation",
      "Joined Date",
      "Email",
    ];
    const rows = users.map((u) => [
      u.id,
      u.username,
      u.platform,
      u.coins,
      u.streak,
      u.status,
      u.reputation,
      u.joinedDate,
      u.email || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `circle_panda_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("User directory exported to CSV");
  };

  // Pricing Configuration Actions
  const updateCoinPackage = (id: string, partial: Partial<CoinPackage>) => {
    setPricingConfig((prev) => {
      const packages = prev.packages.map((pkg) => (pkg.id === id ? { ...pkg, ...partial } : pkg));
      return { ...prev, packages };
    });
    addLog("COIN_PACKAGE_UPDATED", `Updated coin package ${id}`);
    toast.success("Coin package updated successfully");
  };

  const toggleCoinPackage = (id: string) => {
    setPricingConfig((prev) => {
      const target = prev.packages.find((p) => p.id === id);
      const newStatus = target ? !target.enabled : false;
      const packages = prev.packages.map((pkg) =>
        pkg.id === id ? { ...pkg, enabled: newStatus } : pkg,
      );
      return { ...prev, packages };
    });
    addLog("COIN_PACKAGE_TOGGLED", `Toggled coin package ${id}`);
    toast.success("Package visibility updated");
  };

  const addCoinPackage = (pkg: Omit<CoinPackage, "id">) => {
    const newId = `pkg_${Date.now()}`;
    const newPkg: CoinPackage = { ...pkg, id: newId };
    setPricingConfig((prev) => ({
      ...prev,
      packages: [...prev.packages, newPkg],
    }));
    addLog("COIN_PACKAGE_ADDED", `Added package ${newPkg.name} ($${newPkg.price})`);
    toast.success(`Package "${newPkg.name}" added`);
  };

  const deleteCoinPackage = (id: string) => {
    setPricingConfig((prev) => ({
      ...prev,
      packages: prev.packages.filter((p) => p.id !== id),
    }));
    addLog("COIN_PACKAGE_DELETED", `Deleted coin package ${id}`);
    toast.success("Coin package removed");
  };

  const updateVipPlan = (id: string, partial: Partial<VipPlan>) => {
    setPricingConfig((prev) => {
      const vipPlans = prev.vipPlans.map((plan) =>
        plan.id === id ? { ...plan, ...partial } : plan,
      );
      return { ...prev, vipPlans };
    });
    addLog("VIP_PLAN_UPDATED", `Updated VIP plan ${id}`);
    toast.success("VIP subscription plan updated");
  };

  const toggleVipPlan = (id: string) => {
    setPricingConfig((prev) => {
      const target = prev.vipPlans.find((p) => p.id === id);
      const newStatus = target ? !target.enabled : false;
      const vipPlans = prev.vipPlans.map((plan) =>
        plan.id === id ? { ...plan, enabled: newStatus } : plan,
      );
      return { ...prev, vipPlans };
    });
    addLog("VIP_PLAN_TOGGLED", `Toggled VIP plan ${id}`);
    toast.success("VIP plan visibility updated");
  };

  const addVipPlan = (plan: Omit<VipPlan, "id">) => {
    const newId = `vip_${Date.now()}`;
    const newPlan: VipPlan = { ...plan, id: newId };
    setPricingConfig((prev) => ({
      ...prev,
      vipPlans: [...prev.vipPlans, newPlan],
    }));
    addLog("VIP_PLAN_ADDED", `Added VIP plan ${newPlan.name} ($${newPlan.price})`);
    toast.success(`VIP plan "${newPlan.name}" added`);
  };

  const deleteVipPlan = (id: string) => {
    setPricingConfig((prev) => ({
      ...prev,
      vipPlans: prev.vipPlans.filter((p) => p.id !== id),
    }));
    addLog("VIP_PLAN_DELETED", `Deleted VIP plan ${id}`);
    toast.success("VIP plan removed");
  };

  const updatePaystackConfig = (partial: Partial<PaystackGatewayConfig>) => {
    setPricingConfig((prev) => ({
      ...prev,
      paystack: { ...prev.paystack, ...partial },
    }));
    addLog("PAYSTACK_CONFIG_UPDATED", `Updated Paystack settings`);
    toast.success("Paystack gateway settings updated");
  };

  const updateAndroidBridgeConfig = (partial: Partial<AndroidBridgeGatewayConfig>) => {
    setPricingConfig((prev) => ({
      ...prev,
      androidBridge: { ...prev.androidBridge, ...partial },
    }));
    addLog("ANDROID_BRIDGE_CONFIG_UPDATED", `Updated Android Bridge settings`);
    toast.success("Android Bridge settings updated");
  };

  const resetPricingConfigToDefault = () => {
    setPricingConfig(DEFAULT_PRICING_CONFIG);
    addLog("PRICING_RESET", "Reset tiered coin packages and VIP plans to defaults");
    toast.info("Pricing tiers reset to defaults");
  };

  // Reset to default mock data
  const resetToDefaultData = () => {
    void loadRealUsers();
    void loadPricingConfig().then(setPricingConfig);
    toast.success("Live admin data refreshed");
  };

  return {
    users,
    adConfig,
    adMetrics,
    engagementConfig,
    pricingConfig,
    logs,
    adjustUserCoins,
    toggleUserBan,
    resetUserStreak,
    updateAdConfig,
    addCreative,
    updateCreative,
    deleteCreative,
    toggleCreativeStatus,
    toggleSponsorPartner,
    updateEngagementConfig,
    updateExternalSurveyConfig,
    updateCoinPackage,
    toggleCoinPackage,
    addCoinPackage,
    deleteCoinPackage,
    updateVipPlan,
    toggleVipPlan,
    addVipPlan,
    deleteVipPlan,
    updatePaystackConfig,
    updateAndroidBridgeConfig,
    resetPricingConfigToDefault,
    exportUsersCSV,
    resetToDefaultData,
  };
}
