import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Campaign = { id: string; name: string; enabled: boolean; cooldown_hours: number };
type Prize = {
  id: string; prize_id: string; title: string; label: string; prize_type: string; value: number;
  weight: number; enabled: boolean; blurb: string; fulfilment_type: "instant" | "manual";
  emoji: string; rarity: string;
};
type Claim = {
  id: string; user_id: string; username: string; prize_id: string; title: string; prize_type: string;
  status: string; fulfilment_type: string; created_at: string; admin_note?: string | null;
  qualification_answers?: Array<{ stage_id: string; answers: Record<string, unknown>; created_at: string }> | null;
};
type Config = { campaign: Campaign | null; prizes: Prize[]; claims: Claim[] };

export default function AdminRewardWheelManager() {
  const [config, setConfig] = useState<Config>({ campaign: null, prizes: [], claims: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_get_reward_wheel_config");
    if (error) {
      toast.error(error.message ?? "Spin Wheel settings could not be loaded");
      setLoading(false);
      return;
    }
    setConfig({
      campaign: data?.campaign ?? null,
      prizes: Array.isArray(data?.prizes) ? data.prizes : [],
      claims: Array.isArray(data?.claims) ? data.claims : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveCampaign = async () => {
    if (!config.campaign) return;
    setSaving("campaign");
    const { error } = await (supabase as any).rpc("admin_update_reward_wheel_campaign", {
      p_campaign_id: config.campaign.id,
      p_enabled: config.campaign.enabled,
      p_cooldown_hours: Number(config.campaign.cooldown_hours),
    });
    if (error) toast.error(error.message ?? "Campaign settings could not be saved");
    else toast.success("Spin Wheel settings saved");
    setSaving(null);
    if (!error) await load();
  };

  const savePrize = async (prize: Prize) => {
    setSaving(prize.id);
    const { error } = await (supabase as any).rpc("admin_update_reward_wheel_prize", {
      p_prize_id: prize.id,
      p_title: prize.title,
      p_value: Number(prize.value),
      p_weight: Number(prize.weight),
      p_enabled: prize.enabled,
      p_blurb: prize.blurb,
      p_fulfilment_type: prize.fulfilment_type,
    });
    if (error) toast.error(error.message ?? "Prize settings could not be saved");
    else toast.success(`${prize.title} saved`);
    setSaving(null);
    if (!error) await load();
  };

  const updatePrize = (id: string, patch: Partial<Prize>) => {
    setConfig((current) => ({
      ...current,
      prizes: current.prizes.map((prize) => prize.id === id ? { ...prize, ...patch } : prize),
    }));
  };

  const updateClaim = async (claim: Claim, status: "fulfilled" | "rejected") => {
    setSaving(claim.id);
    const { error } = await (supabase as any).rpc("admin_update_reward_claim_status", {
      p_claim_id: claim.id,
      p_status: status,
      p_admin_note: notes[claim.id] ?? "",
    });
    if (error) toast.error(error.message ?? "Reward claim could not be updated");
    else toast.success(status === "fulfilled" ? "Reward marked as fulfilled" : "Reward claim rejected");
    setSaving(null);
    if (!error) await load();
  };

  if (loading) return <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading Spin Wheel settings…</CardContent></Card>;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Spin Wheel rewards</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {config.campaign ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3">
                <div>
                  <p className="font-semibold">{config.campaign.name}</p>
                  <p className="text-sm text-muted-foreground">Server-controlled spin cooldown</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={config.campaign.enabled} onCheckedChange={(enabled) => setConfig((s) => ({ ...s, campaign: s.campaign ? { ...s.campaign, enabled } : null }))} /> Enabled</label>
                  <Input type="number" min={1} max={720} className="w-24" value={config.campaign.cooldown_hours} onChange={(e) => setConfig((s) => ({ ...s, campaign: s.campaign ? { ...s.campaign, cooldown_hours: Number(e.target.value) } : null }))} aria-label="Spin cooldown hours" />
                  <span className="text-sm text-muted-foreground">hours</span>
                  <Button onClick={() => void saveCampaign()} disabled={saving === "campaign"}>{saving === "campaign" ? "Saving…" : "Save"}</Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {config.prizes.map((prize) => (
                  <div key={prize.id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{prize.emoji}</span>
                        <div><p className="font-semibold">{prize.title}</p><p className="text-xs text-muted-foreground">{prize.prize_id} · {prize.rarity}</p></div>
                      </div>
                      <Switch checked={prize.enabled} onCheckedChange={(enabled) => updatePrize(prize.id, { enabled })} aria-label={`Enable ${prize.title}`} />
                    </div>
                    <label className="block space-y-1"><span className="text-xs font-medium">Prize title</span><Input value={prize.title} onChange={(e) => updatePrize(prize.id, { title: e.target.value })} /></label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block space-y-1"><span className="text-xs font-medium">Value (BC / days / units)</span><Input type="number" min={0} value={prize.value} onChange={(e) => updatePrize(prize.id, { value: Number(e.target.value) })} /></label>
                      <label className="block space-y-1"><span className="text-xs font-medium">Draw weight</span><Input type="number" min={0} step="0.05" value={prize.weight} onChange={(e) => updatePrize(prize.id, { weight: Number(e.target.value) })} /></label>
                    </div>
                    <label className="block space-y-1"><span className="text-xs font-medium">Winner message</span><Textarea rows={2} value={prize.blurb} onChange={(e) => updatePrize(prize.id, { blurb: e.target.value })} /></label>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{prize.fulfilment_type === "manual" ? "Manual fulfillment" : "Instant"}</Badge>
                      <Button size="sm" onClick={() => void savePrize(prize)} disabled={saving === prize.id}>{saving === prize.id ? "Saving…" : "Save prize"}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">No Spin Wheel campaign is configured.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reward claims requiring review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {config.claims.length === 0 ? <p className="text-sm text-muted-foreground">No pending reward claims.</p> : config.claims.map((claim) => (
            <div key={claim.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold">{claim.title}</p><p className="text-sm text-muted-foreground">{claim.username} · {new Date(claim.created_at).toLocaleString()}</p></div>
                <Badge variant="outline">{claim.status.replaceAll("_", " ")}</Badge>
              </div>
              {claim.qualification_answers?.map((submission, index) => <pre key={submission.stage_id + index} className="overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{JSON.stringify(submission.answers, null, 2)}</pre>)}
              <label className="block space-y-1"><span className="text-xs font-medium">Admin note</span><Textarea rows={2} value={notes[claim.id] ?? claim.admin_note ?? ""} onChange={(e) => setNotes((s) => ({ ...s, [claim.id]: e.target.value }))} placeholder="Fulfillment reference or reason for rejection" /></label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" disabled={saving === claim.id} onClick={() => void updateClaim(claim, "rejected")}>Reject</Button>
                <Button size="sm" disabled={saving === claim.id} onClick={() => void updateClaim(claim, "fulfilled")}>{saving === claim.id ? "Saving…" : "Mark fulfilled"}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
