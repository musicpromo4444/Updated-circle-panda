/**
 * Circle Panda - Platform Ad Bridge
 * Cross-platform utilities for advertising rendering across standard Web Browsers
 * and packaged Android WebViews.
 *
 * Handles:
 * 1. WebView detection (Android WebView user agents, JavaScriptInterface bridges)
 * 2. Safe external link navigation (Native Intent dispatch vs window.open)
 * 3. Media playback policy compliance (playsInline, autoplay muted fallback)
 * 4. Safe telemetry & ad impression tracking
 */

// Extend window interface for potential Android WebView JavaScriptInterface bridges
declare global {
  interface Window {
    /** Injected Android JavaScriptInterface (e.g. from WebSettings.addJavascriptInterface) */
    AndroidBridge?: {
      openUrl?: (url: string) => void;
      trackAdImpression?: (adId: string, format: string) => void;
      trackAdClick?: (adId: string, format: string) => void;
      onRewardedAdComplete?: (rewardAmount: number) => void;
      showNativeInterstitial?: (placementId: string) => boolean;
      isWebView?: () => boolean;
    };
    Android?: {
      openUrl?: (url: string) => void;
      trackAdImpression?: (adId: string, format: string) => void;
      trackAdClick?: (adId: string, format: string) => void;
    };
  }
}

/**
 * Detects if the current client is executing inside an Android WebView.
 * Checks for:
 * - Injected Android JavaScriptInterface objects
 * - Distinctive Android WebView user agent signatures (Version/X.X, 'wv' token)
 */
export function isAndroidWebView(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  // 1. Direct native bridge presence
  if (window.AndroidBridge?.isWebView?.() === true || window.AndroidBridge || window.Android) {
    return true;
  }

  const ua = navigator.userAgent || "";

  // 2. Android WebView UA tokens
  const isAndroid = /Android/i.test(ua);
  const isWebView =
    /wv|Version\/[0-9.]+/i.test(ua) ||
    (/Android.*Chrome\/[.0-9]*\s+(Mobile)?\s+Safari\/[.0-9]*/i.test(ua) &&
      !/Version\/[.0-9]*/i.test(ua) &&
      /Build\//i.test(ua) &&
      !/Chrome\/[.0-9]*\s+Mobile/i.test(ua));

  return isAndroid && isWebView;
}

/**
 * Safely opens a sponsored partner link or external ad destination.
 *
 * Web vs. Android WebView Handling:
 * - Inside an Android WebView: Standard `<a target="_blank">` often tries to load within
 *   the same WebView if WebViewClient.shouldOverrideUrlLoading is not set up to launch an
 *   Intent. This can hijack the SPA and wipe user session state.
 *   If an Android bridge method is available, we dispatch via native intent. Otherwise,
 *   we use window.open with secure noopener/noreferrer flags.
 * - Inside Web browsers: Opens in a fresh tab with rel="noopener noreferrer".
 */
export function openAdExternalUrl(url?: string, sponsorTitle?: string): void {
  if (!url || url === "#") return;

  try {
    // 1. Attempt native Android bridge dispatch
    if (typeof window !== "undefined") {
      if (typeof window.AndroidBridge?.openUrl === "function") {
        window.AndroidBridge.openUrl(url);
        return;
      }
      if (typeof window.Android?.openUrl === "function") {
        window.Android.openUrl(url);
        return;
      }

      // 2. Standard Web fallback: open external tab
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      // If popup blocker intervened, fallback to top navigation only if requested
      if (!opened) {
        window.location.assign(url);
      }
    }
  } catch (err) {
    // Fail silently without throwing runtime exceptions
    console.warn(`[CirclePandaAd] Failed to navigate to ad URL for ${sponsorTitle}:`, err);
  }
}

/**
 * Dispatches ad lifecycle telemetry to native Android bridge or Web analytics.
 */
export function notifyAdEvent(
  event: "impression" | "click" | "skipped" | "rewarded_complete",
  payload: { adId: string; format: "banner" | "video" | "rewarded"; rewardAmount?: number },
): void {
  try {
    if (typeof window === "undefined") return;

    // Send to Android native bridge if available
    if (event === "impression") {
      window.AndroidBridge?.trackAdImpression?.(payload.adId, payload.format);
      window.Android?.trackAdImpression?.(payload.adId, payload.format);
    } else if (event === "click") {
      window.AndroidBridge?.trackAdClick?.(payload.adId, payload.format);
      window.Android?.trackAdClick?.(payload.adId, payload.format);
    } else if (event === "rewarded_complete" && payload.rewardAmount) {
      window.AndroidBridge?.onRewardedAdComplete?.(payload.rewardAmount);
    }

    // Fire custom browser event for web telemetry/event bus
    window.dispatchEvent(
      new CustomEvent("circle_panda_ad_event", {
        detail: { event, ...payload, timestamp: Date.now() },
      }),
    );
  } catch {
    // Analytics/telemetry failure must never crash the UI
  }
}

/**
 * Safely triggers HTML5 video playback respecting Android WebView autoplay policies.
 *
 * In Android WebView (Android 5.0+), WebSettings.setMediaPlaybackRequiresUserGesture defaults
 * to true unless explicitly disabled in native code.
 * This helper guarantees:
 * - Video element is muted before initial play
 * - PlaysInline / webkit-playsinline attributes are enforced
 * - Catches Promise rejections (NotAllowedError / AbortError) gracefully without console panic
 */
export async function safePlayVideo(video: HTMLVideoElement | null): Promise<boolean> {
  if (!video) return false;

  try {
    // Strict mobile webview requirements
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    const playPromise = video.play();
    if (playPromise !== undefined) {
      await playPromise;
      return true;
    }
    return true;
  } catch (error) {
    // Autoplay blocked by WebView or browser policy - graceful degraded state
    console.debug("[CirclePandaAd] Video autoplay deferred pending user interaction:", error);
    return false;
  }
}
