export type UserPlatform = "android_webview" | "web_browser";
export type UserStatus = "active" | "banned";

export interface AdminUser {
  id: string;
  username: string;
  avatar: string;
  platform: UserPlatform;
  coins: number;
  streak: number;
  status: UserStatus;
  joinedDate: string;
  lastActive: string;
  reputation: number;
  email?: string;
}

export interface AdPerformanceMetrics {
  impressionsWeb: number;
  impressionsAndroid: number;
  revenueWeb: number;
  revenueAndroid: number;
  ctrWeb: number; // percentage e.g. 3.4
  ctrAndroid: number; // percentage e.g. 4.8
  fillRateWeb: number; // percentage e.g. 98.2
  fillRateAndroid: number; // percentage e.g. 99.1
  eCpmWeb: number; // e.g. $1.85
  eCpmAndroid: number; // e.g. $2.40
}

export type AdPlacementTarget =
  "popup_1_daily_login" | "popup_2_engagement" | "main_feed_card" | "speed_dating_interstitial";

export interface AdCreative {
  id: string;
  sponsor: string;
  headline: string;
  description: string;
  imageUrl?: string;
  destinationUrl: string;
  placement: AdPlacementTarget;
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
  feedBannerInterval: number; // inject ad every N items
  videoAdCrushFrequency: number; // every N swipes
  androidNativeBridgeEnabled: boolean; // use Android interface or URL fallback
  sponsorPartners: {
    id: string;
    name: string;
    category: string;
    headline: string;
    active: boolean;
    ctr: number;
    clicks: number;
  }[];
  creatives: AdCreative[];
}

export type ExternalSurveyProvider = "tapresearch" | "pollfish" | "bitlabs" | "custom";
export type SurveyIntegrationMode = "iframe_overlay" | "external_redirect" | "native_bridge";

export interface ExternalSurveyConfig {
  enabled: boolean; // true = use external partner survey/wall; false = internal trivia
  provider: ExternalSurveyProvider;
  providerName: string;
  apiKey: string;
  endpointUrl: string; // iframe or redirect URL
  integrationMode: SurveyIntegrationMode;
  rewardBc: number; // payout BC amount for completing survey
  screenoutRewardBc: number; // compensation even if screened out
  dailySurveyCap: number; // max per day
  surveyTopicFilter: string; // e.g. "Student Lifestyle, Tech & Career"
}

export interface EngagementConfig {
  standardDailyReward: number; // default 10 BC
  streakMilestoneReward: number; // default 50 BC
  streakMilestoneDays: number; // default 3 days
  // Popup 2 & App Mini-Feature switches
  freeSpinsActive: boolean;
  dailyQuizzesActive: boolean;
  hotSeatActive: boolean;
  crushSwipesActive: boolean;
  // Active daily quiz
  quizQuestion: string;
  quizOptions: string[];
  quizCorrectIndex: number;
  quizRewardBc: number;
  // External Quiz & Survey API Integrations
  externalSurvey: ExternalSurveyConfig;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  adminAction: string;
  targetUser?: string;
  details: string;
}

// ==========================================
// TIERED PRICING & SUBSCRIPTION SCHEMA
// ==========================================

export interface CoinPackage {
  id: string;
  name: string;
  price: number; // in USD (e.g. 0.50, 1.00, 2.50, 5.00)
  coins: number; // in BC (e.g. 1000, 2000, 5500, 12000)
  bonusTag?: string; // e.g. "Standard anchor price", "Includes scaling bonus value", "Highest bonus value tag"
  description: string;
  badge?: string;
  enabled: boolean;
  isPopular?: boolean;
  isBestValue?: boolean;
  icon?: string;
}

export interface VipPlan {
  id: string;
  name: string;
  price: number; // in USD (e.g. 1.00, 3.00)
  interval: "week" | "month";
  durationDays: number; // 7 for week, 30 for month
  billingPeriod: string; // e.g. "per week", "per month"
  description: string;
  badge?: string; // e.g. "Better Long-Term Value"
  isHighlighted: boolean;
  enabled: boolean;
  perks: string[];
}

export interface PaystackGatewayConfig {
  publicKey: string;
  currency: "USD" | "NGN";
  exchangeRateNgn: number; // e.g. 1500 NGN per USD
  testMode: boolean;
  merchantName: string;
}

export interface AndroidBridgeGatewayConfig {
  enabled: boolean;
  bridgeInterfaceName: string; // "AndroidBridge" or "Android"
  fallbackToBrowser: boolean;
  sandboxCheckoutUrl: string;
}

export interface PricingConfig {
  packages: CoinPackage[];
  vipPlans: VipPlan[];
  paystack: PaystackGatewayConfig;
  androidBridge: AndroidBridgeGatewayConfig;
  lastUpdated?: string;
}
