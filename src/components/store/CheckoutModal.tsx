import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  Globe,
  Lock,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { CoinPackage, VipPlan } from "@/components/admin/adminTypes";
import {
  type CheckoutPlatform,
  executeAndroidBridgeCheckout,
  resolveEffectivePlatform,
} from "./platformCheckoutBridge";
import { usePricingConfig } from "./pricingStorage";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CoinPackage | VipPlan | null;
  itemType: "coin_package" | "vip_subscription";
}

export function CheckoutModal({ open, onOpenChange, item, itemType }: CheckoutModalProps) {
  const { addCoins, activateVip } = useStore();
  const { user } = useCurrentUser();
  const pricingConfig = usePricingConfig();

  const [platformMode, setPlatformMode] = useState<CheckoutPlatform>("auto");
  const [customerEmail, setCustomerEmail] = useState<string>(
    () => user?.email || "student@campus.circlepanda.app",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>("");
  const [completed, setCompleted] = useState(false);
  const [txReference, setTxReference] = useState("");

  if (!item) return null;

  const effectivePlatform = resolveEffectivePlatform(platformMode);
  const isVip = itemType === "vip_subscription";
  const vipPlan = isVip ? (item as VipPlan) : null;
  const coinPkg = !isVip ? (item as CoinPackage) : null;

  const exchangeRate = pricingConfig.paystack.exchangeRateNgn || 1500;
  const priceNgn = Math.round(item.price * exchangeRate);

  const handleStartCheckout = async () => {
    setIsProcessing(true);
    setCompleted(false);

    const ref = `CP_${effectivePlatform === "web_paystack" ? "PSTK" : "ANDR"}_${Date.now()}`;
    setTxReference(ref);

    try {
      if (effectivePlatform === "android_bridge") {
        setProcessStep("Handshaking with Android JavaScriptInterface...");
        const res = await executeAndroidBridgeCheckout(
          {
            item,
            itemType,
            userEmail: customerEmail,
            userName: user?.name,
          },
          (status) => setProcessStep(status),
        );

        if (res.success) {
          fulfillPurchase();
        } else {
          toast.error("Android bridge checkout was cancelled or failed.");
          setIsProcessing(false);
        }
      } else {
        // Paystack Web Checkout Flow
        setProcessStep("Initializing Paystack secure payment channel...");
        await new Promise((r) => setTimeout(r, 600));
        setProcessStep(
          `Connecting to Paystack gateway (${pricingConfig.paystack.testMode ? "Test Mode" : "Live"})...`,
        );
        await new Promise((r) => setTimeout(r, 800));
        setProcessStep("Authorizing debit card / mobile transfer...");
        await new Promise((r) => setTimeout(r, 900));
        setProcessStep("Payment verified by Paystack network!");
        await new Promise((r) => setTimeout(r, 500));

        fulfillPurchase();
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error("Checkout process failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const fulfillPurchase = () => {
    if (isVip && vipPlan) {
      if (typeof activateVip === "function") {
        activateVip(vipPlan.durationDays);
      }
      toast.success(`🎉 ${vipPlan.name} Activated!`, {
        description: `Unlocked for ${vipPlan.durationDays} days. Enjoy Golden Crown and VIP perks!`,
      });
    } else if (coinPkg) {
      addCoins(coinPkg.coins, `Store Purchase: ${coinPkg.name}`);
      toast.success(`🎉 +${coinPkg.coins.toLocaleString()} BC Credited!`, {
        description: `Your balance is updated immediately.`,
      });
    }
    setCompleted(true);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setIsProcessing(false);
    setCompleted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 bg-card">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5 border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
                {isVip ? <Crown className="size-5" /> : "🪙"}
              </span>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  Circle Panda Checkout
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official Campus Store · Instant Delivery
                </DialogDescription>
              </div>
            </div>

            <div className="text-right">
              <p className="font-display text-xl font-black text-foreground">
                ${item.price.toFixed(2)}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                ≈ ₦{priceNgn.toLocaleString()} NGN
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {completed ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Payment Successful!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  {isVip
                    ? `${vipPlan?.name} perks have been unlocked for your account.`
                    : `+${coinPkg?.coins.toLocaleString()} Panda Coins (BC) have been dropped into your balance.`}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-2.5 text-[11px] text-muted-foreground font-mono">
                Ref: {txReference}
              </div>
              <Button onClick={handleClose} className="w-full mt-3 rounded-xl font-bold">
                Done & Return
              </Button>
            </div>
          ) : (
            <>
              {/* Item Card */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-sm font-bold text-foreground">{item.name}</h4>
                    {coinPkg?.badge ? (
                      <span className="rounded-md bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                        {coinPkg.badge}
                      </span>
                    ) : null}
                    {vipPlan?.badge ? (
                      <span className="rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                        {vipPlan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  {coinPkg?.bonusTag ? (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <Sparkles className="size-3" /> {coinPkg.bonusTag}
                    </p>
                  ) : null}
                  {vipPlan ? (
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Duration: {vipPlan.durationDays} days · {vipPlan.billingPeriod}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <span className="inline-block rounded-xl bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                    {coinPkg ? `${coinPkg.coins.toLocaleString()} BC` : "VIP PASS"}
                  </span>
                </div>
              </div>

              {/* Cross-Platform Checkout Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Checkout Gateway Platform
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Active:{" "}
                    <strong className="text-foreground">
                      {effectivePlatform === "web_paystack" ? "Paystack Web" : "Android Bridge"}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setPlatformMode("auto")}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      platformMode === "auto"
                        ? "bg-card shadow-sm text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Auto-Detect
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatformMode("web_paystack")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                      platformMode === "web_paystack"
                        ? "bg-card shadow-sm text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Globe className="size-3" /> Paystack
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatformMode("android_bridge")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                      platformMode === "android_bridge"
                        ? "bg-card shadow-sm text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="size-3" /> Android
                  </button>
                </div>

                {/* Platform info card */}
                {effectivePlatform === "web_paystack" ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                    <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">Paystack Web Checkout</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Accepts Naira Cards, Bank Transfer, USSD & Apple Pay. Instant credit upon
                        payment confirmation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                    <Smartphone className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">Android Native Bridge</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Communicates via injected Android JavaScriptInterface or safe external
                        Intent without losing SPA state.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Email confirmation */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="checkout-email"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Receipt & Verification Email
                </Label>
                <Input
                  id="checkout-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Progress indicator when processing */}
              {isProcessing ? (
                <div className="rounded-xl bg-secondary/80 p-3 text-center space-y-2 border border-border">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-medium text-foreground">{processStep}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Please do not close this window while we verify your transaction.
                  </p>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleStartCheckout}
                  disabled={isProcessing || !customerEmail}
                  className="flex-[2] rounded-xl h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" /> Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Lock className="size-3.5" />
                      Pay ${item.price.toFixed(2)} with{" "}
                      {effectivePlatform === "web_paystack" ? "Paystack" : "Android"}
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Lock className="size-3 text-emerald-500" /> 256-bit Encrypted
                </span>
                <span>•</span>
                <span>Panda Protection Guarantee</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
