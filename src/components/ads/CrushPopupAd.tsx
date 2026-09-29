import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import { useActiveAdCreative } from "./adInventoryStorage";
import { notifyAdEvent, openAdExternalUrl } from "./platformAdBridge";

export function CrushPopupAd({ onContinue }: { onContinue: () => void }) {
  const ad = useActiveAdCreative("crush_popup");

  useEffect(() => {
    if (ad) notifyAdEvent("impression", { adId: ad.id, format: "popup" });
    if (!ad) onContinue();
  }, [ad, onContinue]);

  if (!ad) return null;

  const click = () => {
    notifyAdEvent("click", { adId: ad.id, format: "popup" });
    openAdExternalUrl(ad.destinationUrl, ad.sponsor);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center bg-black/95 px-5 py-10 text-white">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-background text-foreground shadow-2xl">
        <div className="relative">
          {ad.videoUrl ? (
            <video src={ad.videoUrl} poster={ad.posterUrl || ad.imageUrl} autoPlay muted playsInline controls className="aspect-[4/3] w-full object-cover" onEnded={() => notifyAdEvent("completed", { adId: ad.id, format: "popup" })} />
          ) : ad.imageUrl ? (
            <button type="button" onClick={click} className="block aspect-[4/3] w-full bg-black">
              <img src={ad.imageUrl} alt={ad.headline} className="size-full object-cover" />
            </button>
          ) : null}
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Sponsored</span>
          <button type="button" onClick={onContinue} aria-label="Close sponsored ad" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/70 text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{ad.sponsor}</p>
          <h2 className="mt-1 text-base font-black">{ad.headline}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ad.description || ad.tagline}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={click} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
              {ad.callToAction}<ExternalLink className="size-3.5" />
            </button>
            <button type="button" onClick={onContinue} className="min-h-11 rounded-xl border border-border px-4 text-xs font-bold">Continue</button>
          </div>
        </div>
      </div>
    </div>
  );
}
