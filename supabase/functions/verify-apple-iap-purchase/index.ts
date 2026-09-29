import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AppStoreServerAPIClient, Environment } from "npm:@apple/app-store-server-library";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
function decodePayload(jws:string){const p=jws.split(".")[1];if(!p)throw new Error("Invalid Apple signed transaction");return JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((p.length+3)%4)));}
async function appleClient(env:Environment){
 const key=Deno.env.get("APPLE_IAP_PRIVATE_KEY"),keyId=Deno.env.get("APPLE_IAP_KEY_ID"),issuer=Deno.env.get("APPLE_IAP_ISSUER_ID"),bundle=Deno.env.get("APPLE_IAP_BUNDLE_ID");
 if(!key||!keyId||!issuer||!bundle)throw new Error("Apple IAP server credentials are not configured");
 return {client:new AppStoreServerAPIClient(key.replace(/\\n/g,"\n"),keyId,issuer,bundle,env),bundle};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:cors});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:{user}}=await supabase.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:cors});
  await supabase.from("native_store_account_bindings").upsert({user_id:user.id,apple_app_account_token:user.id,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  const body=await req.json(),signedTransaction=String(body.signedTransaction||body.jwsRepresentation||"").trim(),requestedItemId=String(body.itemId||"").trim(),itemType=body.itemType==="vip_subscription"?"vip_subscription":"coin_package",reference=String(body.reference||"").trim();
  if(!signedTransaction||!reference)return new Response(JSON.stringify({ok:false,error:"Missing Apple purchase details"}),{status:400,headers:cors});
  const hinted=decodePayload(signedTransaction);
  const env=String(hinted.environment||"Production")==="Sandbox"?Environment.SANDBOX:Environment.PRODUCTION;
  const {client,bundle}=await appleClient(env);
  if(hinted.bundleId&&hinted.bundleId!==bundle)throw new Error("Apple bundle ID mismatch");
  const transactionId=String(hinted.transactionId||"");if(!transactionId)throw new Error("Apple transaction ID missing");
  const response=await client.getTransactionInfo(transactionId);
  const transactionJws=(response as any).signedTransactionInfo;if(!transactionJws)throw new Error("Apple did not return signed transaction information");
  const verified=decodePayload(transactionJws);if(verified.bundleId!==bundle)throw new Error("Apple bundle ID mismatch");
  const productId=String(verified.productId||"");if(!productId)throw new Error("Apple product ID missing");
  if(String(verified.appAccountToken||"")!==user.id) {
    return new Response(JSON.stringify({ok:false,error:"Apple purchase is not linked to this Circle Panda account"}),{status:403,headers:cors});
  }
  const expiresAt=verified.expiresDate?new Date(Number(verified.expiresDate)).toISOString():null;
  if(itemType==="vip_subscription"&&(!expiresAt||new Date(expiresAt).getTime()<=Date.now()))throw new Error("Apple subscription is not currently entitled");
  if(verified.revocationDate)throw new Error("Apple transaction has been revoked");
  const {data:catalog,error}=await supabase.from("store_catalog").select("id,item_type,ios_product_id,enabled").eq("ios_product_id",productId).eq("item_type",itemType).eq("enabled",true).maybeSingle();
  if(error||!catalog)return new Response(JSON.stringify({ok:false,error:"Apple product is not configured in Circle Panda"}),{status:400,headers:cors});
  if(requestedItemId&&requestedItemId!==catalog.id)return new Response(JSON.stringify({ok:false,error:"Store item mismatch"}),{status:400,headers:cors});
  const metadata={provider:"apple_iap",product_id:productId,bundle_id:bundle,transaction_id:transactionId,original_transaction_id:verified.originalTransactionId||null,environment:String(verified.environment||"Production"),signed_date:verified.signedDate||null};
  const {data:fulfillment,error:fulfillmentError}=await supabase.rpc("fulfill_native_store_purchase_verified",{p_user_id:user.id,p_reference:reference,p_provider:"apple_iap",p_provider_transaction_id:transactionId,p_item_id:catalog.id,p_item_type:itemType,p_provider_currency:verified.currency?String(verified.currency):null,p_provider_amount_minor:verified.price!=null?Number(verified.price):null,p_quantity:1,p_expires_at:expiresAt,p_environment:String(verified.environment||"Production"),p_metadata:metadata});
  if(fulfillmentError)throw fulfillmentError;
  return new Response(JSON.stringify({ok:true,provider:"apple_iap",reference,productId,providerTransactionId:transactionId,fulfillment}),{headers:cors});
 }catch(e){console.error(e);return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:"Verification failed"}),{status:500,headers:cors});}
});