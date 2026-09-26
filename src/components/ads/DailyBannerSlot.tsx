import { useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { useActiveAdCreative } from "./adInventoryStorage";
import { openAdExternalUrl, notifyAdEvent } from "./platformAdBridge";
import type { AdPlacementTarget } from "./AdTypes";

export function DailyBannerSlot({ placement }: { placement: Extract<AdPlacementTarget, "popup_1_daily_login" | "popup_1_daily_login_bottom"> }) {
  const ad = useActiveAdCreative(placement);
  useEffect(() => { if (ad) void notifyAdEvent("impression", { adId: ad.id, format: "banner" }); }, [ad]);
  return <div className="min-h-[82px] w-full border-y border-border/60 bg-secondary/20 p-3">
    {ad ? <button type="button" onClick={() => { void notifyAdEvent("click", { adId: ad.id, format: "banner" }); openAdExternalUrl(ad.destinationUrl, ad.sponsor); }} className="w-full rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm">
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"><span className="rounded bg-muted px-1.5 py-0.5 text-foreground">Sponsored</span><span className="truncate">{ad.sponsor}</span></div><p className="mt-1 truncate text-xs font-semibold">{ad.headline}</p></div><span className="flex shrink-0 items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary">{ad.callToAction || "Explore"}<ExternalLink className="size-3" /></span></div>
    </button> : <div className="grid min-h-[56px] place-items-center rounded-2xl border border-dashed border-border/60 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sponsored banner space</div>}
  </div>;
}
