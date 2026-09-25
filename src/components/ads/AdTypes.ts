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

export const SAMPLE_BANNER_ADS: BannerAdData[] = [
  {
    id: "banner-admob-1",
    sponsor: "Duolingo",
    headline: "Learn Spanish in 5 mins/day",
    description: "The world's #1 fun, free language learning app with bite-sized lessons.",
    category: "Education · 4.8 ★",
    rating: 4.8,
    callToAction: "Install Now",
    badge: "Ad · AdMob",
    iconBg: "bg-emerald-500",
    iconEmoji: "🦉",
  },
  {
    id: "banner-admob-2",
    sponsor: "Spotify",
    headline: "3 Months of Premium Free",
    description: "Millions of songs & podcasts offline and ad-free. Cancel anytime.",
    category: "Music & Audio · 4.7 ★",
    rating: 4.7,
    callToAction: "Claim Offer",
    badge: "Ad · GAM",
    iconBg: "bg-green-600",
    iconEmoji: "🎵",
  },
  {
    id: "banner-admob-3",
    sponsor: "Uber Eats",
    headline: "$15 off your first 2 orders",
    description: "Late night cravings? Get your favorite local restaurants delivered fast.",
    category: "Food & Drink · 4.9 ★",
    rating: 4.9,
    callToAction: "Order Now",
    badge: "Ad · Google",
    iconBg: "bg-black",
    iconEmoji: "🍔",
  },
  {
    id: "banner-admob-4",
    sponsor: "NordVPN",
    headline: "Shield your mobile browsing",
    description: "Ultra-fast encrypted security with threat protection across all devices.",
    category: "Security · 4.8 ★",
    rating: 4.8,
    callToAction: "Get 70% Off",
    badge: "Ad · AdMob",
    iconBg: "bg-blue-600",
    iconEmoji: "🛡️",
  },
  {
    id: "banner-admob-5",
    sponsor: "Revolut",
    headline: "Zero-fee international transfers",
    description: "Send, spend, and invest with high yield vault savings on autopilot.",
    category: "Finance · 4.9 ★",
    rating: 4.9,
    callToAction: "Get Account",
    badge: "Ad · GAM",
    iconBg: "bg-purple-600",
    iconEmoji: "💳",
  },
];

export const SAMPLE_VIDEO_ADS: VideoAdData[] = [
  {
    id: "video-ad-1",
    sponsor: "Monopoly GO!",
    headline: "Roll, Build & Heist Your Friends!",
    tagline: "Join millions of players in the #1 casual mobile board game.",
    callToAction: "Play Free",
    durationSeconds: 8,
    skipAfterSeconds: 5,
    videoUrl: "https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4",
    category: "Games · 4.9 ★",
  },
  {
    id: "video-ad-2",
    sponsor: "Fintech Cash Card",
    headline: "Get 5% Instant Cashback Everywhere",
    tagline: "No annual fees. Instant virtual cards for iOS & Android.",
    callToAction: "Claim $25 Bonus",
    durationSeconds: 9,
    skipAfterSeconds: 5,
    videoUrl: "https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4",
    category: "Finance · 4.8 ★",
  },
  {
    id: "video-ad-3",
    sponsor: "Genshin Impact",
    headline: "Step into an Open World Adventure",
    tagline: "Massive updates, new characters, and cross-platform co-op play.",
    callToAction: "Install Free",
    durationSeconds: 10,
    skipAfterSeconds: 5,
    videoUrl: "https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4",
    category: "Action RPG · 4.7 ★",
  },
];

export const VIDEO_ADS = SAMPLE_VIDEO_ADS;
export const BANNER_ADS = SAMPLE_BANNER_ADS;
