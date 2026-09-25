import { useState } from "react";
import {
  Check,
  Crown,
  HelpCircle,
  Lock,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { CoinPackage, VipPlan } from "@/components/admin/adminTypes";
import { CheckoutModal } from "./CheckoutModal";
import { usePricingConfig } from "./pricingStorage";

export function CoinStoreView() {
  const { coins, isVip, vipExpiresAt } = useStore();
  const pricingConfig = usePricingConfig();

  const [activeTab, setActiveTab] = useState<"coins" | "vip">("coins");
  const [selectedItem, setSelectedItem] = useState<CoinPackage | VipPlan | null>(null);
  const [checkoutType, setCheckoutType] = useState<"coin_package" | "vip_subscription">(
    "coin_package",
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Filter only enabled packages mapped dynamically from admin state
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
    <div className="space-y-6">
      {/* Balance & Status Banner */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-2xl shadow-sm">
              🐼
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Your Campus Bankroll
                </h2>
                {isVip ? (
                  <span className="rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                    <Crown className="size-3" /> VIP Active
                  </span>
                ) : (
                  <span className="rounded-full bg-secondary text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-semibold">
                    Standard Member
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVip
                  ? `VIP perks active · ${daysRemaining} days remaining on your subscription`
                  : "Acquire Panda Coins (BC) for Hot Seat questions, dating super-likes & event tickets"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-2 shadow-inner text-right">
              <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Current Balance
              </span>
              <span className="font-display text-xl font-black text-foreground tabular-nums flex items-center gap-1.5 justify-end">
                <span>🪙</span> {coins.toLocaleString()} BC
              </span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 mt-5 p-1 rounded-2xl bg-secondary/60 border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("coins")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
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
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
              activeTab === "vip"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crown className="size-3.5 text-amber-500" /> VIP Subscriptions (Duration)
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "coins" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Tiered Coin Packages
              </h3>
              <p className="text-xs text-muted-foreground">
                Pay once. Coins never expire and credit immediately.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>Web Paystack &amp; Android Bridge</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {activePackages.map((pkg) => {
              const isPopular = pkg.isPopular || pkg.id === "pkg_popular";
              const isBestValue = pkg.isBestValue || pkg.id === "pkg_vip_vault";

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-5 border transition-all duration-200 ${
                    isBestValue
                      ? "bg-gradient-to-b from-amber-500/10 via-card to-card border-amber-500/50 shadow-md ring-1 ring-amber-500/20"
                      : isPopular
                        ? "bg-gradient-to-b from-primary/10 via-card to-card border-primary/50 shadow-md ring-1 ring-primary/20"
                        : "bg-card border-border/80 hover:border-primary/40 shadow-sm"
                  }`}
                >
                  <div>
                    {/* Top status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-2xl">{pkg.icon || "🪙"}</span>
                      {pkg.badge ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isBestValue
                              ? "bg-amber-500 text-black shadow-sm"
                              : isPopular
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-secondary text-muted-foreground border border-border"
                          }`}
                        >
                          {pkg.badge}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="font-display text-base font-bold text-foreground">{pkg.name}</h4>

                    <div className="mt-2 mb-1 flex items-baseline justify-between">
                      <span className="font-display text-2xl font-black text-foreground tabular-nums">
                        ${pkg.price.toFixed(2)}
                      </span>
                      <span className="font-display text-lg font-extrabold text-primary tabular-nums">
                        {pkg.coins.toLocaleString()} BC
                      </span>
                    </div>

                    {pkg.bonusTag ? (
                      <div className="mt-1 mb-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="size-3 shrink-0" />
                        <span className="truncate">{pkg.bonusTag}</span>
                      </div>
                    ) : null}

                    <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                      {pkg.description}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handlePurchaseCoin(pkg)}
                    className={`w-full rounded-xl h-10 text-xs font-bold transition-transform active:scale-95 ${
                      isBestValue
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black hover:opacity-95 shadow-sm"
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
          <div className="rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/40 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-amber-500 text-black font-black text-xl shadow-sm shrink-0">
                  👑
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Circle Panda VIP Pass
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    Elevate your campus experience with Golden Crown status, speed dating priority
                    matching, unlimited Hot Seat reveals, and double daily wheel multipliers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeVipPlans.map((plan) => {
              const isLongTerm = plan.isHighlighted || plan.id === "vip_monthly";

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-6 border transition-all ${
                    isLongTerm
                      ? "bg-gradient-to-b from-amber-500/15 via-card to-card border-amber-500/60 shadow-lg ring-1 ring-amber-500/30"
                      : "bg-card border-border/80 hover:border-primary/40 shadow-sm"
                  }`}
                >
                  <div>
                    {plan.badge ? (
                      <div className="mb-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            isLongTerm
                              ? "bg-amber-500 text-black shadow-sm"
                              : "bg-secondary text-muted-foreground border border-border"
                          }`}
                        >
                          <Sparkles className="size-3" />
                          {plan.badge}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-display text-lg font-bold text-foreground">
                        {plan.name}
                      </h4>
                      <div className="text-right">
                        <span className="font-display text-2xl font-black text-foreground tabular-nums">
                          ${plan.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium ml-1">
                          /{plan.interval === "week" ? "week" : "month"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 mb-4">{plan.description}</p>

                    <div className="space-y-2.5 border-t border-border/70 pt-4 mb-6">
                      {(plan.perks || []).map((perk, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="grid size-4 place-items-center rounded-full bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
                            <Check className="size-2.5 stroke-[3]" />
                          </span>
                          <span className="text-foreground/90 font-medium">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handlePurchaseVip(plan)}
                    className={`w-full rounded-2xl h-11 text-xs font-bold transition-transform active:scale-95 ${
                      isLongTerm
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black hover:opacity-95 shadow-md"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    }`}
                  >
                    <Crown className="size-4 mr-2" />
                    Activate {plan.name} (${plan.price.toFixed(2)})
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        item={selectedItem}
        itemType={checkoutType}
      />
    </div>
  );
}
