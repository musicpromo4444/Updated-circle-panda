export type AdPlacementTarget =
  "popup_1_daily_login" | "popup_1_daily_login_bottom" | "popup_2_engagement" | "main_feed_card" | "speed_dating_interstitial" | "crush_native" | "crush_interstitial" | "crush_popup" | "crush_banner" | "crush_playable" | "seven_day_banner" | "seven_day_playable" | "hot_seat_comments" | "hot_seat_questions" | "hot_seat_water_break" | "events_inline" | "sweepstakes_inline" | "live_inline" | "music_time_top" | "music_time_bottom" | "audio_time_top" | "audio_time_bottom" | "video_preroll" | "video_postroll" | "music_time_inline" | "profile_inline" | "leaders_inline" | "notifications_inline" | "home_inline" | "confessions_inline" | "groups_inline" | "messages_inline" | "dating_inline" | "secret_profile_slot_1" | "secret_profile_slot_2" | "secret_profile_slot_3" | "secret_profile_slot_4";

export interface BannerAdData {
  id: string;
  sponsor: string;
  headline: string;
  description: string;
  category?: string;
  rating?: number;
  callToAction: string;
  ctaUrl?: string;
  badge?: string;
  iconBg?: string;
  iconEmoji?: string;
  imageUrl?: string;
}

export interface VideoAdData {
  id: string;
  sponsor: string;
  headline: string;
  tagline: string;
  callToAction: string;
  ctaUrl?: string;
  durationSeconds: number;
  skipAfterSeconds: number;
  videoUrl: string;
  posterUrl?: string;
  category?: string;
}

export type AdCreativeFormat = "banner" | "native" | "sponsor" | "playable" | "interstitial" | "rewarded" | "offerwall" | "link";

export interface AdCreative {
  id: string;
  sponsor: string;
  headline: string;
  description: string;
  imageUrl?: string;
  posterUrl?: string;
  videoUrl?: string;
  tagline?: string;
  durationSeconds?: number;
  skipAfterSeconds?: number;
  destinationUrl: string;
  placement: AdPlacementTarget;
  format?: AdCreativeFormat;
  category: string;
  callToAction: string;
  status: "active" | "paused";
  impressions: number;
  clicks: number;
  createdAt: string;
}

export interface AdPlacementConfig {
  dailyLoginPopupBanner: boolean;
  mainFeedBanner: boolean;
  feedBannerInterval: number;
  videoAdCrushFrequency: number;
  androidNativeBridgeEnabled: boolean;
  hotSeatCommentsAdsEnabled?: boolean;
  hotSeatQuestionsAdsEnabled?: boolean;
  hotSeatWaterBreakAdsEnabled?: boolean;
  sponsorPartners: { id: string; name: string; category: string; headline: string; active: boolean; ctr: number; clicks: number }[];
  creatives: AdCreative[];
}

export type ExternalSurveyProvider = "tapresearch" | "pollfish" | "bitlabs" | "custom";
export type SurveyIntegrationMode = "iframe_overlay" | "external_redirect" | "native_bridge";

export interface ExternalSurveyConfig {
  enabled: boolean;
  provider: ExternalSurveyProvider;
  providerName: string;
  apiKey: string;
  endpointUrl: string;
  integrationMode: SurveyIntegrationMode;
  rewardBc: number;
  screenoutRewardBc: number;
  dailySurveyCap: number;
  surveyTopicFilter: string;
}

export interface EngagementConfig {
  standardDailyReward: number;
  streakMilestoneReward: number;
  streakMilestoneDays: number;
  freeSpinsActive: boolean;
  dailyQuizzesActive: boolean;
  hotSeatActive: boolean;
  crushSwipesActive: boolean;
  quizQuestion: string;
  quizOptions: string[];
  quizCorrectIndex: number;
  quizRewardBc: number;
  externalSurvey: ExternalSurveyConfig;
}
