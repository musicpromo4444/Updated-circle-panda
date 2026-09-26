import type { CoinPackage, PricingConfig, VipPlan } from "@/lib/pricingTypes";

declare global {
  interface Window {
    AndroidBridge?: {
      openUrl?: (url: string) => void;
      initiatePayment?: (payloadJson: string) => boolean;
      isWebView?: () => boolean;
      onPaymentComplete?: (success: boolean, transactionId: string) => void;
    getDistribution?: () => "google_play" | "external";
      requestGooglePlayPurchase?: (payloadJson: string) => boolean;
    };
    Android?: {
      openUrl?: (url: string) => void;
      initiatePayment?: (payloadJson: string) => boolean;
      requestGooglePlayPurchase?: (payloadJson: string) => boolean;
    };
    CirclePandaIOS?: {
      requestApplePurchase?: (payloadJson: string) => boolean;
    };
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
    ? catalog?.subscriptionIds[item.id]
    : catalog?.productIds[item.id];

  if (!productId) {
    return {
      success: false,
      platformUsed: platform,
      reference,
      message: `${platform === "google_play" ? "Google Play" : "Apple IAP"} product ID is not configured yet.`,
    };
  }

  const payload = JSON.stringify({
    reference,
    productId,
    itemId: item.id,
    itemType,
    customerEmail: userEmail,
    timestamp: Date.now(),
  });

  onStatus?.(`Opening ${platform === "google_play" ? "Google Play" : "Apple"} purchase...`);

  try {
    const dispatched = platform === "google_play"
      ? (window.AndroidBridge?.requestGooglePlayPurchase?.(payload) ?? window.Android?.requestGooglePlayPurchase?.(payload) ?? false)
      : (window.CirclePandaIOS?.requestApplePurchase?.(payload) ?? false);
    if (!dispatched) {
      return { success: false, platformUsed: platform, reference, message: "Native store purchase bridge is unavailable." };
    }
    // Native shells must complete the purchase and send the signed receipt/token
    // to the backend. The browser does not award currency from this dispatch.
    return { success: true, platformUsed: platform, reference, message: "Native store purchase started. Server receipt verification is required." };
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
