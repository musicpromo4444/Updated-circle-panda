import { useEffect, useState } from "react";
import { ExternalLink, Info, X } from "lucide-react";
import { toast } from "sonner";
import { useActiveAdCreative } from "./adInventoryStorage";
import type { BannerAdData } from "./AdTypes";
import { notifyAdEvent, openAdExternalUrl } from "./platformAdBridge";

export interface StandardBannerAdProps {
  index?: number;
  adData?: BannerAdData;
  className?: string;
  variant?: "inline" | "card" | "compact" | "feed-card";
  placement?: import("@/components/ads/AdTypes").AdPlacementTarget;
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
  placement = "main_feed_card",
}: StandardBannerAdProps) {
  const [closed, setClosed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Live admin creative hook for in-feed ads
  const liveAdminCreative = useActiveAdCreative(placement);

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

  // Production: creatives come from the server inventory. A caller may pass a server-resolved creative explicitly.
  const ad = adData ?? adminAdData;

  const telemetryFormat = placement === "crush_native" || (placement.endsWith("_inline") && placement !== "messages_inline") ? "native" : "banner";

  // Report ad impression on mount
  useEffect(() => {
    if (!closed && ad) {
      notifyAdEvent("impression", { adId: ad.id, format: telemetryFormat });
    }
  }, [ad, closed, telemetryFormat]);

  if (closed || !ad) return null;

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    notifyAdEvent("click", { adId: ad.id, format: telemetryFormat });
    toast.success(`Opening ${ad.sponsor}`, {
      description: "Sponsored partner link opened in external browser.",
    });
    openAdExternalUrl(ad.ctaUrl, ad.sponsor);
  };

  const isFeedCard = variant === "feed-card";
  const hasVideo = Boolean(liveAdminCreative?.videoUrl);

  return (
    <aside
      role="complementary"
      aria-label={`Sponsored: ${ad.sponsor}`}
      className={`relative w-full overflow-hidden ${isFeedCard ? "panda-panel rounded-2xl" : "rounded-2xl border border-border/70 bg-card"} ${className}`}
    >
      <div className={isFeedCard ? "relative overflow-hidden" : "relative overflow-hidden p-3.5 sm:p-4"}>
        {isFeedCard ? (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-3 py-2 text-[10px] text-white">
            <span className="rounded-full bg-black/55 px-2 py-1 font-bold uppercase tracking-wider backdrop-blur-sm">Sponsored</span>
            <div className="flex items-center gap-1">
              <span className="truncate font-semibold">{ad.sponsor}</span>
              <button type="button" onClick={() => setShowInfo((v) => !v)} className="grid size-7 place-items-center rounded-full bg-black/45" aria-label="Ad information"><Info className="size-3.5" /></button>
              <button type="button" onClick={() => setClosed(true)} className="grid size-7 place-items-center rounded-full bg-black/45" aria-label="Close advertisement"><X className="size-3.5" /></button>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 text-[11px] text-muted-foreground">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">Ad</span>
              <span className="truncate font-semibold text-foreground">{ad.sponsor}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => setShowInfo((v) => !v)} className="grid min-h-[32px] min-w-[32px] place-items-center rounded-lg text-muted-foreground" aria-label="Ad information"><Info className="size-3.5" /></button>
              <button type="button" onClick={() => setClosed(true)} className="grid min-h-[32px] min-w-[32px] place-items-center rounded-lg text-muted-foreground" aria-label="Close advertisement"><X className="size-3.5" /></button>
            </div>
          </div>
        )}

        {showInfo ? (
          <div className={isFeedCard ? "absolute left-3 right-3 top-12 z-20 rounded-xl bg-black/80 p-3 text-[11px] text-white backdrop-blur-md" : "mb-2.5 rounded-xl bg-secondary/80 p-2.5 text-[11px] text-muted-foreground"}>
            <p className="font-semibold">Sponsored Partner</p>
            <p className="mt-0.5 leading-relaxed">Paid placement inside the Circle Panda feed.</p>
          </div>
        ) : null}

        {isFeedCard ? (
          <>
            {hasVideo ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black sm:aspect-[16/10]">
                <video src={liveAdminCreative?.videoUrl} poster={liveAdminCreative?.posterUrl || liveAdminCreative?.imageUrl} autoPlay muted playsInline controls className="size-full object-cover" onEnded={() => notifyAdEvent("completed", { adId: ad.id, format: "video" })} />
                <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">Sponsored video</span>
              </div>
            ) : ad.imageUrl ? (
              <button type="button" onClick={handleCtaClick} className="relative block aspect-[4/3] w-full overflow-hidden bg-secondary sm:aspect-[16/10]">
                <img src={ad.imageUrl} alt={ad.headline} className="size-full object-cover" />
                <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">Sponsored</span>
              </button>
            ) : null}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-lg">{ad.iconEmoji ?? "✨"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{ad.headline}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{ad.description}</p>
                </div>
                <button type="button" onClick={handleCtaClick} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground">{ad.callToAction}</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-2xl shadow-inner" aria-hidden="true">{ad.iconEmoji ?? "✨"}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight sm:text-base">{ad.headline}</p>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{ad.description}</p>
            </div>
            <button type="button" onClick={handleCtaClick} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground sm:w-auto">{ad.callToAction}<ExternalLink className="size-3.5" /></button>
          </div>
        )}
      </div>
    </aside>
  );
}
