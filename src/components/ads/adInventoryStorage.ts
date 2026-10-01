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
  hotSeatCommentsAdsEnabled: true,
  hotSeatQuestionsAdsEnabled: true,
  hotSeatWaterBreakAdsEnabled: false,
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

const UNIVERSAL_PLACEMENT_MAP: Partial<Record<AdPlacementTarget, string>> = {
  popup_1_daily_login: "login_top",
  popup_1_daily_login_bottom: "login_bottom",
  popup_2_engagement: "daily_reward",
  main_feed_card: "main_feed",
  seven_day_banner: "activities",
  seven_day_playable: "activities",
  hot_seat_comments: "hot_seat",
  hot_seat_questions: "hot_seat",
  hot_seat_water_break: "hot_seat",
  crush_native: "wcw_mcm_native",
  crush_interstitial: "wcw_mcm_interstitial",
  crush_popup: "wcw_mcm_popup",
  crush_banner: "wcw_mcm_banner",
  crush_playable: "wcw_mcm_playable",
  speed_dating_interstitial: "dating",
  events_inline: "events_inline",
  sweepstakes_inline: "sweepstakes_inline",
  live_inline: "live_inline",
  music_time_top: "music_time_top",
  music_time_bottom: "music_time_bottom",
  audio_time_top: "audio_time_top",
  audio_time_bottom: "audio_time_bottom",
  video_preroll: "video_preroll",
  video_postroll: "video_postroll",
  music_time_inline: "music_time_inline",
  profile_inline: "profile_inline",
  leaders_inline: "leaders_inline",
  notifications_inline: "notifications_inline",
  confessions_inline: "confessions_inline",
  groups_inline: "groups_inline",
  messages_inline: "messages_inline",
  dating_inline: "dating_inline",
  secret_profile_slot_1: "secret_profile_slot_1",
  secret_profile_slot_2: "secret_profile_slot_2",
  secret_profile_slot_3: "secret_profile_slot_3",
  secret_profile_slot_4: "secret_profile_slot_4",
};

export function useActiveAdCreative(placement: AdPlacementTarget) {
  const [creative, setCreative] = useState<AdCreative | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [legacyResult, universalResult] = await Promise.all([
        (supabase as any).rpc("get_ad_runtime_config"),
        (supabase as any).rpc("get_universal_ad_runtime_config"),
      ]);
      if (cancelled) return;
      const { data, error } = legacyResult;
      if (error) return;

      const config = data?.config || {};
      const legacyEnabled =
        placement === "popup_1_daily_login" ? config.daily_login_popup_banner !== false :
        placement === "popup_1_daily_login_bottom" ? config.daily_login_popup_banner !== false :
        placement === "popup_2_engagement" ? config.engagement_popup_banner !== false :
        placement === "main_feed_card" ? config.main_feed_banner !== false :
        placement === "seven_day_banner" ? config.seven_day_banner_enabled !== false :
        placement === "seven_day_playable" ? config.seven_day_playable_enabled !== false :
        placement === "hot_seat_comments" ? config.hot_seat_comments_ads_enabled !== false :
        placement === "hot_seat_questions" ? config.hot_seat_questions_ads_enabled !== false :
        placement === "hot_seat_water_break" ? config.hot_seat_water_break_ads_enabled === true : true;

      const universalKey = UNIVERSAL_PLACEMENT_MAP[placement];
      const universalPlacements = Array.isArray(universalResult?.data?.placements) ? universalResult.data.placements : [];
      const universalPlacement = universalKey ? universalPlacements.find((p: any) => p.placement_key === universalKey) : null;

      // The Universal Ad System is now the live master switch for every mapped placement.
      // If its RPC is unavailable, legacy admin controls remain the safe fallback.
      const universalEnabled = universalResult?.error
        ? true
        : universalPlacement
          ? universalPlacement.enabled !== false
          : true;

      if (!legacyEnabled || !universalEnabled) { setCreative(null); return; }

      const rows = Array.isArray(data?.creatives) ? data.creatives : [];
      const matches = rows.filter((row: any) => row.placement === placement && row.status === "active");
      if (!matches.length) { setCreative(null); return; }
      const previousKey = `cp_last_ad_${placement}`;
      const previous = sessionStorage.getItem(previousKey);
      const candidates = matches.length > 1 ? matches.filter((row: any) => row.id !== previous) : matches;
      const match = candidates[Math.floor(Math.random() * candidates.length)] ?? matches[0];
      sessionStorage.setItem(previousKey, match.id);
      setCreative({
        id: match.id, sponsor: match.sponsor, headline: match.headline,
        description: match.description || "", imageUrl: match.image_url || undefined,
        posterUrl: match.poster_url || undefined, videoUrl: match.video_url || undefined,
        tagline: match.tagline || undefined, durationSeconds: match.duration_seconds || 8,
        skipAfterSeconds: match.skip_after_seconds ?? 5, destinationUrl: match.destination_url || "",
        placement: match.placement, format: match.format || undefined, category: match.category || "Sponsored Partner",
        callToAction: match.call_to_action || "Learn More", status: match.status,
        impressions: 0, clicks: 0, createdAt: match.created_at || new Date().toISOString(),
      });
    };
    void load();
    return () => { cancelled = true; };
  }, [placement]);
  return creative;
}
