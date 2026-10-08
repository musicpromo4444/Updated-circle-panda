import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MessageRequestResult = { id: string; status: string };
export const SELF_MESSAGE_ERROR = "SELF_MESSAGE_BLOCKED";
export function showSelfMessageBlocked() {
  toast.error("Sorry, you can't message yourself");
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("circle-panda-self-message-blocked"));
}
export function isSelfMessageError(error: unknown) {
  return error instanceof Error && error.message === SELF_MESSAGE_ERROR;
}

export async function sendMessageRequest(recipientId: string, message: string, contextType: "direct"|"profile"|"event"|"group"|"mcm"|"wcw" = "direct", contextId?: string): Promise<MessageRequestResult> {
  const { data:userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Please sign in before messaging.");
  if (recipientId === userData.user.id) {
    showSelfMessageBlocked();
    throw new Error(SELF_MESSAGE_ERROR);
  }
  const { data, error } = await (supabase as any).rpc("request_context_message_secure", {
    p_recipient_id: recipientId,
    p_message: message,
    p_context_type: contextType,
    p_context_id: contextId ?? null,
  });
  if (error) {
    if (/invalid recipient|yourself/i.test(error.message ?? "")) {
      showSelfMessageBlocked();
      throw new Error(SELF_MESSAGE_ERROR);
    }
    throw new Error(error.message ?? "Could not send message request");
  }
  if (!data?.id) throw new Error("Message request was not created");
  return { id: String(data.id), status: String(data.status ?? "pending") };
}
