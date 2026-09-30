import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req)=>{
 try{
  const auth=req.headers.get("Authorization");if(!auth)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});
  const body=await req.json();const reference=String(body.reference||"").trim(),eventId=String(body.eventId||"").trim(),planId=String(body.planId||"").trim();
  if(!reference||!eventId||!planId)return new Response(JSON.stringify({error:"Missing payment details"}),{status:400});
  const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const token=auth.replace(/^Bearer\s+/i,"");const {data:{user}}=await service.auth.getUser(token);if(!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});
  const secret=Deno.env.get("PAYSTACK_SECRET_KEY");if(!secret)return new Response(JSON.stringify({error:"PAYSTACK_SECRET_KEY is not configured"}),{status:503});
  const verify=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`}});const payload=await verify.json();
  if(!verify.ok||payload?.data?.status!=="success")return new Response(JSON.stringify({error:"Payment could not be verified"}),{status:400});
  const {data:activation,error}=await service.rpc("activate_event_blast_cash_verified",{p_user_id:user.id,p_event_id:eventId,p_plan_id:planId,p_reference:reference,p_amount_ngn:Number(payload.data.amount||0),p_provider_transaction_id:String(payload.data.id||""),p_provider_metadata:{paystack:payload.data},p_target_scope:String(body.targetScope||"worldwide"),p_target_country:String(body.targetCountry||""),p_target_state:String(body.targetState||""),p_target_city:String(body.targetCity||""),p_target_area:String(body.targetArea||"")});
  if(error)return new Response(JSON.stringify({error:error.message}),{status:400});
  return new Response(JSON.stringify({ok:true,...activation}),{headers:{"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"Verification failed"}),{status:500});}
});