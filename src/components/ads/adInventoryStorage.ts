import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdCreative, AdPlacementTarget } from "@/components/ads/AdTypes";

export const INITIAL_CREATIVES: AdCreative[] = [];
export const DEFAULT_AD_CONFIG = {
  dailyLoginPopupBanner: true,
  mainFeedBanner: true,
  feedBannerInterval: 4,
  videoAdCrushFrequency: 5,
  androidNativeBridgeEnabled: true,
  sponsorPartners: [],
  creatives: INITIAL_CREATIVES,
};
export const DEFAULT_ENGAGEMENT_CONFIG = {
  standardDailyReward: 10,
  streakMilestoneReward: 50,
  streakMilestoneDays: 3,
  freeSpinsActive: true,
  dailyQuizzesActive: true,
  hotSeatActive: true,
  crushSwipesActive: true,
  quizQuestion: "",
  quizOptions: [],
  quizCorrectIndex: 0,
  quizRewardBc: 10,
  externalSurvey: {
    enabled: false,
    provider: "custom",
    providerName: "",
    apiKey: "",
    endpointUrl: "",
    integrationMode: "external_redirect",
    rewardBc: 10,
    screenoutRewardBc: 1,
    dailySurveyCap: 3,
    surveyTopicFilter: "",
  },
};
export const EVENT_AD_CONFIG_UPDATED = "cp-ad-config-updated";
export const EVENT_ENGAGEMENT_UPDATED = "cp-engagement-updated";
export const STORAGE_KEY_AD_CONFIG = "cp_ad_config";
export const STORAGE_KEY_ENGAGEMENT = "cp_engagement_config";

export function useActiveAdCreative(placement: AdPlacementTarget) {
  const [creative, setCreative] = useState<AdCreative | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await (supabase as any).rpc("get_ad_runtime_config");
      if (cancelled || error) return;
      const config = data?.config || {};
      const enabled =
        placement === "popup_1_daily_login" ? config.daily_login_popup_banner !== false :
        placement === "popup_1_daily_login_bottom" ? config.daily_login_popup_banner !== false :
        placement === "popup_2_engagement" ? config.engagement_popup_banner !== false :
        placement === "main_feed_card" ? config.main_feed_banner !== false :
        placement === "seven_day_banner" ? config.seven_day_banner_enabled !== false :
        placement === "seven_day_playable" ? config.seven_day_playable_enabled !== false : true;
      if (!enabled) { setCreative(null); return; }
      const rows = Array.isArray(data?.creatives) ? data.creatives : [];
      const match = rows.find((row: any) => row.placement === placement && row.status === "active");
      if (!match) { setCreative(null); return; }
      setCreative({
        id: match.id, sponsor: match.sponsor, headline: match.headline,
        description: match.description || "", imageUrl: match.image_url || undefined,
        posterUrl: match.poster_url || undefined, videoUrl: match.video_url || undefined,
        tagline: match.tagline || undefined, durationSeconds: match.duration_seconds || 8,
        skipAfterSeconds: match.skip_after_seconds ?? 5, destinationUrl: match.destination_url || "",
        placement: match.placement, category: match.category || "Sponsored Partner",
        callToAction: match.call_to_action || "Learn More", status: match.status,
        impressions: 0, clicks: 0, createdAt: match.created_at || new Date().toISOString(),
      });
    };
    void load();
    return () => { cancelled = true; };
  }, [placement]);
  return creative;
}
