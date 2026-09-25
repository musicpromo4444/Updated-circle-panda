import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HostRow = {
  id: string;
  alias: string;
  avatar: string;
  media_url: string | null;
  media_kind: string;
  started_at: string;
  ends_at: string;
  is_active: boolean;
};

export type AnswerRow = {
  id: string;
  question_id: string;
  kind: "text" | "voice" | "photo" | "video";
  body: string | null;
  media_url: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export type QuestionRow = {
  id: string;
  host_id: string | null;
  asker_alias: string;
  body: string;
  is_priority: boolean;
  created_at: string;
  hot_seat_answers: AnswerRow[];
};

export type WaitingMode = "game" | "video" | "audio" | "banner";

export type AppSettings = {
  id: number;
  hot_seat_mode: "continuous" | "drops";
  daily_drops: number;
  waiting_media_mode: WaitingMode;
  waiting_media_url: string;
  waiting_cta_label: string;
  waiting_cta_url: string;
  waiting_sponsor_name: string;
  feed_ads_enabled: boolean;
  dating_enabled: boolean;
  spin_wheel_enabled: boolean;
  rewarded_ads_enabled: boolean;
  live_stream_enabled: boolean;
  apk_url: string;
  show_download_button: boolean;
};

export const PRIORITY_QUESTION_COST = 10;
export const MEDIA_UNLOCK_COST = 10;
export const WAITING_ROOM_SECONDS = 300;

export const settingsQuery = queryOptions({
  queryKey: ["app-settings"],
  queryFn: async (): Promise<AppSettings | null> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data as AppSettings | null;
  },
});

export const activeHostQuery = queryOptions({
  queryKey: ["hot-seat-host"],
  queryFn: async (): Promise<HostRow | null> => {
    const { data, error } = await supabase
      .from("hot_seat_hosts")
      .select("*")
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as HostRow | null;
  },
});

export function questionsQuery(hostId: string | null) {
  return queryOptions({
    queryKey: ["hot-seat-questions", hostId],
    enabled: !!hostId,
    queryFn: async (): Promise<QuestionRow[]> => {
      const { data, error } = await supabase
        .from("hot_seat_questions")
        .select("*, hot_seat_answers(*)")
        .eq("host_id", hostId!)
        .order("is_priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QuestionRow[];
    },
  });
}

export async function askQuestion(input: { hostId: string; body: string; priority: boolean }) {
  const { error } = await supabase.from("hot_seat_questions").insert({
    host_id: input.hostId,
    body: input.body,
    is_priority: input.priority,
    asker_alias: "Anonymous Panda",
  });
  if (error) throw error;
}

export async function saveSettings(patch: Partial<AppSettings>) {
  const { error } = await supabase
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

/** End the current host's tenure — opens the Hot Seat and starts the waiting room. */
export async function endHostTenure(hostId: string) {
  const { error } = await supabase
    .from("hot_seat_hosts")
    .update({ is_active: false })
    .eq("id", hostId);
  if (error) throw error;
}

/** Crown a new host for a fresh 24-hour run. */
export async function crownHost(alias: string) {
  const now = new Date();
  const { error } = await supabase.from("hot_seat_hosts").insert({
    alias,
    avatar: "🔥",
    media_kind: "video",
    media_url: "https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4",
    started_at: now.toISOString(),
    ends_at: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
    is_active: true,
  });
  if (error) throw error;
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
