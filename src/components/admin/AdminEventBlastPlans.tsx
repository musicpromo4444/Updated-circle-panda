import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BlastPlan = {
  id: string;
  name: string;
  unique_reach: number;
  duration_minutes: number;
  price_usd: number | string | null;
  bc_price: number | string | null;
  enabled: boolean;
};

const blank = {
  id: "",
  name: "",
  unique_reach: "100",
  duration_minutes: "1440",
  price_usd: "",
  price_bc: "",
  enabled: true,
};

export function AdminEventBlastPlans() {
  const [plans, setPlans] = useState<BlastPlan[]>([]);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_event_blast_plans");
    setLoading(false);
    if (error) {
      toast.error("Could not load Event Blast plans: " + error.message);
      return;
    }
    const rows = Array.isArray(data) ? data : Array.isArray(data?.plans) ? data.plans : [];
    setPlans(rows as BlastPlan[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const edit = (plan: BlastPlan) => setForm({
    id: plan.id,
    name: plan.name ?? "",
    unique_reach: String(plan.unique_reach ?? 100),
    duration_minutes: String(plan.duration_minutes ?? 1440),
    price_usd: plan.price_usd == null ? "" : String(plan.price_usd),
    price_bc: plan.bc_price == null ? "" : String(plan.bc_price),
    enabled: Boolean(plan.enabled),
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const reach = Number(form.unique_reach);
    const duration = Number(form.duration_minutes);
    const usd = form.price_usd.trim() === "" ? null : Number(form.price_usd);
    const bc = form.price_bc.trim() === "" ? null : Number(form.price_bc);
    if (!form.name.trim() || !Number.isInteger(reach) || reach < 1 ||
        !Number.isInteger(duration) || duration < 1 ||
        (usd !== null && (!Number.isFinite(usd) || usd < 0)) ||
        (bc !== null && (!Number.isInteger(bc) || bc < 0))) {
      toast.error("Enter a name, positive reach and duration, and valid non-negative prices.");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_upsert_event_blast_plan", {
      p_id: form.id || null,
      p_name: form.name.trim(),
      p_unique_reach: reach,
      p_duration_minutes: duration,
      p_price_usd: usd,
      p_bc_price: bc,
      p_enabled: form.enabled,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save plan: " + error.message);
      return;
    }
    toast.success("Event Blast plan saved.");
    setForm(blank);
    await load();
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">Event Blast Plans</h2>
        <p className="text-sm text-muted-foreground">
          Configure promotion reach, duration, and BC/cash prices. Cash checkout remains unavailable until verified Paystack confirmation is connected.
        </p>
      </header>
      <form onSubmit={save} className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="blast-plan-name">Plan name</Label>
          <Input id="blast-plan-name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Local Reach" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="blast-plan-id">Plan ID (leave blank for new)</Label>
          <Input id="blast-plan-id" value={form.id} onChange={e => setForm(v => ({ ...v, id: e.target.value }))} placeholder="Existing plan ID for edits" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="blast-reach">Unique audience reach</Label>
          <Input id="blast-reach" type="number" min="1" step="1" value={form.unique_reach} onChange={e => setForm(v => ({ ...v, unique_reach: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="blast-duration">Duration (minutes)</Label>
          <Input id="blast-duration" type="number" min="1" step="1" value={form.duration_minutes} onChange={e => setForm(v => ({ ...v, duration_minutes: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="blast-usd">Cash price (USD, optional)</Label>
          <Input id="blast-usd" type="number" min="0" step="0.01" value={form.price_usd} onChange={e => setForm(v => ({ ...v, price_usd: e.target.value }))} placeholder="Set only after deciding price" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="blast-bc">BC price (optional)</Label>
          <Input id="blast-bc" type="number" min="0" step="1" value={form.price_bc} onChange={e => setForm(v => ({ ...v, price_bc: e.target.value }))} placeholder="Set only after deciding price" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.enabled} onChange={e => setForm(v => ({ ...v, enabled: e.target.checked }))} />
          Enable this plan for users
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save plan"}</Button>
          <Button type="button" variant="outline" onClick={() => setForm(blank)}>Clear form</Button>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>Refresh plans</Button>
        </div>
      </form>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? <p className="p-4 text-sm text-muted-foreground">Loading plans…</p> : plans.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No Event Blast plans are configured yet. Add one above after deciding its pricing.</p>
        ) : (
          <div className="divide-y">
            {plans.map((plan, index) => (
              <div key={plan.id ?? index} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Reach {plan.unique_reach} · {plan.duration_minutes} minutes · USD {plan.price_usd ?? "not set"} · {plan.bc_price == null ? "BC not set" : plan.bc_price + " BC"} · {plan.enabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="break-all font-mono text-[10px] text-muted-foreground">{plan.id}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => edit(plan)}>Edit plan</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
