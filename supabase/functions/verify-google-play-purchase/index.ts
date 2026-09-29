import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

function b64url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = ""; for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
const jsonB64=(v:unknown)=>b64url(JSON.stringify(v));
function pemToBytes(pem:string){const clean=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");const bin=atob(clean);return Uint8Array.from(bin,c=>c.charCodeAt(0));}
async function sha256(value:string){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function googleAccessToken(){
  const raw=Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"); if(!raw)throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured");
  const account=JSON.parse(raw), now=Math.floor(Date.now()/1000);
  const header=jsonB64({alg:"RS256",typ:"JWT"}), payload=jsonB64({iss:account.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600});
  const key=await crypto.subtle.importKey("pkcs8",pemToBytes(account.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(header+"."+payload));
  const assertion=header+"."+payload+"."+b64url(new Uint8Array(sig));
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  const body=await r.json(); if(!r.ok||!body.access_token)throw new Error("Google Play authorization failed"); return body.access_token as string;
}
async function googleApi(url:string,token:string,init:RequestInit={}){const r=await fetch(url,{...init,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",...(init.headers||{})}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body?.error?.message||`Google Play request failed (${r.status})`);return body;}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:cors});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:{user}}=await supabase.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:cors});
  const body=await req.json(), purchaseToken=String(body.purchaseToken||"").trim(), requestedItemId=String(body.itemId||"").trim(), itemType=body.itemType==="vip_subscription"?"vip_subscription":"coin_package", reference=String(body.reference||"").trim();
  if(!purchaseToken||!reference)return new Response(JSON.stringify({ok:false,error:"Missing purchase details"}),{status:400,headers:cors});
  const packageName=Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");if(!packageName)throw new Error("GOOGLE_PLAY_PACKAGE_NAME is not configured");
  const access=await googleAccessToken();
  const verified=itemType==="vip_subscription"
    ?await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,access)
    :await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/productsv2/tokens/${encodeURIComponent(purchaseToken)}`,access);
  let productId="",orderId=String(verified.orderId||""),quantity=1,expiresAt:string|null=null,purchaseState="",subscriptionState="";
  if(itemType==="vip_subscription"){
    subscriptionState=String(verified.subscriptionState||"");const line=Array.isArray(verified.lineItems)?verified.lineItems[0]:null;productId=String(line?.productId||"");expiresAt=line?.expiryTime?String(line.expiryTime):null;
    if(!["SUBSCRIPTION_STATE_ACTIVE","SUBSCRIPTION_STATE_IN_GRACE_PERIOD","SUBSCRIPTION_STATE_CANCELED"].includes(subscriptionState)||!expiresAt||new Date(expiresAt).getTime()<=Date.now())return new Response(JSON.stringify({ok:false,error:"Google Play subscription is not currently entitled"}),{status:400,headers:cors});
    if(verified.acknowledgementState!=="ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED")await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,access,{method:"POST",body:"{}"}).catch(()=>{});
  }else{
    purchaseState=String(verified.purchaseStateContext?.purchaseState||"");const line=Array.isArray(verified.productLineItem)?verified.productLineItem[0]:null;productId=String(line?.productId||"");quantity=Math.max(1,Math.min(100,Number(line?.productOfferDetails?.quantity||1)));
    if(purchaseState!=="PURCHASED")return new Response(JSON.stringify({ok:false,error:"Google Play purchase is not completed"}),{status:400,headers:cors});
    if(verified.acknowledgementState!=="ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED")await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,access,{method:"POST",body:"{}"}).catch(()=>{});
  }
  if(!productId)throw new Error("Google Play response did not contain a product ID");
  const {data:catalog,error}=await supabase.from("store_catalog").select("id,item_type,android_product_id,enabled").eq("android_product_id",productId).eq("item_type",itemType).eq("enabled",true).maybeSingle();
  if(error||!catalog)return new Response(JSON.stringify({ok:false,error:"Google Play product is not configured in Circle Panda"}),{status:400,headers:cors});
  if(requestedItemId&&requestedItemId!==catalog.id)return new Response(JSON.stringify({ok:false,error:"Store item mismatch"}),{status:400,headers:cors});
  const providerTransactionId=orderId||"gplay_"+await sha256(purchaseToken);
  const metadata={provider:"google_play",product_id:productId,package_name:packageName,purchase_token_hash:await sha256(purchaseToken),order_id:orderId,subscription_state:subscriptionState,purchase_state:purchaseState,quantity,acknowledgement_state:verified.acknowledgementState};
  const {data:fulfillment,error:fulfillmentError}=await supabase.rpc("fulfill_native_store_purchase_verified",{p_user_id:user.id,p_reference:reference,p_provider:"google_play",p_provider_transaction_id:providerTransactionId,p_item_id:catalog.id,p_item_type:itemType,p_provider_currency:null,p_provider_amount_minor:null,p_quantity:quantity,p_expires_at:expiresAt,p_environment:"production",p_metadata:metadata});
  if(fulfillmentError)throw fulfillmentError;
  return new Response(JSON.stringify({ok:true,provider:"google_play",reference,productId,providerTransactionId,fulfillment}),{headers:cors});
 }catch(e){console.error(e);return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:"Verification failed"}),{status:500,headers:cors});}
});