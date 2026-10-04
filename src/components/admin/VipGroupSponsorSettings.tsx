import { useEffect, useState } from "react";
import { Gift, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

const REWARDS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

type Creative = { id: string; sponsor: string; headline: string; status: string; placement: string };

export function VipGroupSponsorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [displayText, setDisplayText] = useState("50,000 BC 🪙 GIVEAWAY FROM OUR VIP SPONSOR — CLICK TO CLAIM");
  const [adId, setAdId] = useState("");
  const [rewardBc, setRewardBc] = useState(5);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: ads, error: adsError }] = await Promise.all([
      (supabase as any).rpc("admin_get_vip_group_sponsor_config"),
      (supabase as any).rpc("admin_list_vip_group_sponsor_creatives"),
    ]);
    if (adsError) { toast.error(adsError.message ?? "Could not load VIP sponsor creatives"); return; }
    if (error) { toast.error(error.message ?? "Could not load VIP sponsor settings"); return; }
    setEnabled(Boolean(data?.enabled));
    setDisplayText(String(data?.display_text ?? ""));
    setAdId(String(data?.ad_id ?? ""));
    setRewardBc(Number(data?.reward_bc ?? 5));
    setCooldownHours(Number(data?.cooldown_hours ?? 24));
    setCreatives((ads ?? []) as Creative[]);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (displayText.trim().length < 5 || displayText.trim().length > 140) {
      toast.error("Sponsor text must be 5–140 characters");
      return;
    }
    if (!adId) { toast.error("Select a VIP sponsor creative first"); return; }
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_save_vip_group_sponsor_config", {
      p_enabled: enabled,
      p_display_text: displayText.trim(),
      p_ad_id: adId,
      p_reward_bc: rewardBc,
      p_cooldown_hours: cooldownHours,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("VIP sponsor gift settings saved");
    await load();
  };

  return <section className="rounded-3xl border border-amber-400/25 bg-amber-500/5 p-4 sm:p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-400"><Gift className="size-5" /></div>
      <div>
        <h2 className="font-display text-lg font-bold">VIP Group Sponsor Gift</h2>
        <p className="text-xs text-muted-foreground">Controls the floating animated gift shown inside VIP group chat. The reward is credited to the user's real BC balance after the sponsor is completed and claimed.</p>
      </div>
      <Switch className="ml-auto" checked={enabled} onCheckedChange={setEnabled} />
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2"><Label>Bold gift text</Label><Input className="mt-1" value={displayText} onChange={e=>setDisplayText(e.target.value)} maxLength={140} placeholder="50,000 BC 🪙 GIVEAWAY FROM OUR VIP SPONSOR — CLICK TO CLAIM" /></label>
      <label><Label>Reward paid to user</Label><select className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" value={rewardBc} onChange={e=>setRewardBc(Number(e.target.value))}>{REWARDS.map(v=><option key={v} value={v}>{v} BC 🪙</option>)}</select></label>
      <label><Label>Repeat after</Label><select className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" value={cooldownHours} onChange={e=>setCooldownHours(Number(e.target.value))}>{[1,6,12,24,48,72].map(v=><option key={v} value={v}>{v} hours</option>)}</select></label>
      <label className="sm:col-span-2"><Label>VIP sponsor ad creative</Label><select className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" value={adId} onChange={e=>setAdId(e.target.value)}><option value="">Select a VIP sponsor creative</option>{creatives.map(c=><option key={c.id} value={c.id}>{c.sponsor} — {c.headline} ({c.status})</option>)}</select></label>
    </div>

    <div className="rounded-2xl border border-amber-400/20 bg-background/60 p-3 text-xs">
      <p className="font-bold">How it works</p>
      <p className="mt-1 text-muted-foreground">Gift appears in the lower-left of VIP chat → user taps → sponsor ad plays → user sees the reward → user taps Claim Reward → Supabase atomically adds the selected BC to the balance. A completed claim cannot be claimed again.</p>
    </div>
    <Button onClick={()=>void save()} disabled={saving}>{saving?<Loader2 className="mr-2 size-4 animate-spin"/>:<Save className="mr-2 size-4"/>}Save VIP sponsor settings</Button>
  </section>;
}
