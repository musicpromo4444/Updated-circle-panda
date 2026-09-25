import { useState } from "react";
import { Check, Crown, Flame, Info, Layers, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import type { CoinPackage, VipPlan } from "@/components/admin/adminTypes";
import { CheckoutModal } from "./CheckoutModal";
import { usePricingConfig } from "./pricingStorage";

interface CoinStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "coins" | "vip";
}

export function CoinStoreModal({ open, onOpenChange, defaultTab = "coins" }: CoinStoreModalProps) {
  const { coins, isVip, vipExpiresAt } = useStore();
  const pricingConfig = usePricingConfig();

  const [activeTab, setActiveTab] = useState<"coins" | "vip">(defaultTab);
  const [selectedItem, setSelectedItem] = useState<CoinPackage | VipPlan | null>(null);
  const [checkoutType, setCheckoutType] = useState<"coin_package" | "vip_subscription">(
    "coin_package",
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Filter for enabled packages dynamically configured by master admin
  const activePackages = (pricingConfig.packages || []).filter((p) => p.enabled);
  const activeVipPlans = (pricingConfig.vipPlans || []).filter((p) => p.enabled);

  const handlePurchaseCoin = (pkg: CoinPackage) => {
    setSelectedItem(pkg);
    setCheckoutType("coin_package");
    setCheckoutOpen(true);
  };

  const handlePurchaseVip = (plan: VipPlan) => {
    setSelectedItem(plan);
    setCheckoutType("vip_subscription");
    setCheckoutOpen(true);
  };

  const daysRemaining = vipExpiresAt
    ? Math.max(0, Math.ceil((vipExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-0 border-border/80 bg-card">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-5 pt-5 pb-3 border-b border-border/70">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                  <span className="text-xl">🐼</span> Circle Panda Coin Store
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Official campus bankroll · Pay-once packages &amp; VIP passes
                </DialogDescription>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary/80 border border-border px-3 py-1 text-xs font-bold text-foreground tabular-nums flex items-center gap-1.5 shadow-sm">
                  <span>🪙</span> {coins.toLocaleString()} BC
                </span>
                {isVip ? (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-500 flex items-center gap-1">
                    <Crown className="size-3" /> VIP ({daysRemaining}d)
                  </span>
                ) : null}
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 mt-4 p-1 rounded-xl bg-secondary/50 border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("coins")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  activeTab === "coins"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🪙</span> Coin Packages (Pay-Once)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vip")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  activeTab === "vip"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Crown className="size-3.5 text-amber-500" /> VIP Subscriptions
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {activeTab === "coins" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Choose a tiered coin package</span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3" /> Paystack &amp; Android Bridge Supported
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePackages.map((pkg) => {
                    const isPopular = pkg.isPopular || pkg.id === "pkg_popular";
                    const isBestValue = pkg.isBestValue || pkg.id === "pkg_vip_vault";

                    return (
                      <div
                        key={pkg.id}
                        className={`relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-200 border ${
                          isBestValue
                            ? "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/40 shadow-sm"
                            : isPopular
                              ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/40 shadow-sm"
                              : "bg-secondary/30 border-border hover:border-primary/30"
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-2xl">{pkg.icon || "🪙"}</span>
                          {pkg.badge ? (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                isBestValue
                                  ? "bg-amber-500 text-black font-black"
                                  : isPopular
                                    ? "bg-primary text-primary-foreground font-black"
                                    : "bg-secondary text-muted-foreground border border-border"
                              }`}
                            >
                              {pkg.badge}
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="font-display text-base font-bold text-foreground">
                              {pkg.name}
                            </h3>
                            <span className="font-display text-lg font-black text-foreground tabular-nums">
                              ${pkg.price.toFixed(2)}
                            </span>
                          </div>

                          <div className="my-2 flex items-center gap-1.5">
                            <span className="font-display text-xl font-extrabold text-primary tabular-nums">
                              {pkg.coins.toLocaleString()} BC
                            </span>
                          </div>

                          {pkg.bonusTag ? (
                            <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="size-3" />
                              <span>{pkg.bonusTag}</span>
                            </div>
                          ) : null}

                          <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                            {pkg.description}
                          </p>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handlePurchaseCoin(pkg)}
                          className={`w-full rounded-xl h-9 text-xs font-bold transition-transform active:scale-95 ${
                            isBestValue
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-95 shadow-sm"
                              : isPopular
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                          }`}
                        >
                          Buy for ${pkg.price.toFixed(2)}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-amber-500 text-black font-black text-lg shadow-sm shrink-0">
                      👑
                    </span>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Panda VIP Campus Pass
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Upgrade your campus status with golden crown badge, priority speed dating
                        matchmaking, unlimited Hot Seat reveals, and double daily spins.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeVipPlans.map((plan) => {
                    const isLongTermValue = plan.isHighlighted || plan.id === "vip_monthly";

                    return (
                      <div
                        key={plan.id}
                        className={`relative flex flex-col justify-between rounded-2xl p-5 border transition-all ${
                          isLongTermValue
                            ? "bg-gradient-to-b from-amber-500/15 via-card to-card border-amber-500/50 shadow-md ring-1 ring-amber-500/20"
                            : "bg-secondary/30 border-border hover:border-primary/40"
                        }`}
                      >
                        {/* Highlights badge */}
                        {plan.badge ? (
                          <div className="mb-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                isLongTermValue
                                  ? "bg-amber-500 text-black shadow-sm"
                                  : "bg-secondary text-muted-foreground border border-border"
                              }`}
                            >
                              <Sparkles className="size-2.5" />
                              {plan.badge}
                            </span>
                          </div>
                        ) : null}

                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-display text-base font-bold text-foreground">
                              {plan.name}
                            </h4>
                          </div>

                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="font-display text-2xl font-black text-foreground tabular-nums">
                              ${plan.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              /{plan.interval === "week" ? "wk" : "mo"}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1 mb-4">
                            {plan.description}
                          </p>

                          {/* Perks List */}
                          <div className="space-y-2 border-t border-border/60 pt-3 mb-5">
                            {(plan.perks || []).map((perk, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <span className="grid size-4 place-items-center rounded-full bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
                                  <Check className="size-2.5 stroke-[3]" />
                                </span>
                                <span className="text-muted-foreground font-medium">{perk}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handlePurchaseVip(plan)}
                          className={`w-full rounded-xl h-10 text-xs font-bold transition-transform active:scale-95 ${
                            isLongTermValue
                              ? "bg-amber-500 text-black hover:bg-amber-400 font-black shadow-sm"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          <Crown className="size-3.5 mr-1.5" />
                          Subscribe for ${plan.price.toFixed(2)} {plan.billingPeriod}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        item={selectedItem}
        itemType={checkoutType}
      />
    </>
  );
}
