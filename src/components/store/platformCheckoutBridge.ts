import type { CoinPackage, PricingConfig, VipPlan } from "@/lib/pricingTypes";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    AndroidBridge?: {
      openUrl?: (url: string) => void;
      initiatePayment?: (payloadJson: string) => boolean;
      isWebView?: () => boolean;
      onPaymentComplete?: (success: boolean, transactionId: string) => void;
    getDistribution?: () => "google_play" | "external";
      requestGooglePlayPurchase?: (payloadJson: string) => boolean;
      onPurchaseResult?: (payloadJson: string) => void;
    };
    Android?: {
      openUrl?: (url: string) => void;
      initiatePayment?: (payloadJson: string) => boolean;
      requestGooglePlayPurchase?: (payloadJson: string) => boolean;
    };
    CirclePandaIOS?: {
      requestApplePurchase?: (payloadJson: string) => boolean;
      onPurchaseResult?: (payloadJson: string) => void;
    };
    CirclePandaNativePurchaseComplete?: (payloadJson: string) => void;
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        callback: (response: { reference: string; status: string }) => void;
        onClose: () => void;
        metadata?: Record<string, unknown>;
      }) => { openIframe: () => void };
    };
  }
}

export type CheckoutPlatform = "auto" | "web_paystack" | "google_play" | "apple_iap";
export type EffectiveCheckoutPlatform = "web_paystack" | "google_play" | "apple_iap";

export interface CheckoutRequest {
  item: CoinPackage | VipPlan;
  itemType: "coin_package" | "vip_subscription";
  userEmail?: string;
  userName?: string;
  paystackPublicKey?: string;
  exchangeRateNgn?: number;
  pricingConfig?: PricingConfig;
}

export interface CheckoutResult {
  success: boolean;
  platformUsed: EffectiveCheckoutPlatform;
  reference?: string;
  message?: string;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function getAndroidDistribution(): "google_play" | "external" {
  if (typeof window !== "undefined") {
    const bridge = window.AndroidBridge?.getDistribution;
    if (typeof bridge === "function") {
      try {
        return bridge() === "google_play" ? "google_play" : "external";
      } catch {
        return "external";
      }
    }
  }
  return "external";
}

function hasAndroidNativeBridge(): boolean {
  return typeof window !== "undefined" && (
    typeof window.AndroidBridge?.requestGooglePlayPurchase === "function" ||
    typeof window.Android?.requestGooglePlayPurchase === "function"
  );
}

function hasIosNativeBridge(): boolean {
  return typeof window !== "undefined" &&
    typeof window.CirclePandaIOS?.requestApplePurchase === "function";
}

/**
 * Automatic provider routing. Native store billing is selected only when the
 * installed native shell exposes a purchase bridge; otherwise web/Paystack is
 * used. This lets the same web code be packaged outside an app store without
 * requiring a manual admin switch.
 */
export function resolveEffectivePlatform(
  preference: CheckoutPlatform = "auto",
): EffectiveCheckoutPlatform {
  if (preference === "web_paystack") return "web_paystack";
  if (preference === "google_play") return "google_play";
  if (preference === "apple_iap") return "apple_iap";
  if (isIos() && hasIosNativeBridge()) return "apple_iap";
  if (isAndroid() && getAndroidDistribution() === "google_play" && hasAndroidNativeBridge()) return "google_play";
  return "web_paystack";
}

function makeReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function executeNativeStoreCheckout(
  request: CheckoutRequest,
  platform: "google_play" | "apple_iap",
  onStatus?: (status: string) => void,
): Promise<CheckoutResult> {
  const { item, itemType, userEmail = "" } = request;
  const reference = makeReference(platform === "google_play" ? "CP_GPLAY" : "CP_APPLE");
  const catalog = platform === "google_play" ? request.pricingConfig?.googlePlay : request.pricingConfig?.appleIap;
  const productId = itemType === "vip_subscription"
    ? (item as VipPlan).androidProductId && platform === "google_play" ? (item as VipPlan).androidProductId : platform === "apple_iap" && (item as VipPlan).iosProductId ? (item as VipPlan).iosProductId : catalog?.subscriptionIds[item.id]
    : (item as CoinPackage).androidProductId && platform === "google_play" ? (item as CoinPackage).androidProductId : platform === "apple_iap" && (item as CoinPackage).iosProductId ? (item as CoinPackage).iosProductId : catalog?.productIds[item.id];

  if (!productId) {
    return {
      success: false,
      platformUsed: platform,
      reference,
      message: `${platform === "google_play" ? "Google Play" : "Apple IAP"} product ID is not configured yet.`,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, platformUsed: platform, reference, message: "You must be signed in to purchase." };

  const payload = JSON.stringify({
    reference,
    accountId: user.id,
    productId,
    itemId: item.id,
    itemType,
    customerEmail: userEmail,
    timestamp: Date.now(),
  });

  onStatus?.(`Opening ${platform === "google_play" ? "Google Play" : "Apple"} purchase...`);

  try {
    let resolveNative!: (value: any) => void;
    const nativeResultPromise = new Promise<any>((resolve) => { resolveNative = resolve; });
    const handler = (raw: string) => {
      try { const parsed = typeof raw === "string" ? JSON.parse(raw) : raw; if (parsed?.reference === reference) resolveNative(parsed); } catch { /* ignore malformed bridge events */ }
    };
    window.CirclePandaNativePurchaseComplete = handler;
    const timer = window.setTimeout(() => resolveNative({ reference, success: false, message: "Native store purchase timed out." }), 10 * 60 * 1000);
    (window as any).__circlePandaNativeCleanup = () => {
      window.clearTimeout(timer);
      if (window.CirclePandaNativePurchaseComplete === handler) delete window.CirclePandaNativePurchaseComplete;
    };
    const dispatched = platform === "google_play"
      ? (window.AndroidBridge?.requestGooglePlayPurchase?.(payload) ?? window.Android?.requestGooglePlayPurchase?.(payload) ?? false)
      : (window.CirclePandaIOS?.requestApplePurchase?.(payload) ?? false);
    if (!dispatched) {
      (window as any).__circlePandaNativeCleanup?.();
      return { success: false, platformUsed: platform, reference, message: "Native store purchase bridge is unavailable." };
    }
    const nativeResult = await nativeResultPromise;
    if (!nativeResult?.success) {
      (window as any).__circlePandaNativeCleanup?.();
      return { success: false, platformUsed: platform, reference, message: nativeResult?.message || "Native store purchase was not completed." };
    }
    onStatus?.("Verifying the store purchase securely...");
    const functionName = platform === "google_play" ? "verify-google-play-purchase" : "verify-apple-iap-purchase";
    const body: Record<string, unknown> = platform === "google_play"
      ? { reference, itemId: item.id, itemType, purchaseToken: nativeResult.purchaseToken }
      : { reference, itemId: item.id, itemType, signedTransaction: nativeResult.signedTransaction || nativeResult.jwsRepresentation };
    if (!body.purchaseToken && !body.signedTransaction) throw new Error("Native purchase receipt/token was not returned.");
    const verification = await supabase.functions.invoke(functionName, { body });
    (window as any).__circlePandaNativeCleanup?.();
    if (verification.error || !verification.data?.ok) throw new Error(verification.data?.error || verification.error?.message || "Native store verification failed");
    return { success: true, platformUsed: platform, reference, message: "Purchase verified and delivered securely." };
  } catch {
    return { success: false, platformUsed: platform, reference, message: "Native store purchase could not be started." };
  }
}

export async function executeWebPaystackCheckout(
  request: CheckoutRequest,
  onStatus?: (status: string) => void,
): Promise<CheckoutResult> {
  const { item, itemType, userEmail = "" } = request;
  const key = request.paystackPublicKey?.trim();
  if (!key) throw new Error("Paystack public key is not configured.");
  if (typeof window === "undefined") throw new Error("Web checkout is unavailable.");
  if (!window.PaystackPop?.setup) throw new Error("Paystack checkout is not loaded.");
  const reference = makeReference("CP_PSTK");
  const amount = Math.round((item.priceNgn ?? item.price * (request.exchangeRateNgn || 1500)) * 100);
  onStatus?.("Opening secure Paystack checkout...");
  return await new Promise((resolve, reject) => {
    const popup = window.PaystackPop!.setup({
      key,
      email: userEmail,
      amount,
      currency: "NGN",
      ref: reference,
      metadata: { itemId: item.id, itemType },
      callback: (response) => resolve({
        success: response.status === "success",
        platformUsed: "web_paystack",
        reference: response.reference,
        message: response.status === "success" ? "Payment accepted by Paystack; server verification required." : "Payment was not confirmed.",
      }),
      onClose: () => resolve({ success: false, platformUsed: "web_paystack", reference, message: "Checkout was closed before confirmation." }),
    });
    try { popup.openIframe(); } catch (e) { reject(e); }
  });
}
