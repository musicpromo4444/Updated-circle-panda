import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AppStoreServerAPIClient, Environment } from "npm:@apple/app-store-server-library";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Content-Type":"application/json"};
function decodePayload(jws:string){const p=jws.split(".")[1];if(!p)throw new Error("Invalid Apple JWS");return JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((p.length+3)%4)));}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const {signedPayload}=await req.json();if(!signedPayload)throw new Error("Missing signedPayload");
  const payload=decodePayload(String(signedPayload)),data=payload.data||{},env=data.environment==="Sandbox"?Environment.SANDBOX:Environment.PRODUCTION;
  const key=Deno.env.get("APPLE_IAP_PRIVATE_KEY")!,keyId=Deno.env.get("APPLE_IAP_KEY_ID")!,issuer=Deno.env.get("APPLE_IAP_ISSUER_ID")!,bundle=Deno.env.get("APPLE_IAP_BUNDLE_ID")!;
  const client=new AppStoreServerAPIClient(key.replace(/\\n/g,"\n"),keyId,issuer,bundle,env);
  const hinted=data.signedTransactionInfo?decodePayload(data.signedTransactionInfo):null;const transactionId=String(hinted?.transactionId||"");if(!transactionId)throw new Error("Apple transaction ID missing");
  const response=await client.getTransactionInfo(transactionId);
  const txJws=(response as any).signedTransactionInfo;if(!txJws)throw new Error("Apple transaction lookup failed");
  const tx=decodePayload(txJws);if(tx.bundleId!==bundle)throw new Error("Apple bundle ID mismatch");
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const original=String(tx.originalTransactionId||transactionId),expiresAt=tx.expiresDate?new Date(Number(tx.expiresDate)).toISOString():null;
  const {data:existing}=await supabase.from("native_store_transactions").select("id,user_id,item_id,item_type").eq("provider","apple_iap").eq("provider_transaction_id",transactionId).maybeSingle();
  const type=String(payload.notificationType||"");const revoked=["REFUND","REVOKE","DID_REVOKE"].includes(type)||Boolean(tx.revocationDate);const status=revoked?"revoked":"verified";
  if(existing){await supabase.from("native_store_transactions").update({status,expires_at:expiresAt,updated_at:new Date().toISOString(),metadata:{notificationType:type,subtype:payload.subtype||null,product_id:tx.productId,original_transaction_id:original}}).eq("id",existing.id);}
  else{
    const {data:parent}=await supabase.from("native_store_transactions").select("user_id,item_id,item_type").eq("provider","apple_iap").contains("metadata",{original_transaction_id:original}).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(parent){await supabase.from("native_store_transactions").upsert({provider:"apple_iap",provider_transaction_id:transactionId,user_id:parent.user_id,item_id:parent.item_id,item_type:parent.item_type,environment:env===Environment.SANDBOX?"Sandbox":"Production",status,expires_at:expiresAt,metadata:{notificationType:type,subtype:payload.subtype||null,product_id:tx.productId,original_transaction_id:original}},{onConflict:"provider,provider_transaction_id"});if(parent.item_type==="vip_subscription"&&!revoked&&expiresAt)await supabase.rpc("sync_native_subscription_expiry",{p_user_id:parent.user_id,p_expires_at:expiresAt});}
  }
  return new Response(JSON.stringify({ok:true}),{headers:cors});
 }catch(e){console.error(e);return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:"Notification failed"}),{status:400,headers:cors});}
});