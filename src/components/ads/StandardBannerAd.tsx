import { useEffect, useState } from "react";
import { ExternalLink, Info, X } from "lucide-react";
import { toast } from "sonner";
import { useActiveAdCreative } from "./adInventoryStorage";
import { SAMPLE_BANNER_ADS, type BannerAdData } from "./AdTypes";
import { notifyAdEvent, openAdExternalUrl } from "./platformAdBridge";

export interface StandardBannerAdProps {
  index?: number;
  adData?: BannerAdData;
  className?: string;
  variant?: "inline" | "card" | "compact";
}

/**
 * Platform-Agnostic Banner Advertisement Component.
 *
 * Designed for universal execution across:
 * - Desktop and mobile web browsers (Safari, Chrome, Firefox)
 * - Packaged Android WebViews (Cordova, Capacitor, React Native WebView, Custom Android WebSettings)
 *
 * Key Cross-Platform Features:
 * 1. Safe Navigation: Uses openAdExternalUrl() to trigger native Android ACTION_VIEW intents
 *    when running inside WebViews, avoiding SPA session loss.
 * 2. Touch Friendliness: Minimum 44px touch targets on mobile for touch accessibility.
 * 3. Fluid Responsive Sizing: CSS clamp() and flex-wrap prevent layout clipping on narrow mobile screens.
 * 4. Error Resilience: Missing images, network drops, or blocked ad scripts will not throw runtime exceptions.
 * 5. Admin Live Synchronization: Directly connects to Admin Ad Creative Inventory for immediate updates.
 */
export function StandardBannerAd({
  index = 0,
  adData,
  className = "",
  variant = "card",
}: StandardBannerAdProps) {
  const [closed, setClosed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Live admin creative hook for in-feed ads
  const liveAdminCreative = useActiveAdCreative("main_feed_card");

  // Format admin creative as BannerAdData if active
  const adminAdData: BannerAdData | null = liveAdminCreative
    ? {
        id: liveAdminCreative.id,
        sponsor: liveAdminCreative.sponsor,
        headline: liveAdminCreative.headline,
        description: liveAdminCreative.description || "",
        category: liveAdminCreative.category || "Sponsored Partner",
        rating: 4.9,
        callToAction: liveAdminCreative.callToAction || "Learn More",
        ctaUrl: liveAdminCreative.destinationUrl,
        imageUrl: liveAdminCreative.imageUrl,
        badge: "Ad · Partner",
        iconEmoji: "⭐",
      }
    : null;

  // Deterministically select an ad from the catalog if not provided
  const ad = adData ?? adminAdData ?? SAMPLE_BANNER_ADS[Math.abs(index) % SAMPLE_BANNER_ADS.length];

  // Report ad impression on mount
  useEffect(() => {
    if (!closed && ad) {
      notifyAdEvent("impression", { adId: ad.id, format: "banner" });
    }
  }, [ad, closed]);

  if (closed || !ad) return null;

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    notifyAdEvent("click", { adId: ad.id, format: "banner" });
    toast.success(`Opening ${ad.sponsor}`, {
      description: "Sponsored partner link opened in external browser.",
    });
    openAdExternalUrl(ad.ctaUrl, ad.sponsor);
  };

  return (
    <aside
      role="complementary"
      aria-label={`Sponsored: ${ad.sponsor}`}
      className={`relative w-full max-w-full overflow-hidden transition-all duration-200 ${className}`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-sm backdrop-blur-sm sm:p-4 ${
          variant === "compact" ? "py-2.5" : ""
        }`}
        style={{
          // Use CSS clamp for smooth proportional scaling across mobile (320px) to desktop (1440px)
          fontSize: "clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)",
        }}
      >
        {/* Top Header: Ad disclosure badge and AdChoices popup trigger */}
        <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 text-[11px] text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
              Ad
            </span>
            <span className="truncate font-semibold text-foreground">{ad.sponsor}</span>
            {ad.category ? (
              <span className="hidden truncate text-muted-foreground/80 sm:inline">
                · {ad.category}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="flex min-h-[32px] items-center gap-1 px-1 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Ad choices & privacy disclosure"
              aria-label="Google Ad choices info"
            >
              <Info className="size-3.5" />
              <span className="hidden text-[10px] sm:inline">AdChoices</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setClosed(true);
                toast.info("Ad dismissed");
              }}
              className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Close advertisement"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Ad choices information toggle */}
        {showInfo ? (
          <div className="mb-2.5 rounded-xl bg-secondary/80 p-2.5 text-[11px] text-muted-foreground transition-all">
            <p className="font-semibold text-foreground">Verified Partner Placement</p>
            <p className="mt-0.5 leading-relaxed">
              Safe cross-platform ad container. Optimized for web browsers and native Android
              WebView without collecting intrusive device identifiers.
            </p>
          </div>
        ) : null}

        {/* Main Ad Content: Responsive Flex Container */}
        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          {/* Brand/Product Emoji or Icon Graphic */}
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-xl text-2xl shadow-inner ${
              ad.iconBg ?? "bg-primary"
            }`}
            aria-hidden="true"
          >
            {ad.iconEmoji ?? "✨"}
          </div>

          {/* Headline & Description */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground tracking-tight sm:text-base">
              {ad.headline}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {ad.description}
            </p>
          </div>

          {/* Call To Action Button with Safe External Launcher */}
          <div className="w-full shrink-0 pt-1 sm:w-auto sm:pt-0">
            <button
              type="button"
              onClick={handleCtaClick}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-98 sm:w-auto"
            >
              <span>{ad.callToAction}</span>
              <ExternalLink className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
