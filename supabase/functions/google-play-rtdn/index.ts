import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Content-Type":"application/json"};
function b64urlDecode(s:string){return atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4));}
function decodeData(s:string){return JSON.parse(b64urlDecode(s));}
function pemToBytes(p:string){const c=p.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");const b=atob(c);return Uint8Array.from(b,x=>x.charCodeAt(0));}
function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let b="";for(const x of bytes)b+=String.fromCharCode(x);return btoa(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
const jsonB64=(v:unknown)=>b64url(JSON.stringify(v));
async function sha256(v:string){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function googleAccessToken(raw){if(!raw)throw new Error("Google Play service account is not configured");const a=JSON.parse(raw),n=Math.floor(Date.now()/1000),h=jsonB64({alg:"RS256",typ:"JWT"}),p=jsonB64({iss:a.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:"https://oauth2.googleapis.com/token",iat:n,exp:n+3600}),k=await crypto.subtle.importKey("pkcs8",pemToBytes(a.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]),sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",k,new TextEncoder().encode(h+"."+p)),assertion=h+"."+p+"."+b64url(new Uint8Array(sig)),r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})}),body=await r.json();if(!r.ok||!body.access_token)throw new Error("Google Play authorization failed");return body.access_token;}
async function googleApi(url:string,t:string,init:RequestInit={}){const r=await fetch(url,{...init,headers:{Authorization:"Bearer "+t,"Content-Type":"application/json",...(init.headers||{})}}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error?.message||`Google Play request failed (${r.status})`);return b;}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:secret}=await sb.rpc("service_get_payment_secret",{p_name:"circle_panda_google_play_rtdn_secret"});
  const supplied=new URL(req.url).searchParams.get("token");if(!secret||supplied!==secret)return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:cors});
  const body=await req.json(),message=body?.message||{},messageId=String(message.messageId||"");if(!messageId)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});

  const eventTime=body?.message?.publishTime?new Date(body.message.publishTime).toISOString():null;
  const {error:dedupeError}=await sb.from("google_play_rtdn_events").insert({message_id:messageId,event_time:eventTime});if(dedupeError?.code==="23505")return new Response(JSON.stringify({ok:true,duplicate:true}),{headers:cors});if(dedupeError)throw dedupeError;
  if(!message.data)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
  const event=decodeData(String(message.data));
  const {data:settings}=await sb.from("payment_provider_settings").select("google_enabled,google_package_name").eq("id",1).single();
  const pkg=String(settings?.google_package_name||"");if(!settings?.google_enabled||!pkg||String(event.packageName||"")!==pkg)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
  const {data:serviceAccount,error:serviceAccountError}=await sb.rpc("service_get_payment_secret",{p_name:"circle_panda_google_play_service_account"});
  if(serviceAccountError||!serviceAccount)throw new Error("Google Play service account is not configured");
  const access=await googleAccessToken(serviceAccount);

  if(event.subscriptionNotification){
    const token=String(event.subscriptionNotification.purchaseToken||"");
    if(!token)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
    const v=await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,access);
    const line=Array.isArray(v.lineItems)?v.lineItems[0]:null,productId=String(line?.productId||""),expiresAt=line?.expiryTime?String(line.expiryTime):null,accountHash=String(v.externalAccountIdentifiers?.obfuscatedExternalAccountId||"");
    const {data:binding}=await sb.from("native_store_account_bindings").select("user_id").eq("google_obfuscated_account_id",accountHash).maybeSingle();if(!binding)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
    const {data:catalog}=await sb.from("store_catalog").select("id,item_type,android_product_id,enabled").eq("android_product_id",productId).eq("item_type","vip_subscription").eq("enabled",true).maybeSingle();if(!catalog)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
    const state=String(v.subscriptionState||""),entitled=["SUBSCRIPTION_STATE_ACTIVE","SUBSCRIPTION_STATE_IN_GRACE_PERIOD","SUBSCRIPTION_STATE_CANCELED"].includes(state)&&Boolean(expiresAt)&&new Date(expiresAt).getTime()>Date.now();
    const orderId=String(line?.latestSuccessfulOrderId||v.latestOrderId||"gplay_"+await sha256(token)),meta={provider:"google_play",product_id:productId,package_name:pkg,purchase_token_hash:await sha256(token),order_id:orderId,subscription_state:state,rtdn_message_id:messageId};
    if(entitled){
      if(v.acknowledgementState==="ACKNOWLEDGEMENT_STATE_PENDING")await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,access,{method:"POST",body:"{}"}).catch(()=>{});
      const f=await sb.rpc("fulfill_native_store_purchase_verified",{p_user_id:binding.user_id,p_reference:"CP_GPLAY_RTDN_"+messageId,p_provider:"google_play",p_provider_transaction_id:orderId,p_item_id:catalog.id,p_item_type:"vip_subscription",p_provider_currency:null,p_provider_amount_minor:null,p_quantity:1,p_expires_at:expiresAt,p_environment:"production",p_metadata:meta});if(f.error)throw f.error;
    }else{
      await sb.from("native_store_transactions").upsert({provider:"google_play",provider_transaction_id:orderId,user_id:binding.user_id,item_id:catalog.id,item_type:"vip_subscription",environment:"production",status:"revoked",expires_at:expiresAt,metadata:meta},{onConflict:"provider,provider_transaction_id"});
      await sb.rpc("refresh_user_vip_entitlement",{p_user_id:binding.user_id});
    }
  } else if(event.oneTimeProductNotification){
    const n=event.oneTimeProductNotification,token=String(n.purchaseToken||""),sku=String(n.sku||"");if(!token)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
    const v=await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/productsv2/tokens/${encodeURIComponent(token)}`,access);
    const line=Array.isArray(v.productLineItem)?v.productLineItem[0]:null,productId=String(line?.productId||sku),accountHash=String(v.obfuscatedExternalAccountId||"");
    const {data:binding}=await sb.from("native_store_account_bindings").select("user_id").eq("google_obfuscated_account_id",accountHash).maybeSingle();if(!binding)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
    const {data:catalog}=await sb.from("store_catalog").select("id,item_type,android_product_id,enabled").eq("android_product_id",productId).eq("item_type","coin_package").eq("enabled",true).maybeSingle();if(!catalog)return new Response(JSON.stringify({ok:true,ignored:true}),{headers:cors});
    if(String(v.purchaseStateContext?.purchaseState)==="PURCHASED"){
      const txid=String(v.orderId||"gplay_"+await sha256(token)),meta={provider:"google_play",product_id:productId,package_name:pkg,purchase_token_hash:await sha256(token),order_id:txid,rtdn_message_id:messageId};
      const f=await sb.rpc("fulfill_native_store_purchase_verified",{p_user_id:binding.user_id,p_reference:"CP_GPLAY_RTDN_"+messageId,p_provider:"google_play",p_provider_transaction_id:txid,p_item_id:catalog.id,p_item_type:"coin_package",p_provider_currency:null,p_provider_amount_minor:null,p_quantity:Math.max(1,Math.min(100,Number(line?.productOfferDetails?.quantity||1))),p_expires_at:null,p_environment:"production",p_metadata:meta});if(f.error)throw f.error;
      if(line?.productOfferDetails?.consumptionState==="CONSUMPTION_STATE_YET_TO_BE_CONSUMED")await googleApi(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:consume`,access,{method:"POST",body:"{}"}).catch(()=>{});
    }
  } else if(event.voidedPurchaseNotification){
    const token=String(event.voidedPurchaseNotification.purchaseToken||"");if(token){
      const hash=await sha256(token);
      const {data:tx}=await sb.from("native_store_transactions").select("id,user_id,item_type,provider_transaction_id").eq("provider","google_play").contains("metadata",{purchase_token_hash:hash}).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(tx){await sb.from("native_store_transactions").update({status:"refunded",updated_at:new Date().toISOString()}).eq("id",tx.id);await sb.from("payment_transactions").update({status:"refunded"}).eq("provider","google_play").eq("provider_transaction_id",tx.provider_transaction_id);if(tx.item_type==="vip_subscription")await sb.rpc("refresh_user_vip_entitlement",{p_user_id:tx.user_id});}
    }
  }
  return new Response(JSON.stringify({ok:true}),{headers:cors});
 }catch(e){console.error(e);return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:"RTDN processing failed"}),{status:500,headers:cors});}
});