# Circle Panda #1 — Payment Production Checklist

## Implemented
- Web Paystack checkout remains server-verified and amount-checked against the live store catalog.
- Provider routing automatically selects Paystack, Google Play, or Apple IAP according to the running platform/native bridge.
- Native product IDs are read from the server-backed store catalog.
- Native purchases no longer award BC/VIP from the client.
- Google Play purchase verification uses the Play Developer API, account binding, acknowledgement, and backend consumption for BC packages.
- Apple IAP verification uses the App Store Server API, account binding, and transaction lookup.
- Native payment transactions are idempotent and provider-transaction protected.
- Native VIP expiry is stored from the real store transaction.
- Apple server notifications endpoint is deployed.
- Google Play RTDN endpoint is deployed with duplicate-message protection.
- Refund/revocation lifecycle state is persisted and VIP entitlement is recalculated across verified payment sources.
- Native bridge contract is documented in `NATIVE-STORE-BRIDGE.md`.

## External activation still required before #1 can be called complete
1. Create/activate the six matching products in Google Play/App Store:
   - 4 BC consumable products
   - 2 VIP subscriptions
2. Put the exact Google Play and Apple product IDs into Circle Panda Admin/store_catalog.
3. Add the production Google Play service-account JSON and package name to Supabase Edge Function Secrets.
4. Add the Apple In-App Purchase key, key ID, issuer ID and bundle ID to Supabase Edge Function Secrets.
5. Set the Google RTDN secret and configure the Google Play Pub/Sub push subscription to the deployed RTDN endpoint.
6. Configure the Apple App Store Server Notifications V2 URL to the deployed Apple notification endpoint.
7. Run real sandbox/test purchases on Android and iOS and verify BC delivery, VIP activation, renewal, cancellation/refund handling, and repeated purchases.

Until those store-console products, secrets, and end-to-end sandbox tests are done, **#1 is intentionally not marked complete**.
