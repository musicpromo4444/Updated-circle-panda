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

Google Play package name, service-account JSON, and RTDN secret are entered in Circle Panda Admin under Production payment setup. The private values are stored in Supabase Vault. Product IDs remain in `store_catalog.android_product_id` and are configured by Admin.

Apple bundle ID, Team ID, issuer ID, key ID, and App Store Server API private key are entered in Circle Panda Admin under Production payment setup. The private key is stored in Supabase Vault. Private credentials never belong in `VITE_*` variables.

## Google Play subscription lifecycle

The backend also exposes `google-play-rtdn` for Google Play Real-time Developer Notifications. Configure a Pub/Sub push subscription to:
`https://<supabase-project>.supabase.co/functions/v1/google-play-rtdn?token=<GOOGLE_PLAY_RTDN_SECRET>`

The Admin Dashboard is the configuration surface for these values. You do not need to create the Apple/Google console accounts while Circle Panda is being built. When those accounts exist, enter the real values in Admin and no code change is required.

Google Play and Apple both require their store-side products/subscriptions to exist and be active before the matching IDs in Circle Panda can process real purchases.