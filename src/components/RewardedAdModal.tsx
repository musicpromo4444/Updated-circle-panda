import { useEffect, useState } from "react";
import { Clapperboard, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AD_COOLDOWN_MS = 60_000;
const AD_LENGTH_MS = 5000;

type Phase = "loading" | "playing" | "done" | "failed";

export function RewardedAdModal({
  open,
  groupId,
  sessionId,
  onClose,
}: {
  open: boolean;
  groupId: string;
  sessionId: string | null;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [reward, setReward] = useState<string>("");
  const [creative, setCreative] = useState<any | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setProgress(0);
    setCreative(null);
    void (async () => {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase.rpc("get_ad_runtime_config");
      if (error) { toast.error("The group reward ad could not be loaded."); return; }
      const selected = (Array.isArray(data?.creatives) ? data.creatives : []).find((x:any) => x.placement === "group_message_rewarded" && x.status === "active");
      if (!selected) { setPhase("failed"); return; }
      setCreative(selected);
    })();
    const load = setTimeout(() => setPhase("playing"), 1200);
    return () => clearTimeout(load);
  }, [open]);

  useEffect(() => {
    if (phase !== "playing") return;
    const started = Date.now();
    const duration = Math.max(1000, Number(creative?.duration_seconds ?? 5) * 1000);
    const i = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(i);
        setPhase("done");
      }
    }, 100);
    return () => clearInterval(i);
  }, [phase]);

  useEffect(() => {
    if (phase !== "failed") return;
    const t = setTimeout(() => onClose(), 900);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  async function claim() {
    if (!sessionId) {
      toast.error("Reward session is missing.");
      return;
    }
    const { data, error } = await supabase.rpc("complete_group_reward_ad_secure", {
      p_session_id: sessionId,
    });
    if (error) {
      toast.error(error.message ?? "Reward could not be claimed");
      return;
    }
    setReward(`+${Number((data as any)?.reward_bc ?? 3)} BC`);
    onClose();
  }
