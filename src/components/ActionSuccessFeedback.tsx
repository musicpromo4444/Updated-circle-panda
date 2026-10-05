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

export function useActionSuccess() {
  const value = useContext(ActivityContext);
  if (!value) throw new Error("useActionSuccess must be used inside ActionSuccessProvider");
  return value;
}

export function ActionSuccessProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  const complete = useCallback(async (activity: CirclePandaActivity) => {
    try {
      const { data, error } = await supabase.rpc("complete_first_activity", {
        p_activity_key: activity,
        p_reward_bc: 2,
      });
      if (error) throw error;

      const next = {
        activity,
        firstTime: Boolean((data as any)?.awarded),
        id: Date.now(),
      };
      setFeedback(next);
      window.setTimeout(() => {
        setFeedback(current => current?.id === next.id ? null : current);
      }, 2300);
    } catch {
      // Never claim a BC reward unless Supabase confirms it.
      const next = { activity, firstTime: false, id: Date.now() };
      setFeedback(next);
      window.setTimeout(() => {
        setFeedback(current => current?.id === next.id ? null : current);
      }, 2300);
    }
  }, []);

  const value = useMemo(() => ({ complete }), [complete]);

  return (
    <ActivityContext.Provider value={value}>
      {children}
      {feedback ? <ActionSuccessOverlay feedback={feedback} onClose={() => setFeedback(null)} /> : null}
    </ActivityContext.Provider>
  );
}



function ActionSuccessOverlay({ feedback, onClose }: { feedback: NonNullable<Feedback>; onClose: () => void }) {
  const meta = META[feedback.activity];
  return (
    <div className="pointer-events-none fixed inset-0 z-[300] grid place-items-center px-5" aria-live="polite">
      <div className="cp-action-success pointer-events-auto" onAnimationEnd={onClose}>
        <div className={`cp-action-success-icon ${meta.motion}`}>{meta.icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-black">{meta.title}</p>
          {feedback.firstTime ? <p className="mt-0.5 text-xs font-bold text-primary">First time · +2 BC</p> : <p className="mt-0.5 text-xs text-muted-foreground">Completed successfully</p>}
        </div>
        {feedback.firstTime ? <div className="cp-bc-reward" aria-label="2 BC reward">+2 BC</div> : null}
      </div>
    </div>
  );
}
