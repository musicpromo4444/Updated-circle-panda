import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  Edit2,
  Eye,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SwitchCamera,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminStore } from "./adminStore";
import type { CoinPackage, VipPlan } from "./adminTypes";
import { CoinStoreModal } from "@/components/store/CoinStoreModal";

export function AdminPricingManager() {
  const {
    pricingConfig,
    updateCoinPackage,
    toggleCoinPackage,
    addCoinPackage,
    deleteCoinPackage,
    updateVipPlan,
    toggleVipPlan,
    addVipPlan,
    deleteVipPlan,
    updatePaystackConfig,
    updateAndroidBridgeConfig,
    resetPricingConfigToDefault,
  } = useAdminStore();

  // Store Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Edit Coin Package State
  const [editingPkg, setEditingPkg] = useState<CoinPackage | null>(null);
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [isCreatingPkg, setIsCreatingPkg] = useState(false);

  // Edit VIP Plan State
  const [editingPlan, setEditingPlan] = useState<VipPlan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [perksText, setPerksText] = useState("");

  // Open Edit Package
  const handleOpenEditPkg = (pkg: CoinPackage) => {
    setEditingPkg({ ...pkg });
    setIsCreatingPkg(false);
    setPkgDialogOpen(true);
  };

  // Open Create Package
  const handleOpenCreatePkg = () => {
    setEditingPkg({
      id: "",
      name: "Custom Campus Pack",
      price: 1.5,
      coins: 3000,
      bonusTag: "Limited Campus Bonus",
      description: "Custom bankroll pack for campus events and leaderboards.",
      badge: "Special",
      enabled: true,
      isPopular: false,
      isBestValue: false,
      icon: "🪙",
    });
    setIsCreatingPkg(true);
    setPkgDialogOpen(true);
  };

  // Save Package
  const handleSavePkg = () => {
    if (!editingPkg) return;
    if (!editingPkg.name.trim()) {
      toast.error("Package name is required");
      return;
    }
    if (editingPkg.price <= 0 || editingPkg.coins <= 0) {
      toast.error("Price and coin quantity must be greater than 0");
      return;
    }

    if (isCreatingPkg) {
      const { id, ...rest } = editingPkg;
      addCoinPackage(rest);
    } else {
      updateCoinPackage(editingPkg.id, editingPkg);
    }
    setPkgDialogOpen(false);
  };

  // Open Edit VIP Plan
  const handleOpenEditPlan = (plan: VipPlan) => {
    setEditingPlan({ ...plan });
    setPerksText((plan.perks || []).join("\n"));
    setIsCreatingPlan(false);
    setPlanDialogOpen(true);
  };

  // Open Create VIP Plan
  const handleOpenCreatePlan = () => {
    setEditingPlan({
      id: "",
      name: "Semester VIP Pass",
      price: 8.0,
      interval: "month",
      durationDays: 90,
      billingPeriod: "per semester",
      description: "Full term VIP access with maximum priority on campus.",
      badge: "Term Pass",
      isHighlighted: false,
      enabled: true,
      perks: [
        "All VIP perks included for the full semester",
        "Exclusive Semester Panda badge",
        "Permanent speed dating fast-pass",
      ],
    });
    setPerksText(
      "All VIP perks included for the full semester\nExclusive Semester Panda badge\nPermanent speed dating fast-pass",
    );
    setIsCreatingPlan(true);
    setPlanDialogOpen(true);
  };

  // Save VIP Plan
  const handleSavePlan = () => {
    if (!editingPlan) return;
    if (!editingPlan.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (editingPlan.price <= 0 || editingPlan.durationDays <= 0) {
      toast.error("Price and duration must be greater than 0");
      return;
    }

    const perks = perksText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const updated = { ...editingPlan, perks };

    if (isCreatingPlan) {
      const { id, ...rest } = updated;
      addVipPlan(rest);
    } else {
      updateVipPlan(editingPlan.id, updated);
    }
    setPlanDialogOpen(false);
  };

  const exchangeRate = pricingConfig.paystack?.exchangeRateNgn || 1500;

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                <Coins className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Coin Store &amp; VIP Pricing Manager
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tiered Coin Packages &amp; Recurring VIP passes · Configurable dynamically without
                  code edits
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="rounded-xl text-xs font-semibold gap-1.5 h-9 bg-card hover:bg-secondary"
            >
              <Eye className="size-3.5 text-primary" /> Live Store Preview
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetPricingConfigToDefault}
              className="rounded-xl text-xs font-semibold gap-1.5 h-9 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3.5" /> Reset to Defaults
            </Button>
          </div>
        </div>

        {/* Master Admin Info Banner */}
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>
              Dynamic state connected to <strong>reply.stagepro@gmail.com</strong>. Changes
              instantly reflect across all user web sessions &amp; Android WebView clients.
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Active Tiers: {pricingConfig.packages.length} Coins · {pricingConfig.vipPlans.length}{" "}
            VIP
          </span>
        </div>
      </div>

      {/* SECTION 1: TIERED COIN PACKAGES (PAY-ONCE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <span>🪙</span> Tiered Coin Packages (Pay-Once)
            </h3>
            <p className="text-xs text-muted-foreground">
              Anchor prices, scaling bonus values, and coin amounts
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreatePkg}
            className="rounded-xl text-xs font-bold gap-1.5 h-8.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" /> Add Package
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingConfig.packages.map((pkg) => {
            const priceNgn = Math.round(pkg.price * exchangeRate);

            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-3xl p-5 border transition-all ${
                  !pkg.enabled
                    ? "opacity-60 bg-secondary/30 border-border/60"
                    : pkg.isBestValue
                      ? "bg-gradient-to-b from-amber-500/10 via-card to-card border-amber-500/50 shadow-sm"
                      : pkg.isPopular
                        ? "bg-gradient-to-b from-primary/10 via-card to-card border-primary/50 shadow-sm"
                        : "bg-card border-border/80 shadow-sm"
                }`}
              >
                <div>
                  {/* Top Bar with Status & Edit */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-2xl">{pkg.icon || "🪙"}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPkg(pkg)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit Package"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCoinPackage(pkg.id)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Package"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="font-display text-base font-bold text-foreground">{pkg.name}</h4>
                  </div>

                  <div className="mt-1 mb-2 flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-2xl font-black text-foreground tabular-nums">
                        ${pkg.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">
                        (≈ ₦{priceNgn.toLocaleString()})
                      </span>
                    </div>
                    <span className="font-display text-base font-extrabold text-primary tabular-nums">
                      {pkg.coins.toLocaleString()} BC
                    </span>
                  </div>

                  {pkg.bonusTag ? (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="size-3 shrink-0" />
                      <span className="truncate">{pkg.bonusTag}</span>
                    </div>
                  ) : null}

                  {pkg.badge ? (
                    <div className="mb-2">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border">
                        {pkg.badge}
                      </span>
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                    {pkg.description}
                  </p>
                </div>

                {/* Bottom Toggle Switch */}
                <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Store Visibility:
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold ${
                        pkg.enabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {pkg.enabled ? "Active" : "Disabled"}
                    </span>
                    <Switch
                      checked={pkg.enabled}
                      onCheckedChange={() => toggleCoinPackage(pkg.id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: VIP PASS SUBSCRIPTIONS (RECURRING / DURATION) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Crown className="size-4 text-amber-500" /> VIP Pass Subscriptions (Duration &amp;
              Value)
            </h3>
            <p className="text-xs text-muted-foreground">
              Weekly &amp; Monthly VIP passes with long-term value highlights
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreatePlan}
            className="rounded-xl text-xs font-bold gap-1.5 h-8.5 bg-amber-500 text-black hover:bg-amber-400"
          >
            <Plus className="size-3.5" /> Add VIP Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pricingConfig.vipPlans.map((plan) => {
            const isLongTerm = plan.isHighlighted || plan.id === "vip_monthly";
            const priceNgn = Math.round(plan.price * exchangeRate);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl p-5 border transition-all ${
                  !plan.enabled
                    ? "opacity-60 bg-secondary/30 border-border/60"
                    : isLongTerm
                      ? "bg-gradient-to-b from-amber-500/15 via-card to-card border-amber-500/60 shadow-md ring-1 ring-amber-500/20"
                      : "bg-card border-border/80 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-amber-500/20 text-amber-500 font-bold">
                        <Crown className="size-4" />
                      </span>
                      <h4 className="font-display text-base font-bold text-foreground">
                        {plan.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(plan)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit VIP Plan"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVipPlan(plan.id)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete VIP Plan"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 mb-1 flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-2xl font-black text-foreground tabular-nums">
                        ${plan.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        /{plan.interval === "week" ? "week" : "month"}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        (≈ ₦{priceNgn.toLocaleString()})
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground">
                      {plan.durationDays} Days Duration
                    </span>
                  </div>

                  {plan.badge ? (
                    <div className="my-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                          isLongTerm
                            ? "bg-amber-500 text-black shadow-sm"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        <Sparkles className="size-2.5" />
                        {plan.badge}
                      </span>
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>

                  {/* Perks list */}
                  <div className="space-y-1.5 border-t border-border/60 pt-3 mb-4">
                    {(plan.perks || []).slice(0, 4).map((perk, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <Check className="size-3 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground truncate">{perk}</span>
                      </div>
                    ))}
                    {(plan.perks || []).length > 4 ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        +{(plan.perks || []).length - 4} more perks
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Plan Controls */}
                <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Highlighted Value Badge:
                    </span>
                    <Switch
                      checked={plan.isHighlighted}
                      onCheckedChange={(val) => updateVipPlan(plan.id, { isHighlighted: val })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold ${
                        plan.enabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {plan.enabled ? "Active" : "Disabled"}
                    </span>
                    <Switch checked={plan.enabled} onCheckedChange={() => toggleVipPlan(plan.id)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: CROSS-PLATFORM CHECKOUT GATEWAY SETTINGS */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-5">
        <div>
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <CreditCard className="size-4 text-primary" /> Cross-Platform Checkout Switcher
            Configuration
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage credentials and platform bridges for Web Paystack and Android WebView
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* PAYSTACK WEB GATEWAY */}
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-primary" />
                <h4 className="font-display text-sm font-bold text-foreground">
                  Paystack Web Gateway
                </h4>
              </div>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                Browser Platform
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Paystack Public Key
                </Label>
                <Input
                  value={pricingConfig.paystack?.publicKey || ""}
                  onChange={(e) => updatePaystackConfig({ publicKey: e.target.value })}
                  placeholder="pk_test_... or pk_live_..."
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Store Currency
                  </Label>
                  <Input
                    value={pricingConfig.paystack?.currency || "USD"}
                    onChange={(e) =>
                      updatePaystackConfig({ currency: e.target.value as "USD" | "NGN" })
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    NGN Exchange Rate ($1 USD)
                  </Label>
                  <Input
                    type="number"
                    value={pricingConfig.paystack?.exchangeRateNgn || 1500}
                    onChange={(e) =>
                      updatePaystackConfig({ exchangeRateNgn: Number(e.target.value) || 1500 })
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    Paystack Test Sandbox Mode
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Simulate card transactions without billing real bank accounts
                  </p>
                </div>
                <Switch
                  checked={pricingConfig.paystack?.testMode ?? true}
                  onCheckedChange={(val) => updatePaystackConfig({ testMode: val })}
                />
              </div>
            </div>
          </div>

          {/* ANDROID WEBVIEW NATIVE BRIDGE */}
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-emerald-500" />
                <h4 className="font-display text-sm font-bold text-foreground">
                  Android WebView Bridge
                </h4>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Native App Platform
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  JavaScriptInterface Object Name
                </Label>
                <Input
                  value={pricingConfig.androidBridge?.bridgeInterfaceName || "AndroidBridge"}
                  onChange={(e) =>
                    updateAndroidBridgeConfig({ bridgeInterfaceName: e.target.value })
                  }
                  placeholder="AndroidBridge"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  External Checkout Fallback URL
                </Label>
                <Input
                  value={
                    pricingConfig.androidBridge?.sandboxCheckoutUrl ||
                    "https://checkout.circlepanda.app/pay"
                  }
                  onChange={(e) =>
                    updateAndroidBridgeConfig({ sandboxCheckoutUrl: e.target.value })
                  }
                  placeholder="https://checkout.circlepanda.app/pay"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    Bridge Auto-Dispatch Enabled
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Directs Android WebView users to the native payment channel
                  </p>
                </div>
                <Switch
                  checked={pricingConfig.androidBridge?.enabled ?? true}
                  onCheckedChange={(val) => updateAndroidBridgeConfig({ enabled: val })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT COIN PACKAGE DIALOG */}
      <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              {isCreatingPkg ? "Add New Coin Package" : `Edit ${editingPkg?.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define coin quantity, pricing, and bonus highlight tags.
            </DialogDescription>
          </DialogHeader>

          {editingPkg ? (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Package Name</Label>
                  <Input
                    value={editingPkg.name}
                    onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                    placeholder="e.g. Panda Popular Pack"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Icon Emoji</Label>
                  <Input
                    value={editingPkg.icon || "🪙"}
                    onChange={(e) => setEditingPkg({ ...editingPkg, icon: e.target.value })}
                    placeholder="🪙"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Price ($ USD)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    value={editingPkg.price}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, price: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Panda Coins (BC)</Label>
                  <Input
                    type="number"
                    step="100"
                    value={editingPkg.coins}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, coins: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">
                  Bonus Tag (e.g. "Standard anchor price", "Includes scaling bonus value")
                </Label>
                <Input
                  value={editingPkg.bonusTag || ""}
                  onChange={(e) => setEditingPkg({ ...editingPkg, bonusTag: e.target.value })}
                  placeholder="e.g. Includes highest bonus value tag"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold">
                  Badge Pill (e.g. "Most Popular", "Best Value")
                </Label>
                <Input
                  value={editingPkg.badge || ""}
                  onChange={(e) => setEditingPkg({ ...editingPkg, badge: e.target.value })}
                  placeholder="e.g. Most Popular"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Description</Label>
                <Textarea
                  value={editingPkg.description}
                  onChange={(e) => setEditingPkg({ ...editingPkg, description: e.target.value })}
                  placeholder="Description of what this package unlocks..."
                  className="mt-1 text-xs resize-none h-18"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPkg.isPopular || false}
                    onCheckedChange={(val) => setEditingPkg({ ...editingPkg, isPopular: val })}
                  />
                  <Label className="text-xs font-semibold">Anchor / Popular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPkg.isBestValue || false}
                    onCheckedChange={(val) => setEditingPkg({ ...editingPkg, isBestValue: val })}
                  />
                  <Label className="text-xs font-semibold">Best Value Accent</Label>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPkgDialogOpen(false)}
              className="h-8.5 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePkg}
              className="h-8.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
            >
              Save Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT VIP PLAN DIALOG */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              {isCreatingPlan ? "Add VIP Subscription Plan" : `Edit ${editingPlan?.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure recurring VIP duration, pricing, and perk bullet points.
            </DialogDescription>
          </DialogHeader>

          {editingPlan ? (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Plan Name</Label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g. Monthly VIP Pass"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Billing Period Label</Label>
                  <Input
                    value={editingPlan.billingPeriod}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, billingPeriod: e.target.value })
                    }
                    placeholder="e.g. per month"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Price ($ USD)</Label>
                  <Input
                    type="number"
                    step="0.50"
                    value={editingPlan.price}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Duration (Days)</Label>
                  <Input
                    type="number"
                    value={editingPlan.durationDays}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        durationDays: parseInt(e.target.value, 10) || 7,
                      })
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">
                  Badge (e.g. "Better Long-Term Value")
                </Label>
                <Input
                  value={editingPlan.badge || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                  placeholder="e.g. Better Long-Term Value"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Description</Label>
                <Textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="Description of the VIP subscription..."
                  className="mt-1 text-xs resize-none h-16"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Perks List (one per line)</Label>
                <Textarea
                  value={perksText}
                  onChange={(e) => setPerksText(e.target.value)}
                  placeholder="Golden Panda VIP Crown badge&#10;Priority speed dating queue&#10;Unlimited Hot Seat questions"
                  className="mt-1 text-xs resize-none h-24 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={editingPlan.isHighlighted}
                  onCheckedChange={(val) => setEditingPlan({ ...editingPlan, isHighlighted: val })}
                />
                <Label className="text-xs font-semibold">
                  Highlight as Better Long-Term Value (Glowing accent)
                </Label>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPlanDialogOpen(false)}
              className="h-8.5 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePlan}
              className="h-8.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400"
            >
              Save VIP Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LIVE STORE PREVIEW MODAL */}
      <CoinStoreModal open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
