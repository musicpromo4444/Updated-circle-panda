import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Check, Crown, Gift, Heart, Image as ImageIcon, MessageCircle, Send, Sparkles, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type CirclePandaActivity =
  | "private_message" | "group_message" | "group_media" | "group_voice"
  | "post" | "secret" | "reaction" | "dating_request" | "dating_accept"
  | "event_attendance" | "event_creation" | "mcm_vote" | "wcw_vote"
  | "mcm_upload" | "wcw_upload" | "group_join" | "group_creation"
  | "gift_purchase" | "reward_wheel" | "profile_completion" | "sweepstakes";

type Feedback = { activity: CirclePandaActivity; firstTime: boolean; id: number } | null;
type Api = { complete: (activity: CirclePandaActivity) => Promise<void> };

const ActivityContext = createContext<Api | null>(null);

const META: Record<CirclePandaActivity, { title: string; icon: ReactNode; motion: string }> = {
  private_message: { title: "Message sent", icon: <Send />, motion: "cp-success-send" },
  group_message: { title: "Group message sent", icon: <MessageCircle />, motion: "cp-success-message" },
  group_media: { title: "Media sent", icon: <ImageIcon />, motion: "cp-success-image" },
  group_voice: { title: "Voice note sent", icon: <MessageCircle />, motion: "cp-success-message" },
  post: { title: "Post published", icon: <Sparkles />, motion: "cp-success-pop" },
  secret: { title: "Secret shared", icon: <Sparkles />, motion: "cp-success-reveal" },
  reaction: { title: "Reaction added", icon: <Heart />, motion: "cp-success-heart" },
  dating_request: { title: "Dating request sent", icon: <Heart />, motion: "cp-success-heart" },
  dating_accept: { title: "Match accepted", icon: <Heart />, motion: "cp-success-heart" },
  event_attendance: { title: "Attendance confirmed", icon: <CalendarDays />, motion: "cp-success-pop" },
  event_creation: { title: "Event created", icon: <CalendarDays />, motion: "cp-success-pop" },
  mcm_vote: { title: "MCM vote recorded", icon: <Crown />, motion: "cp-success-crown" },
  wcw_vote: { title: "WCW vote recorded", icon: <Crown />, motion: "cp-success-crown" },
  mcm_upload: { title: "MCM photo submitted", icon: <ImageIcon />, motion: "cp-success-image" },
  wcw_upload: { title: "WCW photo submitted", icon: <ImageIcon />, motion: "cp-success-image" },
  group_join: { title: "Welcome to the group", icon: <Users />, motion: "cp-success-pop" },
  group_creation: { title: "Circle created", icon: <Users />, motion: "cp-success-pop" },
  gift_purchase: { title: "Gift purchased", icon: <Gift />, motion: "cp-success-pop" },
  reward_wheel: { title: "Reward spin complete", icon: <Sparkles />, motion: "cp-success-pop" },
  profile_completion: { title: "Profile completed", icon: <Check />, motion: "cp-success-pop" },
  sweepstakes: { title: "Contest action complete", icon: <Trophy />, motion: "cp-success-crown" },
};

function rewardKey(activity: CirclePandaActivity) {
  return "circle-panda:first-activity:" + activity;
}

export function ActionSuccessProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const complete = useCallback(async (activity: CirclePandaActivity) => {
    // The server is authoritative for the one-time +2 BC reward.
    // localStorage is intentionally no longer used to decide whether a reward
    // was earned; it may only be used by the UI for cosmetic state if needed.
    let firstTime = false;
    try {
      const { data, error } = await supabase.rpc("complete_first_activity", {
        p_activity_key: activity,
        p_reward_bc: 2,
      });

      if (error) throw error;
      firstTime = Boolean(data?.awarded);
      setFeedback({ activity, firstTime, id: Date.now() });
    } catch {
      // Never claim a BC reward when the server did not confirm it.
      setFeedback({ activity, firstTime: false, id: Date.now() });
    }
  }, []);
