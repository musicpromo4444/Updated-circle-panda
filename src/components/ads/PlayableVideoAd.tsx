import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, Pause, RotateCcw, Volume2, VolumeX, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { SAMPLE_VIDEO_ADS, type VideoAdData } from "./AdTypes";
import { useAdPreloader } from "./useAdPreloader";
import { notifyAdEvent, openAdExternalUrl, safePlayVideo } from "./platformAdBridge";

export interface PlayableVideoAdProps {
  index?: number;
  adData?: VideoAdData;
  className?: string;
  onSkipped?: () => void;
  onComplete?: () => void;
  variant?: "grid-item" | "card";
}

/**
 * Platform-Agnostic Video Advertisement Component.
 *
 * Engineered for cross-platform execution in both Web browsers and Android WebViews.
 *
 * Highlights:
 * 1. Safe Autoplay: Conforms to Android WebSettings.setMediaPlaybackRequiresUserGesture
 *    policies by starting strictly muted, setting playsInline + webkit-playsinline attributes,
 *    and catching promise rejections silently.
 * 2. Fallback Resilience: If video network fails or media decoder errors occur on low-end
 *    Android devices, displays a sponsored graphic banner instead of a blank box.
 * 3. Safe Intent Links: Invokes openAdExternalUrl() to open external URLs in system browser,
 *    preventing WebView navigation hijacking.
 * 4. Responsive CSS: Uses aspect-ratio and clamp sizing for seamless rendering from 320px
 *    smartphones to high-res desktop monitors.
 */
export function PlayableVideoAd({
  index = 0,
  adData,
  className = "",
  onSkipped,
  onComplete,
}: PlayableVideoAdProps) {
  const ad = adData ?? SAMPLE_VIDEO_ADS[Math.abs(index) % SAMPLE_VIDEO_ADS.length];
  const { isPreloaded } = useAdPreloader(index, 5);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [secondsUntilSkip, setSecondsUntilSkip] = useState(ad.skipAfterSeconds || 5);
  const [isEnded, setIsEnded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  // Trigger impression event
  useEffect(() => {
    if (ad) {
      notifyAdEvent("impression", { adId: ad.id, format: "video" });
    }
  }, [ad]);

  // Safe autoplay initialization on mount
  useEffect(() => {
    if (!videoRef.current || isDismissed) return;
    void safePlayVideo(videoRef.current).then((started) => {
      setIsPlaying(started);
    });
  }, [ad.videoUrl, isDismissed]);

  // Countdown timer for skip eligibility
  useEffect(() => {
    if (isDismissed || isEnded) return;

    const timer = setInterval(() => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        const remaining = Math.max(0, Math.ceil(ad.skipAfterSeconds - time));
        setSecondsUntilSkip(remaining);
        if (remaining === 0) {
          setCanSkip(true);
        }
      } else {
        setSecondsUntilSkip((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 500);

    return () => clearInterval(timer);
  }, [ad.skipAfterSeconds, isDismissed, isEnded]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {
        // Handle autoplay policy block
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSkip = () => {
    setIsDismissed(true);
    notifyAdEvent("skipped", { adId: ad.id, format: "video" });
    toast.info("Video ad skipped");
    onSkipped?.();
  };

  const handleReplay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
    setIsEnded(false);
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    notifyAdEvent("click", { adId: ad.id, format: "video" });
    toast.success(`Opening ${ad.sponsor}`);
    openAdExternalUrl(ad.ctaUrl, ad.sponsor);
  };

  if (isDismissed) {
    return (
      <div
        className={`flex items-center justify-between rounded-2xl border border-dashed border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground ${className}`}
      >
        <span>Sponsored Ad Skipped</span>
        <button
          type="button"
          onClick={() => {
            setIsDismissed(false);
            setSecondsUntilSkip(ad.skipAfterSeconds);
          }}
          className="flex min-h-[44px] items-center gap-1 font-medium text-primary hover:underline active:scale-95"
        >
          <RotateCcw className="size-3.5" /> Replay Ad
        </button>
      </div>
    );
  }

  const duration = ad.durationSeconds || 8;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  return (
    <div
      role="complementary"
      aria-label="Playable Video Advertisement"
      className={`group relative w-full overflow-hidden rounded-2xl border-2 border-primary/30 bg-black shadow-lg transition-all duration-300 ${className}`}
    >
      {/* Video stream container with responsive aspect ratio */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0d14] sm:aspect-[16/9]">
        {!hasVideoError ? (
          <video
            ref={videoRef}
            src={ad.videoUrl}
            playsInline
            autoPlay
            muted={isMuted}
            loop={false}
            onError={() => {
              // Fallback to static card if video format is unsupported or network drops in Android WebView
              setHasVideoError(true);
              setCanSkip(true);
            }}
            onEnded={() => {
              setIsEnded(true);
              setIsPlaying(false);
              setCanSkip(true);
              notifyAdEvent("rewarded_complete", { adId: ad.id, format: "video", rewardAmount: 1 });
              onComplete?.();
            }}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-6 text-center text-white">
            <span className="text-4xl">🎬</span>
            <p className="mt-2 text-sm font-semibold">{ad.sponsor}</p>
            <p className="text-xs text-muted-foreground">{ad.headline}</p>
          </div>
        )}

        {/* Top bar over video: Ad badge, preloaded status & Skip button */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent p-2.5 sm:p-3">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-black/75 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase backdrop-blur-md">
              Sponsored Video
            </span>
            {isPreloaded ? (
              <span className="hidden items-center gap-0.5 rounded-full bg-emerald-950/80 px-2 py-0.5 text-[9px] font-medium text-emerald-300 backdrop-blur-md sm:flex">
                <Zap className="size-2.5" /> Pre-cached
              </span>
            ) : null}
          </div>

          {/* Skip button with countdown */}
          <div>
            {canSkip ? (
              <button
                type="button"
                onClick={handleSkip}
                className="flex min-h-[36px] items-center gap-1 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-black shadow-md backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
              >
                <span>Skip Ad</span>
                <X className="size-3.5 stroke-[2.5]" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                <span className="tabular-nums font-semibold text-amber-300">
                  {secondsUntilSkip}s
                </span>
                <span className="text-[11px] text-white/70">to skip</span>
              </div>
            )}
          </div>
        </div>

        {/* Video progress indicator line */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Center overlay controls for pause/ended state */}
        {isEnded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center backdrop-blur-sm">
            <p className="font-display text-lg font-bold text-white">{ad.sponsor}</p>
            <p className="mt-1 text-xs text-white/80">{ad.headline}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleReplay}
                className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/30 active:scale-95"
              >
                <RotateCcw className="size-3.5" /> Replay
              </button>
              <button
                type="button"
                onClick={handleCtaClick}
                className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow active:scale-95"
              >
                <span>{ad.callToAction}</span>
                <ExternalLink className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Bottom controls overlay */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause video ad" : "Play video ad"}
            className="grid min-h-[36px] min-w-[36px] place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 active:scale-95"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute video ad" : "Mute video ad"}
            className="grid min-h-[36px] min-w-[36px] place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 active:scale-95"
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Ad Bottom Footer info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/80 p-3 text-xs backdrop-blur-sm sm:flex-nowrap sm:p-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">{ad.sponsor}</span>
            {ad.category ? (
              <span className="hidden rounded bg-muted px-1 text-[10px] text-muted-foreground sm:inline">
                {ad.category}
              </span>
            ) : null}
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{ad.tagline}</p>
        </div>

        <button
          type="button"
          onClick={handleCtaClick}
          className="flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow transition-transform hover:scale-102 active:scale-98 sm:w-auto"
        >
          <span>{ad.callToAction}</span>
          <ExternalLink className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
