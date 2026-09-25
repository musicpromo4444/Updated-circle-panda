import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_AD_CONFIG,
  DEFAULT_ENGAGEMENT_CONFIG,
  EVENT_AD_CONFIG_UPDATED,
  EVENT_ENGAGEMENT_UPDATED,
  INITIAL_CREATIVES,
  STORAGE_KEY_AD_CONFIG,
  STORAGE_KEY_ENGAGEMENT,
} from "@/components/ads/adInventoryStorage";
import { getBonusConfig, saveBonusConfig } from "@/components/daily-bonus/dailyBonusStorage";
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

const INITIAL_USERS: AdminUser[] = [
  {
    id: "usr-001",
    username: "Chinedu_UniLag",
    avatar: "🐼",
    platform: "android_webview",
    coins: 480,
    streak: 3,
    status: "active",
    joinedDate: "2026-08-12",
    lastActive: "Just now",
    reputation: 92,
    email: "chinedu.o@unilag.edu.ng",
  },
  {
    id: "usr-002",
    username: "Amara_UI_Chic",
    avatar: "🦊",
    platform: "android_webview",
    coins: 1250,
    streak: 5,
    status: "active",
    joinedDate: "2026-07-28",
    lastActive: "12m ago",
    reputation: 164,
    email: "amara.k@gmail.com",
  },
  {
    id: "usr-003",
    username: "Tunde_DevCampus",
    avatar: "🦁",
    platform: "web_browser",
    coins: 310,
    streak: 2,
    status: "active",
    joinedDate: "2026-09-01",
    lastActive: "45m ago",
    reputation: 58,
    email: "tunde.coder@campus.ng",
  },
  {
    id: "usr-004",
    username: "Zainab_OAU",
    avatar: "🐯",
    platform: "android_webview",
    coins: 740,
    streak: 7,
    status: "active",
    joinedDate: "2026-08-04",
    lastActive: "2h ago",
    reputation: 120,
    email: "zainab.b@oau.edu.ng",
  },
  {
    id: "usr-005",
    username: "Burna_Vibes",
    avatar: "🐵",
    platform: "web_browser",
    coins: 90,
    streak: 1,
    status: "banned",
    joinedDate: "2026-09-10",
    lastActive: "Yesterday",
    reputation: 15,
    email: "burna_fan99@yahoo.com",
  },
  {
    id: "usr-006",
    username: "Favour_Covenant",
    avatar: "🐰",
    platform: "android_webview",
    coins: 620,
    streak: 3,
    status: "active",
    joinedDate: "2026-08-20",
    lastActive: "3h ago",
    reputation: 88,
    email: "favour.c@cu.edu.ng",
  },
  {
    id: "usr-007",
    username: "Kelechi_ABU",
    avatar: "🐻",
    platform: "web_browser",
    coins: 180,
    streak: 1,
    status: "active",
    joinedDate: "2026-09-08",
    lastActive: "5h ago",
    reputation: 40,
    email: "kelechi.abu@gmail.com",
  },
  {
    id: "usr-008",
    username: "Ngozi_UNN_Lioness",
    avatar: "🐨",
    platform: "android_webview",
    coins: 910,
    streak: 4,
    status: "active",
    joinedDate: "2026-07-15",
    lastActive: "1d ago",
    reputation: 145,
    email: "ngozi.lions@unn.edu.ng",
  },
  {
    id: "usr-009",
    username: "Spam_Bot_99",
    avatar: "🤖",
    platform: "web_browser",
    coins: 10,
    streak: 1,
    status: "banned",
    joinedDate: "2026-09-14",
    lastActive: "3d ago",
    reputation: 2,
    email: "botnet_temp@mail.ru",
  },
  {
    id: "usr-010",
    username: "Emeka_FUTMinna",
    avatar: "🦉",
    platform: "android_webview",
    coins: 390,
    streak: 3,
    status: "active",
    joinedDate: "2026-08-30",
    lastActive: "6h ago",
    reputation: 76,
    email: "emeka.eng@futminna.edu.ng",
  },
];

const INITIAL_AD_METRICS: AdPerformanceMetrics = {
  impressionsWeb: 142500,
  impressionsAndroid: 198300,
  revenueWeb: 428.5,
  revenueAndroid: 672.1,
  ctrWeb: 3.42,
  ctrAndroid: 4.88,
  fillRateWeb: 98.4,
  fillRateAndroid: 99.2,
  eCpmWeb: 1.85,
  eCpmAndroid: 2.45,
};

const INITIAL_AD_CONFIG: AdPlacementConfig = {
  dailyLoginPopupBanner: true,
  mainFeedBanner: true,
  feedBannerInterval: 4,
  videoAdCrushFrequency: 5,
  androidNativeBridgeEnabled: true,
  sponsorPartners: [
    {
      id: "sp-mtn",
      name: "MTN Pulse Campus",
      category: "Telecom / Data Bundles",
      headline: "Get 5GB Night & Weekend Data for ₦500",
      active: true,
      ctr: 4.85,
      clicks: 9617,
    },
    {
      id: "sp-chipper",
      name: "Chipper Cash",
      category: "Fintech / Student Banking",
      headline: "Send & Receive Campus Money Instant 0% Fees",
      active: true,
      ctr: 3.92,
      clicks: 7773,
    },
    {
      id: "sp-spotify",
      name: "Spotify Campus Sound",
      category: "Entertainment / Streaming",
      headline: "50% Off Premium for Verified University Students",
      active: true,
      ctr: 5.12,
      clicks: 10153,
    },
  ],
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
    const bonus = getBonusConfig();
    const defaults: EngagementConfig = {
      ...DEFAULT_ENGAGEMENT_CONFIG,
      standardDailyReward: bonus.standardReward || 10,
      streakMilestoneReward: bonus.streakReward || 50,
      streakMilestoneDays: bonus.streakMilestone || 3,
    };

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
      saveBonusConfig({
        standardReward: engagementConfig.standardDailyReward,
        streakReward: engagementConfig.streakMilestoneReward,
        streakMilestone: engagementConfig.streakMilestoneDays,
      });
    } catch {
      // ignore
    }
  }, [engagementConfig]);

  // Sync logs to storage
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

  // Sync pricingConfig to storage
  useEffect(() => {
    savePricingConfig(pricingConfig);
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
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newBal = Math.max(0, u.coins + amount);
          return { ...u, coins: newBal };
        }
        return u;
      }),
    );
    const user = users.find((u) => u.id === userId);
    addLog(
      "ADJUST_COINS",
      `${amount >= 0 ? "+" : ""}${amount} BC adjustment (${reason})`,
      user?.username,
    );
    toast.success(
      `Adjusted ${user?.username || "user"}'s balance by ${amount >= 0 ? "+" : ""}${amount} BC`,
      { description: `Reason: ${reason}` },
    );
  };

  // Toggle Ban/Unban
  const toggleUserBan = (userId: string) => {
    let nextStatus = "active";
    let targetName = "";
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          nextStatus = u.status === "active" ? "banned" : "active";
          targetName = u.username;
          return { ...u, status: nextStatus as "active" | "banned" };
        }
        return u;
      }),
    );
    addLog(
      nextStatus === "banned" ? "BAN_USER" : "UNBAN_USER",
      `Status changed to ${nextStatus.toUpperCase()}`,
      targetName,
    );
    toast.info(`${targetName} is now ${nextStatus.toUpperCase()}`);
  };

  // Reset Streak
  const resetUserStreak = (userId: string) => {
    let targetName = "";
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          targetName = u.username;
          return { ...u, streak: 1 };
        }
        return u;
      }),
    );
    addLog("RESET_STREAK", "Login streak reset to Day 1", targetName);
    toast.warning(`Reset login streak for ${targetName} to Day 1`);
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

  // Add Creative
  const addCreative = (
    creativeData: Omit<AdCreative, "id" | "impressions" | "clicks" | "createdAt">,
  ) => {
    const newCreative: AdCreative = {
      ...creativeData,
      id: `cr-${Date.now()}`,
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setAdConfig((prev) => ({
      ...prev,
      creatives: [newCreative, ...(prev.creatives || [])],
    }));

    addLog(
      "ADD_AD_CREATIVE",
      `Created ad creative "${newCreative.headline}" for ${newCreative.placement}`,
    );
    toast.success(`Creative "${newCreative.sponsor}" added to ${newCreative.placement}`);
  };

  // Update Creative
  const updateCreative = (id: string, partial: Partial<AdCreative>) => {
    setAdConfig((prev) => ({
      ...prev,
      creatives: (prev.creatives || []).map((c) => (c.id === id ? { ...c, ...partial } : c)),
    }));

    addLog("UPDATE_AD_CREATIVE", `Updated creative #${id}`);
    toast.success("Creative updated successfully");
  };

  // Toggle Creative Status
  const toggleCreativeStatus = (id: string) => {
    let targetTitle = "";
    let newStatus = "active";
    setAdConfig((prev) => ({
      ...prev,
      creatives: (prev.creatives || []).map((c) => {
        if (c.id === id) {
          newStatus = c.status === "active" ? "paused" : "active";
          targetTitle = c.sponsor;
          return { ...c, status: newStatus as "active" | "paused" };
        }
        return c;
      }),
    }));

    addLog(
      "TOGGLE_AD_CREATIVE",
      `Creative status changed to ${newStatus.toUpperCase()}`,
      targetTitle,
    );
    toast.info(`${targetTitle || "Creative"} is now ${newStatus.toUpperCase()}`);
  };

  // Delete Creative
  const deleteCreative = (id: string) => {
    let removedTitle = "";
    setAdConfig((prev) => {
      const target = (prev.creatives || []).find((c) => c.id === id);
      removedTitle = target?.sponsor || id;
      return {
        ...prev,
        creatives: (prev.creatives || []).filter((c) => c.id !== id),
      };
    });

    addLog("DELETE_AD_CREATIVE", `Deleted creative ${removedTitle}`);
    toast.success(`Removed creative: ${removedTitle}`);
  };

  // Toggle Sponsor Partner
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
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
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
    setUsers(INITIAL_USERS);
    setAdConfig(DEFAULT_AD_CONFIG);
    setEngagementConfig(DEFAULT_ENGAGEMENT_CONFIG);
    setPricingConfig(DEFAULT_PRICING_CONFIG);
    toast.info("Admin store reset to default data");
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
