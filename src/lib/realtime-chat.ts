import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, Thread } from "./store";

export interface SendMessageResult {
  success: boolean;
  message?: ChatMessage;
  newBalance?: number;
  error?: string;
}

/**
 * Sends through Circle Panda's canonical, server-authoritative DM RPC.
 * BC charging and message permissions remain enforced by Supabase.
 */
export async function sendRealtimeMessage(
  threadId: string,
  body: string,
  currentUserId?: string,
): Promise<SendMessageResult> {
  const trimmed = body.trim();
  if (!currentUserId) return { success: false, error: "NOT_AUTHENTICATED" };
  if (!threadId || !trimmed) return { success: false, error: "Write a message first." };

  try {
    const { data: messageId, error } = await (supabase as any).rpc("send_dm_message", {
      p_thread_id: threadId,
      p_body: trimmed,
      p_media_path: null,
      p_media_type: null,
      p_idempotency_key: crypto.randomUUID(),
    });
    if (error) return { success: false, error: error.message ?? "Message could not be sent." };
    if (!messageId) return { success: false, error: "The server did not confirm the message." };

    const [{ data: row }, { data: wallet }] = await Promise.all([
      (supabase as any).from("dm_messages")
        .select("id,body,created_at,sender_id,media_type,media_path")
        .eq("id", messageId)
        .maybeSingle(),
      (supabase as any).from("wallets")
        .select("balance")
        .eq("user_id", currentUserId)
        .maybeSingle(),
    ]);

    if (!row) {
      // The RPC already confirmed the write; return a minimal message rather
      // than treating a delayed follow-up read as a failed send.
      return {
        success: true,
        message: { id: String(messageId), body: trimmed, at: Date.now(), mine: true },
        ...(wallet?.balance != null ? { newBalance: Number(wallet.balance) } : {}),
      };
    }

    return {
      success: true,
      message: {
        id: String(row.id),
        body: String(row.body ?? trimmed),
        at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        mine: row.sender_id === currentUserId,
        messageType: row.media_type === "dating_photo" ? "dating_photo" : "text",
        ...(row.media_path ? { mediaPath: String(row.media_path) } : {}),
      },
      ...(wallet?.balance != null ? { newBalance: Number(wallet.balance) } : {}),
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send message.",
    };
  }
}

/** Subscribe to inserts in the canonical dm_messages table. */
export function subscribeToThreadMessages(
  threadId: string,
  currentUserId: string | undefined,
  onNewMessage: (msg: ChatMessage) => void,
) {
  if (!threadId) return () => {};

  const channel = supabase
    .channel(`dm_thread_${threadId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
      (payload) => {
        const row = payload.new as {
          id: string;
          sender_id: string;
          body: string | null;
          created_at: string;
          media_type?: string | null;
          media_path?: string | null;
        };
        onNewMessage({
          id: row.id,
          body: row.body ?? "",
          at: new Date(row.created_at).getTime(),
          mine: Boolean(currentUserId && row.sender_id === currentUserId),
          messageType: row.media_type === "dating_photo" ? "dating_photo" : "text",
          ...(row.media_path ? { mediaPath: row.media_path } : {}),
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Load conversation threads from the same canonical tables used by Messages. */
export async function loadUserThreads(userId: string): Promise<Thread[] | null> {
  if (!userId) return null;

  try {
    const { data: threadRows, error: threadError } = await (supabase as any)
      .from("dm_threads")
      .select("id,user_a,user_b,status,created_at,updated_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (threadError) return null;

    const rows = threadRows ?? [];
    if (!rows.length) return [];

    const threadIds = rows.map((row: any) => String(row.id));
    const otherUserIds = Array.from(new Set(rows.map((row: any) =>
      row.user_a === userId ? row.user_b : row.user_a,
    ).filter(Boolean)));

    const [profilesResult, messagesResult, requestsResult] = await Promise.all([
      otherUserIds.length
        ? (supabase as any).from("profiles").select("id,display_name,is_vip,vip_expires_at").in("id", otherUserIds)
        : Promise.resolve({ data: [], error: null }),
      (supabase as any).from("dm_messages")
        .select("id,thread_id,sender_id,body,created_at,media_type,media_path")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: true })
        .limit(2000),
      (supabase as any).from("dm_requests")
        .select("thread_id,context_type,status,created_at")
        .in("thread_id", threadIds)
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]);

    if (messagesResult.error || requestsResult.error) return null;

    const profiles = new Map<string, any>((profilesResult.data ?? []).map((profile: any) => [
      String(profile.id),
      profile,
    ]));
    const kindByThread = new Map<string, string>();
    for (const request of requestsResult.data ?? []) {
      if (!kindByThread.has(String(request.thread_id))) {
        kindByThread.set(String(request.thread_id), String(request.context_type ?? "direct"));
      }
    }

    return rows.map((row: any) => {
      const otherUserId = row.user_a === userId ? row.user_b : row.user_a;
      const profile = profiles.get(String(otherUserId));
      const kind = kindByThread.get(String(row.id)) === "dating" ? "dating" : "dm";
      const messages: ChatMessage[] = (messagesResult.data ?? [])
        .filter((message: any) => message.thread_id === row.id)
        .map((message: any) => ({
          id: String(message.id),
          body: String(message.body ?? ""),
          at: new Date(message.created_at).getTime(),
          mine: message.sender_id === userId,
          messageType: message.media_type === "dating_photo" ? "dating_photo" : "text",
          ...(message.media_path ? { mediaPath: String(message.media_path) } : {}),
        }));

      const thread: Thread = {
        id: String(row.id),
        name: String(profile?.display_name || "Anonymous Panda"),
        kind,
        blurb: kind === "dating" ? "Dating Chat" : "Direct message",
        messages,
        startedAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
        otherVip: Boolean(profile?.is_vip && (!profile?.vip_expires_at || new Date(profile.vip_expires_at).getTime() > Date.now())),
      };
      return thread;
    });
  } catch {
    return null;
  }
}
