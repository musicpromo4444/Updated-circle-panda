import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const body = await req.json();
    const reference = String(body.reference || "").trim();
    const itemType = body.itemType === "vip_subscription" ? "vip_subscription" : "coin_package";
    const itemId = String(body.itemId || "").trim();
    if (!reference || !itemId) return new Response(JSON.stringify({ error: "Missing payment details" }), { status: 400 });

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = auth.replace(/^Bearer\s+/i, "");
    const { data: { user } } = await service.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { data: providerSettings } = await service.from("payment_provider_settings").select("paystack_enabled").eq("id",1).single();
    if (!providerSettings?.paystack_enabled) return new Response(JSON.stringify({ error: "Paystack is disabled in Circle Panda Admin" }), { status: 503 });
    const { data: secret, error: secretError } = await service.rpc("service_get_payment_secret",{p_name:"circle_panda_paystack_secret_key"});
    if (secretError || !secret) return new Response(JSON.stringify({ error: "Paystack secret key is not configured in Circle Panda Admin" }), { status: 503 });

    const verify = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const payload = await verify.json();
    if (!verify.ok || payload?.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment could not be verified" }), { status: 400 });
    }

    const amount = Number(payload.data.amount || 0);
    const currency = String(payload.data.currency || "");
    const metadata = payload.data.metadata || {};
    if (currency !== "NGN" || !Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payment amount" }), { status: 400 });
    }
    if (metadata.itemId && String(metadata.itemId) !== itemId) {
      return new Response(JSON.stringify({ error: "Payment item mismatch" }), { status: 400 });
    }
    if (metadata.userId && String(metadata.userId) !== user.id) {
      return new Response(JSON.stringify({ error: "Payment user mismatch" }), { status: 400 });
    }

    const { data: catalog, error: catalogError } = await service
      .from("store_catalog")
      .select("id,item_type,price_ngn,enabled")
      .eq("id", itemId)
      .eq("enabled", true)
      .maybeSingle();
    if (catalogError) throw catalogError;
    if (!catalog || catalog.item_type !== itemType) {
      return new Response(JSON.stringify({ error: "Store item is not available" }), { status: 400 });
    }
    if (Math.round(Number(catalog.price_ngn) * 100) !== amount) {
      return new Response(JSON.stringify({ error: "Payment amount does not match the store item" }), { status: 400 });
    }

    const { data: fulfillment, error: fulfillmentError } = await service.rpc("fulfill_store_purchase_verified", {
      p_user_id: user.id,
      p_reference: reference,
      p_item_id: itemId,
      p_item_type: itemType,
      p_amount_ngn: amount,
      p_metadata: {
        paystack_transaction_id: payload.data.id,
        channel: payload.data.channel,
        customer_code: payload.data.customer?.customer_code ?? null,
      },
    });
    if (fulfillmentError) throw fulfillmentError;

    return new Response(JSON.stringify({
      ok: true,
      reference,
      alreadyVerified: Boolean(fulfillment?.already_verified),
      balance: fulfillment?.balance ?? null,
      vipExpiresAt: fulfillment?.vip_expires_at ?? null,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Verification failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});