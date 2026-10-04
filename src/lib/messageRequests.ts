import { supabase } from "@/integrations/supabase/client";

export type MessageRequestResult = {
  id: string;
  status: string;
};

export async function sendMessageRequest(recipientId: string, message: string): Promise<MessageRequestResult> {
  const { data, error } = await (supabase as any).rpc("request_direct_message_secure", {
    p_recipient_id: recipientId,
    p_message: message,
  });
  if (error) throw new Error(error.message ?? "Could not send message request");
  if (!data?.id) throw new Error("Message request was not created");
  return { id: String(data.id), status: String(data.status ?? "pending") };
}
