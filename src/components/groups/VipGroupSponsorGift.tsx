import { useEffect, useState } from "react";
import { ExternalLink, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Offer = {
  session_id?: string;
  display_text: string;
  reward_bc: number;
  sponsor: string;
  headline: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  poster_url?: string;
  destination_url?: string;
  call_to_action?: string;
  duration_seconds: number;
};

export function VipGroupSponsorGift({ groupId }: { groupId: string }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [claimable, setClaimable] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const checkOffer = async () => {
    const { data, error } = await (supabase as any).rpc("get_vip_group_sponsor_offer", { p_group_id: groupId });
    if (error) {
      setVisible(false);
      return;
    }
    setVisible(Boolean(data?.show));
  };

  useEffect(() => {
    if (!groupId) return;
    void checkOffer();
  }, [groupId]);

  const start = async () => {
    if (loading || open || !visible) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("start_vip_group_sponsor_secure", { p_group_id: groupId });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Sponsor could not be opened");
      return;
    }
    if (!data?.show) {
      setVisible(false);
      if (data?.reason === "vip_required") toast.error("VIP membership is required.");
      else if (data?.reason !== "already_claimed") toast.info("No VIP sponsor is available right now.");
      return;
    }

    setOffer(data);
    setRemaining(Number(data.duration_seconds ?? 5));
    setClaimable(false);
    setClaimed(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !offer || remaining <= 0 || claimable) return;
    const timer = window.setInterval(() => setRemaining(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [open, offer, remaining, claimable]);

  useEffect(() => {
    if (!open || !offer || remaining > 0 || claimable) return;
    void (async () => {
      const { data, error } = await (supabase as any).rpc("complete_vip_group_sponsor_secure", {
        p_session_id: offer.session_id,
      });
      if (error) {
        toast.error(error.message ?? "Sponsor could not be completed");
        return;
      }
      if (data?.claimable) setClaimable(true);
    })();
  }, [open, offer, remaining, claimable]);

  const claim = async () => {
    if (!offer?.session_id || !claimable || claiming || claimed) return;
    setClaiming(true);
    const { data, error } = await (supabase as any).rpc("claim_vip_group_sponsor_reward_secure", {
      p_session_id: offer.session_id,
    });
    setClaiming(false);
    if (error) {
      toast.error(error.message ?? "Reward could not be claimed");
      return;
    }
    if (data?.claimed || data?.already_claimed) {
      const amount = Number(data.reward_bc ?? offer.reward_bc);
      setClaimed(true);
      setVisible(false);
      toast.success(`You received ${amount.toLocaleString()} BC 🪙`);
    }
  };

  if (!visible && !open) return null;

  return <>
    {visible ? (
      <button
        type="button"
        onClick={() => void start()}
        disabled={loading}
        aria-label="VIP sponsor giveaway"
        className="absolute bottom-24 left-3 z-30 flex max-w-[calc(100%-1.5rem)] items-center gap-2 text-left"
      >
        <span className="relative grid size-14 shrink-0 place-items-center rounded-full border-2 border-amber-300/80 bg-amber-500/20 text-3xl shadow-[0_0_24px_rgba(245,158,11,.45)] animate-bounce">
          🎁
          <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(253,230,138,.9)] animate-ping" />
        </span>
        <span className="rounded-2xl border border-amber-400/35 bg-black/85 px-3 py-2 text-xs font-black leading-tight text-amber-100 shadow-xl backdrop-blur-sm">
          {loading ? "Opening VIP sponsor…" : "VIP SPONSOR GIVEAWAY — TAP TO CLAIM"}
        </span>
      </button>
    ) : null}

    {open && offer ? (
      <div className="fixed inset-0 z-[140] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/35 bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-amber-400/20 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">VIP Sponsor</p>
              <p className="font-display font-bold">{offer.sponsor}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-5"/></Button>
          </div>
          <div className="p-4">
            <div className="mb-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-center">
              <p className="text-xs font-bold text-amber-200">{offer.display_text}</p>
            </div>
            {offer.video_url ? (
              <video src={offer.video_url} poster={offer.poster_url} autoPlay playsInline controls className="max-h-[48vh] w-full rounded-2xl bg-black object-contain"/>
            ) : offer.image_url ? (
              <img src={offer.image_url} alt={offer.headline} className="max-h-[48vh] w-full rounded-2xl bg-black object-contain" />
            ) : (
              <div className="grid min-h-48 place-items-center rounded-2xl bg-secondary/50 text-5xl">🎁</div>
            )}
            <h3 className="mt-4 font-display text-lg font-black">{offer.headline}</h3>
            {offer.description ? <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p> : null}
            {!claimable && !claimed ? <p className="mt-3 text-center text-xs font-semibold text-amber-400">Watch to the end · {remaining}s remaining</p> : null}

            {claimable && !claimed ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-center">
                <p className="font-display text-lg font-black">🎁 Claim your reward</p>
                <p className="mt-1 text-sm font-bold text-emerald-400">{offer.reward_bc.toLocaleString()} BC 🪙</p>
                <Button className="mt-3 w-full" onClick={() => void claim()} disabled={claiming}>
                  {claiming ? <Loader2 className="mr-2 size-4 animate-spin"/> : null}
                  Claim Reward
                </Button>
              </div>
            ) : null}

            {claimed ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-center">
                <p className="font-display text-lg font-black">You have received your reward 🎉</p>
                <p className="mt-1 text-sm font-bold text-emerald-400">{offer.reward_bc.toLocaleString()} BC has been added to your Panda Coin balance.</p>
                <Button className="mt-3 w-full" onClick={() => setOpen(false)}>Continue chatting</Button>
              </div>
            ) : null}

            {offer.destination_url ? (
              <a href={offer.destination_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <ExternalLink className="size-3"/>Visit sponsor
              </a>
            ) : null}
          </div>
        </div>
      </div>
    ) : null}
  </>;
}
