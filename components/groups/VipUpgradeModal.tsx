import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type VipUpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VipUpgradeModal({ open, onOpenChange }: VipUpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-upgrade-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/40 bg-background p-6 shadow-[0_0_45px_rgba(245,158,11,.25)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          className="absolute right-3 top-3"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-5" />
        </Button>

        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-amber-400/60 bg-amber-500/15 text-amber-400">
          <Crown className="size-7" />
        </div>

        <div className="mt-4 text-center">
          <h2 id="vip-upgrade-title" className="font-display text-2xl font-black">
            VIP Group
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            VIP membership is required to enter the private VIP group chat.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-amber-400">VIP access includes</p>
          <ul className="mt-2 space-y-1.5">
            <li>• Private full-screen group chat</li>
            <li>• Text, photos, videos and voice notes</li>
            <li>• VIP-only community access</li>
          </ul>
        </div>

        <Button
          type="button"
          className="mt-5 w-full bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-neutral-950"
          onClick={() => onOpenChange(false)}
        >
          Continue to VIP options
        </Button>
      </section>
    </div>
  );
}
