import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  try{
    const auth=req.headers.get("Authorization"); if(!auth) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});
    const body=await req.json(); const reference=String(body.reference||"").trim(); const eventId=String(body.eventId||"").trim();
    if(!reference||!eventId) return new Response(JSON.stringify({error:"Missing payment details"}),{status:400});
    const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token=auth.replace(/^Bearer\s+/i,""); const {data:{user}}=await service.auth.getUser(token); if(!user) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});
    const secret=Deno.env.get("PAYSTACK_SECRET_KEY"); if(!secret) return new Response(JSON.stringify({error:"PAYSTACK_SECRET_KEY is not configured"}),{status:503});
    const verify=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`}});
    const payload=await verify.json(); if(!verify.ok||payload?.data?.status!=="success") return new Response(JSON.stringify({error:"Payment could not be verified"}),{status:400});
    const amount=Number(payload.data.amount||0); const {data,eventError}=await service.from("events").select("id,entry_fee_amount,entry_fee_currency,owner_id,is_published").eq("id",eventId).maybeSingle();
    if(eventError||!eventError&& !eventId) return new Response(JSON.stringify({error:"Event lookup failed"}),{status:400});
    const event=data; if(!event||!event.is_published) return new Response(JSON.stringify({error:"Event not found"}),{status:404});
    if(user.id===event.owner_id) return new Response(JSON.stringify({error:"Event owner does not pay entry"}),{status:400});
    const expected=Math.round(Number(event.entry_fee_amount||0)*100); if(String(event.entry_fee_currency||"NGN").toUpperCase()!=="NGN"||amount!==expected) return new Response(JSON.stringify({error:"Payment amount does not match event entry price"}),{status:400});
    const {data:joined,error}=await service.rpc("activate_event_entry_payment",{p_user_id:user.id,p_event_id:eventId,p_reference:reference,p_amount_ngn:amount,p_provider_transaction_id:String(payload.data.id||""),p_provider_metadata:{paystack:payload.data}});
    if(error) return new Response(JSON.stringify({error:error.message}),{status:400});
    return new Response(JSON.stringify({ok:true,...joined}),{headers:{"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"Verification failed"}),{status:500});}
});