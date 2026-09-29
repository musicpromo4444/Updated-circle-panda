# Circle Panda Native Store Bridge

The web checkout selects the provider automatically:
- Web/outside app-store builds -> Paystack
- Google Play Android -> Google Play Billing
- iOS App Store -> Apple StoreKit

The native shell must never award BC/VIP locally. The signed-in Circle Panda user ID is included in the purchase payload so the native billing request can bind the store transaction to the correct account.

## Completion callback

After the native store purchase succeeds, the Android/iOS shell must call:

`window.CirclePandaNativePurchaseComplete(JSON.stringify(payload))`

Google Play payload:

`{ "reference": "CP_GPLAY_...", "success": true, "purchaseToken": "...", "productId": "..." }`\n\nThe Android shell must pass the SHA-256 of the `accountId` from the purchase payload into Google Play Billing `setObfuscatedAccountId()`. The backend checks the returned `obfuscatedExternalAccountId` against the authenticated user.

Apple StoreKit payload:

`{ "reference": "CP_APPLE_...", "success": true, "signedTransaction": "<StoreKit JWS>", "productId": "..." }`\n\nThe iOS shell must use the `accountId` from the purchase payload as the StoreKit `appAccountToken(UUID)`. The backend checks the returned token against the authenticated user.

If the user cancels:

`{ "reference": "...", "success": false, "message": "Purchase cancelled" }`

The browser sends the token/JWS to the matching Supabase Edge Function. Only a successful server verification can deliver BC/VIP.

## Server functions

- `verify-google-play-purchase`
- `verify-apple-iap-purchase`
- `apple-iap-notifications`

Google Play requires the server service-account credentials and Android package name in Supabase Edge Function secrets.

Apple requires the App Store Server API In-App Purchase key, key ID, issuer ID and bundle ID in Supabase Edge Function secrets.

Product IDs remain in `store_catalog.android_product_id` and `store_catalog.ios_product_id` and are configured by Admin. Private credentials never belong in `VITE_*` variables.
