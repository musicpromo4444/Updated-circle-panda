import { useEffect } from "react";
import { ExternalLink, Info } from "lucide-react";
import { useActiveAdCreative } from "./adInventoryStorage";
import { notifyAdEvent, openAdExternalUrl } from "./platformAdBridge";

export function CrushAdFrame({ onContinue }: { onContinue: () => void }) {
  const ad = useActiveAdCreative("crush_interstitial");

  useEffect(() => {
    if (ad) notifyAdEvent("impression", { adId: ad.id, format: ad.videoUrl ? "video" : "banner" });
  }, [ad]);

  useEffect(() => {
    if (!ad) onContinue();
  }, [ad, onContinue]);

  if (!ad) return null;

  const click = () => {
    notifyAdEvent("click", { adId: ad.id, format: ad.videoUrl ? "video" : "banner" });
    openAdExternalUrl(ad.destinationUrl, ad.sponsor);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col bg-black text-white">
      <div className="relative flex min-h-[62vh] flex-1 items-center justify-center overflow-hidden bg-black">
        {ad.videoUrl ? (
          <video
            src={ad.videoUrl}
            poster={ad.posterUrl || ad.imageUrl}
            autoPlay
            muted
            playsInline
            controls
            className="max-h-[72vh] w-full object-contain"
            onEnded={() => notifyAdEvent("completed", { adId: ad.id, format: "video" })}
          />
        ) : ad.imageUrl ? (
          <button type="button" onClick={click} className="size-full max-h-[72vh]">
            <img src={ad.imageUrl} alt={ad.headline} className="size-full object-contain" />
          </button>
        ) : null}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent px-3 py-3">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">Sponsored</span>
          <span className="max-w-[55%] truncate text-xs font-semibold">{ad.sponsor}</span>
        </div>
      </div>

      <div className="bg-background px-3 py-3 text-foreground">
        <div className="flex items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-lg">â­</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{ad.headline}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ad.description || ad.tagline}</p>
          </div>
          <button type="button" onClick={click} className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground">
            {ad.callToAction}<ExternalLink className="size-3" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Info className="size-3" /> Sponsored placement</span>
          <button type="button" onClick={onContinue} className="font-bold text-primary">Continue to pictures â</button>
        </div>
      </div>
    </div>
  );
}
