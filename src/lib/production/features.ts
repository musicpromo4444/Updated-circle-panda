import { supabase } from "@/integrations/supabase/client";

export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function notify(_userId: string, _title: string, _body: string, _kind = "system") {
  throw new Error("Client notification creation is server-authoritative in Circle Panda.");
}

export async function getNotifications(limit = 30) {
  const { data, error } = await (supabase as any).rpc("get_my_notifications", { p_limit: Math.min(Math.max(limit, 1), 100) });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  return (supabase as any).rpc("mark_notification_read", { p_notification_id: id });
}

export async function claimDailyReward() {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to claim your daily reward.");
  const { data, error } = await (supabase as any).rpc("claim_daily_reward_secure");
  if (error) throw error;
  return {
    claimed: Boolean(data?.claimed),
    streak: Number(data?.streak ?? 0),
    reward: Number(data?.reward ?? 0),
    day: Number(data?.day ?? 0),
  };
}

export async function listLiveStreams(limit = 20) {
  const { data, error } = await (supabase as any).rpc("list_live_streams_secure");
  if (error) throw error;
  return (data ?? []).slice(0, limit);
}

export async function joinLiveStream(streamId: string) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to join a live stream.");
  const { data, error } = await (supabase as any).rpc("join_live_stream_secure", { p_stream_id: streamId });
  if (error) throw error;
  return data;
}

export async function leaveLiveStream(streamId: string) {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await (supabase as any).rpc("leave_live_stream_secure", { p_stream_id: streamId });
  if (error) throw error;
  return data;
}

export async function heartbeatLiveStream(streamId: string) {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await (supabase as any).rpc("heartbeat_live_stream_secure", { p_stream_id: streamId });
  if (error) throw error;
  return data;
}

