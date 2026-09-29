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

export const PRIORITY_QUESTION_COST = 25;
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
  const { data, error } = await (supabase as any).rpc("ask_hot_seat_question_secure", {
    p_host_id: input.hostId,
    p_body: input.body,
    p_priority: input.priority,
  });
  if (error) throw error;
  return data;
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export async function upvoteQuestion(questionId: string, userId: string) {
  const { error } = await supabase.from("hot_seat_question_votes").upsert({ question_id: questionId, user_id: userId }, { onConflict: "question_id,user_id", ignoreDuplicates: true });
  if (error) throw error;
}
