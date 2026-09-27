export interface CoinPackage {
  id: string;
  name: string;
  price: number;
  priceNgn?: number;
  coins: number;
  bonusTag?: string;
  description: string;
  badge?: string;
  enabled: boolean;
  isPopular?: boolean;
  isBestValue?: boolean;
  icon?: string;
  paystackProductCode?: string;
  androidProductId?: string;
  iosProductId?: string;
}

export interface VipPlan {
  id: string;
  name: string;
  price: number;
  priceNgn?: number;
  interval: "week" | "month";
  durationDays: number;
  billingPeriod: string;
  description: string;
  badge?: string;
  isHighlighted: boolean;
  enabled: boolean;
  perks: string[];
  paystackProductCode?: string;
  androidProductId?: string;
  iosProductId?: string;
}

export interface PaystackGatewayConfig {
  publicKey: string;
  currency: "USD" | "NGN";
  exchangeRateNgn: number;
  testMode: boolean;
  merchantName: string;
}

export interface AndroidBridgeGatewayConfig {
  enabled: boolean;
  bridgeInterfaceName: string;
  fallbackToBrowser: boolean;
  sandboxCheckoutUrl: string;
}

export interface NativeStoreProductConfig {
  provider: "google_play" | "apple_iap";
  enabled: boolean;
  productIds: Record<string, string>;
  subscriptionIds: Record<string, string>;
}

export interface PricingConfig {
  packages: CoinPackage[];
  vipPlans: VipPlan[];
  paystack: PaystackGatewayConfig;
  androidBridge: AndroidBridgeGatewayConfig;
  googlePlay: NativeStoreProductConfig;
  appleIap: NativeStoreProductConfig;
  lastUpdated?: string;
}
