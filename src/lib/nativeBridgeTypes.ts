export interface AndroidBridgeApi {
  openUrl?: (url: string) => void;
  trackAdImpression?: (adId: string, format: string) => void;
  trackAdClick?: (adId: string, format: string) => void;
  onRewardedAdComplete?: (rewardAmount: number) => void;
  showNativeInterstitial?: (placementId: string) => boolean;
  isWebView?: () => boolean;
  initiatePayment?: (payloadJson: string) => boolean;
  onPaymentComplete?: (success: boolean, transactionId: string) => void;
  getDistribution?: () => "google_play" | "external";
  requestGooglePlayPurchase?: (payloadJson: string) => boolean;
  onPurchaseResult?: (payloadJson: string) => void;
}

export interface AndroidLegacyApi {
  openUrl?: (url: string) => void;
  trackAdImpression?: (adId: string, format: string) => void;
  trackAdClick?: (adId: string, format: string) => void;
  initiatePayment?: (payloadJson: string) => boolean;
  requestGooglePlayPurchase?: (payloadJson: string) => boolean;
}
