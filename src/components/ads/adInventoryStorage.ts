import { useEffect, useState } from "react";
import {
  type AdCreative,
  type AdPlacementConfig,
  type AdPlacementTarget,
  type EngagementConfig,
  type ExternalSurveyConfig,
} from "@/components/admin/adminTypes";

export const STORAGE_KEY_AD_CONFIG = "cp_admin_ad_config";
export const STORAGE_KEY_ENGAGEMENT = "cp_admin_engagement_config";
export const EVENT_AD_CONFIG_UPDATED = "cp_ad_config_updated";
export const EVENT_ENGAGEMENT_UPDATED = "cp_engagement_updated";

export const DEFAULT_EXTERNAL_SURVEY: ExternalSurveyConfig = {
  enabled: false,
  provider: "tapresearch",
  providerName: "TapResearch Campus Survey Wall",
  apiKey: "tr_live_sec_8923a10",
  endpointUrl: "https://wall.tapresearch.com/surveys?user_id=cp_user_current&app_id=circle_panda",
  integrationMode: "iframe_overlay",
  rewardBc: 35,
  screenoutRewardBc: 5,
  dailySurveyCap: 3,
  surveyTopicFilter: "Student Lifestyle, Campus Tech & Career",
};

export const INITIAL_CREATIVES: AdCreative[] = [
  {
    id: "cr-popup1-mtn",
    sponsor: "MTN Pulse Campus",
    headline: "Get 5GB Night & Weekend Data for ₦500",
    description:
      "Special student bundles on Circle Panda. Keep chatting uninterrupted without breaking the bank.",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    destinationUrl: "https://www.mtn.ng/pulse",
    placement: "popup_1_daily_login",
    category: "Telecom / Data Bundles",
    callToAction: "Get Bundle",
    status: "active",
    impressions: 48210,
    clicks: 3410,
    createdAt: "2026-09-01",
  },
  {
    id: "cr-popup2-chipper",
    sponsor: "Chipper Cash",
    headline: "Free ₦1,000 Welcome Bonus on Student Signup",
    description:
      "Send pocket money to roommates with 0% transfer fee and get virtual dollar debit cards.",
    imageUrl:
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
    destinationUrl: "https://chippercash.com",
    placement: "popup_2_engagement",
    category: "Fintech / Student Banking",
    callToAction: "Claim ₦1,000",
    status: "active",
    impressions: 29400,
    clicks: 1845,
    createdAt: "2026-09-05",
  },
  {
    id: "cr-feed-spotify",
    sponsor: "Spotify Campus Sound",
    headline: "3 Months Spotify Premium Free for Students",
    description:
      "Millions of songs & podcasts offline and ad-free during study sessions and campus parties.",
    imageUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    destinationUrl: "https://www.spotify.com/student",
    placement: "main_feed_card",
    category: "Entertainment / Music",
    callToAction: "Try 3 Months Free",
    status: "active",
    impressions: 61850,
    clicks: 4320,
    createdAt: "2026-09-08",
  },
  {
    id: "cr-feed-duolingo",
    sponsor: "Duolingo",
    headline: "Learn French, Spanish or German in 5 Mins/Day",
    description: "Join over 500 million learners. Boost your career CV with language badges.",
    imageUrl:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80",
    destinationUrl: "https://www.duolingo.com",
    placement: "main_feed_card",
    category: "Education / Languages",
    callToAction: "Install Free App",
    status: "active",
    impressions: 34120,
    clicks: 2190,
    createdAt: "2026-09-10",
  },
  {
    id: "cr-speeddating-redbull",
    sponsor: "Red Bull Campus Clash",
    headline: "Fuel Your Study & Dating Nights · Gives You Wings",
    description:
      "Check out campus gaming tournaments and speed dating parties powered by Red Bull.",
    imageUrl:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
    destinationUrl: "https://www.redbull.com",
    placement: "speed_dating_interstitial",
    category: "Energy Drinks / Lifestyle",
    callToAction: "Explore Events",
    status: "active",
    impressions: 18900,
    clicks: 1410,
    createdAt: "2026-09-12",
  },
];

export const DEFAULT_AD_CONFIG: AdPlacementConfig = {
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
  creatives: INITIAL_CREATIVES,
};

export const DEFAULT_ENGAGEMENT_CONFIG: EngagementConfig = {
  standardDailyReward: 10,
  streakMilestoneReward: 50,
  streakMilestoneDays: 3,
  freeSpinsActive: true,
  dailyQuizzesActive: true,
  hotSeatActive: true,
  crushSwipesActive: true,
  quizQuestion: "What is the official currency of the Circle Panda ecosystem?",
  quizOptions: ["Panda Points", "Black Coins (BC)", "Bamboo Credits", "Gold Nuggets"],
  quizCorrectIndex: 1,
  quizRewardBc: 15,
  externalSurvey: DEFAULT_EXTERNAL_SURVEY,
};

export function getLiveAdPlacementConfig(): AdPlacementConfig {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_AD_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
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
    // fallback
  }
  return DEFAULT_AD_CONFIG;
}

export function getLiveEngagementConfig(): EngagementConfig {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_ENGAGEMENT);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_ENGAGEMENT_CONFIG,
          ...parsed,
          externalSurvey: {
            ...DEFAULT_EXTERNAL_SURVEY,
            ...(parsed.externalSurvey || {}),
          },
        };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_ENGAGEMENT_CONFIG;
}

export function getActiveCreativeForPlacement(placement: AdPlacementTarget): AdCreative | null {
  const config = getLiveAdPlacementConfig();

  // Placement master switch checks
  if (placement === "popup_1_daily_login" && !config.dailyLoginPopupBanner) {
    return null;
  }
  if (placement === "main_feed_card" && !config.mainFeedBanner) {
    return null;
  }

  const matches = (config.creatives || []).filter(
    (c) => c.placement === placement && c.status === "active",
  );

  if (matches.length === 0) {
    // Check fallback from INITIAL_CREATIVES if present
    const fallback = INITIAL_CREATIVES.find(
      (c) => c.placement === placement && c.status === "active",
    );
    return fallback || null;
  }

  return matches[0];
}

/**
 * React hook to reactively subscribe to active ad creative changes for a target placement
 */
export function useActiveAdCreative(placement: AdPlacementTarget) {
  const [creative, setCreative] = useState<AdCreative | null>(() => {
    // Return server-safe initial creative to guarantee hydration match
    const fallback = INITIAL_CREATIVES.find(
      (c) => c.placement === placement && c.status === "active",
    );
    return fallback || null;
  });

  useEffect(() => {
    // Sync with localStorage after hydration
    setCreative(getActiveCreativeForPlacement(placement));

    const handleUpdate = () => {
      setCreative(getActiveCreativeForPlacement(placement));
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENT_AD_CONFIG_UPDATED, handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENT_AD_CONFIG_UPDATED, handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, [placement]);

  return creative;
}

/**
 * React hook to reactively subscribe to live engagement & survey configurations
 */
export function useLiveEngagementConfig() {
  const [config, setConfig] = useState<EngagementConfig>(DEFAULT_ENGAGEMENT_CONFIG);

  useEffect(() => {
    // Sync with localStorage after hydration
    setConfig(getLiveEngagementConfig());

    const handleUpdate = () => {
      setConfig(getLiveEngagementConfig());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENT_ENGAGEMENT_UPDATED, handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENT_ENGAGEMENT_UPDATED, handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, []);

  return config;
}
