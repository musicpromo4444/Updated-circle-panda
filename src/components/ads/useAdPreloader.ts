import { useEffect, useMemo, useState } from "react";
import { SAMPLE_VIDEO_ADS, type VideoAdData } from "./AdTypes";

export interface PreloadOptions {
  videoUrls?: string[];
  currentIndex?: number;
  triggerFrequency?: number;
}

/**
 * Platform-agnostic preloader for video and rich media ad assets.
 * Compatible with both Android WebViews and desktop/mobile Web browsers.
 *
 * Supports both function signatures:
 * 1. Object config: useAdPreloader({ videoUrls: string[] })
 * 2. Interval config: useAdPreloader(currentIndex, triggerFrequency)
 *
 * In Android WebView:
 * - Pre-warms the media cache via HTML5 <link rel="preload"> links without blocking the UI thread.
 * - Prevents network latency spikes when user reaches a video ad checkpoint.
 * - Gracefully ignores unsupported resource types without throwing errors.
 */
export function useAdPreloader(arg1?: number | PreloadOptions, arg2?: number) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadedAd, setPreloadedAd] = useState<VideoAdData | null>(null);

  const { videoUrlsToPreload, shouldPreload } = useMemo(() => {
    let urls: string[] = [];
    let preload = true;

    if (typeof arg1 === "number") {
      const currentIndex = arg1;
      const triggerFrequency = typeof arg2 === "number" ? arg2 : 5;
      const distanceToTrigger = triggerFrequency - (currentIndex % triggerFrequency);
      preload = distanceToTrigger <= 2;

      const adIndex = Math.floor(currentIndex / triggerFrequency) % SAMPLE_VIDEO_ADS.length;
      const targetAd = SAMPLE_VIDEO_ADS[adIndex];
      if (targetAd?.videoUrl) {
        urls = [targetAd.videoUrl];
      }
    } else if (arg1 && typeof arg1 === "object") {
      if (Array.isArray(arg1.videoUrls) && arg1.videoUrls.length > 0) {
        urls = arg1.videoUrls;
      } else if (
        typeof arg1.currentIndex === "number" &&
        typeof arg1.triggerFrequency === "number"
      ) {
        const distance = arg1.triggerFrequency - (arg1.currentIndex % arg1.triggerFrequency);
        preload = distance <= 2;
        const targetAd =
          SAMPLE_VIDEO_ADS[
            Math.floor(arg1.currentIndex / arg1.triggerFrequency) % SAMPLE_VIDEO_ADS.length
          ];
        if (targetAd?.videoUrl) urls = [targetAd.videoUrl];
      }
    }

    return { videoUrlsToPreload: urls, shouldPreload: preload };
  }, [arg1, arg2]);

  const urlsKey = videoUrlsToPreload.join(",");

  useEffect(() => {
    if (!shouldPreload || videoUrlsToPreload.length === 0) return;
    if (typeof document === "undefined") return;

    const createdLinks: HTMLLinkElement[] = [];

    // Safely inject preload hints into document head
    for (const url of videoUrlsToPreload) {
      try {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = url;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
        createdLinks.push(link);
      } catch {
        // Continue silently if preload is restricted by the webview policy
      }
    }

    setIsPreloaded(true);
    setPreloadedAd(SAMPLE_VIDEO_ADS[0] ?? null);

    return () => {
      for (const link of createdLinks) {
        if (link.parentNode) {
          try {
            link.parentNode.removeChild(link);
          } catch {
            // Ignore DOM unmount races
          }
        }
      }
    };
  }, [shouldPreload, urlsKey, videoUrlsToPreload]);

  return { isPreloaded, preloadedAd };
}
