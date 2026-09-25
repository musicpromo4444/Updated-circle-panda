import { supabase, hasSupabaseConfig } from "@/integrations/supabase/client";
import type { ChatMessage, Thread } from "./store";

export interface SendMessageResult {
  success: boolean;
  message?: ChatMessage;
  newBalance?: number;
  error?: string;
}

/**
 * Sends a real-time message through Supabase's secure server RPC,
 * which enforces 1 BC deduction atomically in PostgreSQL and verifies RLS.
 */
export async function sendRealtimeMessage(
  threadId: string,
  body: string,
  currentUserId?: string,
): Promise<SendMessageResult> {
  const isReady = hasSupabaseConfig();
  if (!isReady || !currentUserId) {
    return {
      success: false,
      error: "LOCAL_FALLBACK",
    };
  }

  try {
    const { data, error } = await supabase.rpc("send_chat_message", {
      p_thread_id: threadId,
      p_body: body.trim(),
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const payload = data as {
      message_id: string;
      thread_id: string;
      sender_id: string;
      body: string;
      created_at: string;
      new_balance: number;
    };

    return {
      success: true,
      message: {
        id: payload.message_id,
        body: payload.body,
        at: new Date(payload.created_at).getTime(),
        mine: true,
      },
      newBalance: payload.new_balance,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Subscribes to new messages in a specific thread via Supabase Realtime (WebSockets)
 */
export function subscribeToThreadMessages(
  threadId: string,
  currentUserId: string | undefined,
  onNewMessage: (msg: ChatMessage) => void,
) {
  if (!hasSupabaseConfig()) return () => {};

  const channel = supabase
    .channel(`chat_thread_${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };

        const incomingMsg: ChatMessage = {
          id: row.id,
          body: row.body,
          at: new Date(row.created_at).getTime(),
          mine: Boolean(currentUserId && row.sender_id === currentUserId),
        };

        onNewMessage(incomingMsg);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Loads real database chat threads and participants for the authenticated user
 */
export async function loadUserThreads(userId: string): Promise<Thread[] | null> {
  if (!hasSupabaseConfig() || !userId) return null;

  try {
    // 1. Fetch conversations the user is participating in
    const { data: participants, error: partError } = await supabase
      .from("chat_participants")
      .select("thread_id")
      .eq("user_id", userId);

    if (partError || !participants || participants.length === 0) {
      return null;
    }

    const threadIds = participants.map((p) => p.thread_id);

    // 2. Fetch conversation metadata
    const { data: convs, error: convError } = await supabase
      .from("chat_conversations")
      .select("*")
      .in("id", threadIds)
      .order("updated_at", { ascending: false });

    if (convError || !convs) return null;

    // 3. Fetch recent messages for these threads
    const { data: msgs, error: msgError } = await supabase
      .from("chat_messages")
      .select("*")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true });

    if (msgError) return null;

    return convs.map((c) => {
      const threadMsgs = (msgs || [])
        .filter((m) => m.thread_id === c.id)
        .map((m) => ({
          id: m.id,
          body: m.body,
          at: new Date(m.created_at).getTime(),
          mine: m.sender_id === userId,
        }));

      return {
        id: c.id,
        name: c.title,
        kind: (c.kind as "dm" | "dating") || "dm",
        blurb: c.blurb || "Anonymous chat",
        messages: threadMsgs,
      };
    });
  } catch {
    return null;
  }
}
