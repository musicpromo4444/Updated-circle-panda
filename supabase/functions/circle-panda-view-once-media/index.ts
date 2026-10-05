import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Authentication required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { message_id, vip = false } = await req.json();
    if (!message_id) throw new Error("message_id required");

    const claimRpc = vip
      ? "claim_vip_group_media_view_once"
      : "claim_group_media_view_once";

    const { data: claimed, error: claimError } = await supabase.rpc(claimRpc, {
      p_message_id: message_id,
    });

    if (claimError) throw claimError;
    if (claimed !== true) {
      return new Response(
        JSON.stringify({
          error: "This View Once media has already been opened",
          consumed: true,
        }),
        { status: 410, headers: cors },
      );
    }

    const table = vip ? "cp_vip_group_messages" : "cp_group_messages";
    const { data: message, error: messageError } = await admin
      .from(table)
      .select("id,media_path,message_type,mime_type,duration_seconds,view_once")
      .eq("id", message_id)
      .maybeSingle();

    if (messageError) throw messageError;
    if (
      !message?.media_path ||
      message.view_once !== true ||
      !["image", "video"].includes(message.message_type)
    ) {
      throw new Error("Invalid View Once media");
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("circle-panda-group-media")
      .createSignedUrl(message.media_path, 60, { download: false });

    if (signedError) throw signedError;

    return new Response(
      JSON.stringify({
        url: signed.signedUrl,
        media_type: message.message_type,
        mime_type: message.mime_type,
        duration_seconds: message.duration_seconds,
        expires_in: 60,
      }),
      { headers: cors },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Request failed",
      }),
      { status: 400, headers: cors },
    );
  }
});