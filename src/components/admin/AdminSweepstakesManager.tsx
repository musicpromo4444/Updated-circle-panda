import { useEffect, useMemo, useState } from "react";
import { Gift, ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type Prize = {
  id: string;
  name: string;
  label: string;
  description: string;
  entry_instructions: string;
  button_label: string;
  action_type: "activity" | "link" | "instructions" | "none";
  action_url: string;
  entry_requirement: string;
  ticket_price_bc: number;
  consolation_price: number;
  image_url: string;
  emoji: string;
  jackpot: boolean;
  enabled: boolean;
  starts_at: string | null;
  closes_at: string | null;
  display_order: number;
};

const blankPrize = (order: number): Prize => ({
  id: `prize-${Date.now()}-${order}`,
  name: "",
  label: "",
  description: "",
  entry_instructions: "",
  button_label: "Enter Contest",
  action_type: "activity",
  action_url: "",
  entry_requirement: "",
  ticket_price_bc: 1,
  consolation_price: 0,
  image_url: "",
  emoji: "🎁",
  jackpot: false,
  enabled: true,
  starts_at: null,
  closes_at: null,
  display_order: order,
});

export function AdminSweepstakesManager() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [cardLimit, setCardLimit] = useState(5);
  const [activities, setActivities] = useState<Array<{ slug: string; title: string; description: string }>>([]);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: controls, error: controlError }, { data: activityRows, error: activityError }, { data: activityConfig, error: activityConfigError }] = await Promise.all([
      (supabase as any).rpc("admin_get_sweepstakes_controls"),
      (supabase as any).rpc("admin_get_sweepstakes_activity_options"),
      (supabase as any).rpc("get_sweepstakes_activity_config"),
    ]);
    const error = controlError ?? activityError ?? activityConfigError;
    if (error) {
      toast.error(error.message ?? "Could not load Sweepstakes controls");
      setLoading(false);
      return;
    }
    setCardLimit(Math.min(5, Math.max(3, Number(controls?.config?.card_limit ?? 5))));
    setPrizes((controls?.prizes ?? []) as Prize[]);
    setActivities((activityRows?.data ?? []) as Array<{ slug: string; title: string; description: string }>);
    setSelectedActivity(String(Array.isArray(activityConfig?.data) ? activityConfig.data[0]?.activity_slug : activityConfig?.data?.activity_slug ?? ""));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const visiblePrizes = useMemo(() => [...prizes].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id)), [prizes]);

  const saveConfig = async () => {
    setSaving("config");
    const { error } = await (supabase as any).rpc("admin_update_sweepstakes_page_config", { p_card_limit: cardLimit });
    if (!error && selectedActivity) {
      const activityResult = await (supabase as any).rpc("admin_set_sweepstakes_activity", { p_activity_slug: selectedActivity });
      if (activityResult.error) {
        setSaving(null);
        toast.error(activityResult.error.message ?? "Could not set contest activity");
        return;
      }
    }
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not save Sweepstakes settings");
    toast.success("Sweepstakes settings saved");
  };

  const savePrize = async (prize: Prize) => {
    setSaving(prize.id);
    const { error } = await (supabase as any).rpc("admin_upsert_sweepstake_prize", {
      p_id: prize.id,
      p_name: prize.name,
      p_label: prize.label,
      p_description: prize.description,
      p_entry_instructions: prize.entry_instructions,
      p_button_label: prize.button_label,
      p_action_type: prize.action_type,
      p_action_url: prize.action_url,
      p_entry_requirement: prize.entry_requirement,
      p_ticket_price_bc: Number(prize.ticket_price_bc) || 1,
      p_consolation_price: Number(prize.consolation_price) || 0,
      p_image_url: prize.image_url,
      p_emoji: prize.emoji,
      p_jackpot: prize.jackpot,
      p_enabled: prize.enabled,
      p_starts_at: prize.starts_at || null,
      p_closes_at: prize.closes_at || null,
      p_display_order: Number(prize.display_order) || 0,
    });
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not save prize");
    toast.success(`${prize.name || "Prize"} saved`);
    await load();
  };

  const deletePrize = async (id: string) => {
    if (!window.confirm("Remove this prize card?")) return;
    setSaving(id);
    const { error } = await (supabase as any).rpc("admin_delete_sweepstake_prize", { p_id: id });
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not remove prize");
    setPrizes((prev) => prev.filter((p) => p.id !== id));
    toast.success("Prize card removed");
  };

  const uploadImage = async (prize: Prize, file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be 5MB or smaller");
    setSaving(`upload-${prize.id}`);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `prizes/${prize.id}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("circle-panda-sweepstakes").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      setSaving(null);
      return toast.error(error.message ?? "Image upload failed");
    }
    const { data } = supabase.storage.from("circle-panda-sweepstakes").getPublicUrl(path);
    setPrizes((prev) => prev.map((p) => p.id === prize.id ? { ...p, image_url: data.publicUrl } : p));
    setSaving(null);
    toast.success("Prize image uploaded. Save the card to publish it.");
  };

  const update = (id: string, patch: Partial<Prize>) => setPrizes((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">Sweepstakes Control</h2>
        <p className="text-xs text-muted-foreground">Choose the contest activity and manage the prize cards shown to users.</p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2"><Gift className="size-4 text-primary" /><h3 className="font-bold">Contest entry</h3></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground">Activity opened by CLICK TO CONTEST
            <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              <option value="">Choose an activity</option>
              {activities.map((a) => <option key={a.slug} value={a.slug}>{a.title}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Prize cards shown (3–5)
            <select value={cardLimit} onChange={(e) => setCardLimit(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              {[3,4,5].map((n) => <option key={n} value={n}>{n} cards</option>)}
            </select>
          </label>
        </div>
        <Button onClick={() => void saveConfig()} disabled={saving === "config"}><Save className="mr-2 size-4" />{saving === "config" ? "Saving…" : "Save Sweepstakes Settings"}</Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div><h3 className="font-display text-lg font-bold">Prize cards</h3><p className="text-xs text-muted-foreground">Everything here is editable by Admin.</p></div>
        <Button variant="outline" onClick={() => setPrizes((prev) => [...prev, blankPrize(prev.length)])} disabled={prizes.length >= 20}><Plus className="mr-1.5 size-4" />Add prize</Button>
      </div>

      {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading live Sweepstakes settings…</div> : null}

      <div className="grid gap-4">
        {!loading && visiblePrizes.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No prize cards configured yet. Add the first one above.</div> : null}
        {visiblePrizes.map((prize) => (
          <article key={prize.id} className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Input value={prize.name} onChange={(e) => update(prize.id, { name: e.target.value })} placeholder="Prize name — e.g. PS5" className="font-bold" />
                <p className="mt-1 text-[11px] text-muted-foreground">ID: {prize.id}</p>
              </div>
              <div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground">Show</span><Switch checked={prize.enabled} onCheckedChange={(checked) => update(prize.id, { enabled: checked })} /></div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-[11px] text-muted-foreground">Label<Input value={prize.label} onChange={(e) => update(prize.id, { label: e.target.value })} placeholder="Grand Prize" className="mt-1" /></label>
              <label className="text-[11px] text-muted-foreground">Display order<Input type="number" min={0} value={prize.display_order} onChange={(e) => update(prize.id, { display_order: Number(e.target.value) || 0 })} className="mt-1" /></label>
              <label className="text-[11px] text-muted-foreground">Emoji fallback<Input value={prize.emoji} onChange={(e) => update(prize.id, { emoji: e.target.value })} className="mt-1" /></label>
            </div>

            <label className="block text-[11px] text-muted-foreground">Description
              <textarea value={prize.description} onChange={(e) => update(prize.id, { description: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" placeholder="Describe the prize." />
            </label>

            <label className="block text-[11px] text-muted-foreground">Ways to contest / entry instructions
              <textarea value={prize.entry_instructions} onChange={(e) => update(prize.id, { entry_instructions: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" placeholder="Write exactly how users can enter." />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-[11px] text-muted-foreground">Button label<Input value={prize.button_label} onChange={(e) => update(prize.id, { button_label: e.target.value })} className="mt-1" /></label>
              <label className="text-[11px] text-muted-foreground">Action
                <select value={prize.action_type} onChange={(e) => update(prize.id, { action_type: e.target.value as Prize["action_type"] })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <option value="activity">Open contest activity</option><option value="instructions">Show entry instructions</option><option value="link">Open link</option><option value="none">No action</option>
                </select>
              </label>
              <label className="text-[11px] text-muted-foreground">Action link (if used)<Input value={prize.action_url} onChange={(e) => update(prize.id, { action_url: e.target.value })} placeholder="https://…" className="mt-1" /></label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-[11px] text-muted-foreground">Entry requirement<Input value={prize.entry_requirement} onChange={(e) => update(prize.id, { entry_requirement: e.target.value })} placeholder="e.g. Play the contest" className="mt-1" /></label>
              <label className="text-[11px] text-muted-foreground">Entry BC<Input type="number" min={1} value={prize.ticket_price_bc} onChange={(e) => update(prize.id, { ticket_price_bc: Number(e.target.value) || 1 })} className="mt-1" /></label>
              <label className="text-[11px] text-muted-foreground">Consolation<Input type="number" min={0} value={prize.consolation_price} onChange={(e) => update(prize.id, { consolation_price: Number(e.target.value) || 0 })} className="mt-1" /></label>
              <label className="text-[11px] text-muted-foreground">Starts<input type="datetime-local" value={prize.starts_at ? new Date(prize.starts_at).toISOString().slice(0,16) : ""} onChange={(e) => update(prize.id, { starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-[11px] text-muted-foreground">Closes<input type="datetime-local" value={prize.closes_at ? new Date(prize.closes_at).toISOString().slice(0,16) : ""} onChange={(e) => update(prize.id, { closes_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
              <label className="text-[11px] text-muted-foreground">Prize image URL<input value={prize.image_url} onChange={(e) => update(prize.id, { image_url: e.target.value })} placeholder="Or upload below" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
              <div className="flex items-end">
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs font-semibold hover:bg-secondary/40">
                  <ImagePlus className="size-4" />Upload prize image
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const file=e.target.files?.[0]; if(file) void uploadImage(prize,file); e.currentTarget.value=""; }} disabled={saving === `upload-${prize.id}`} />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs"><Switch checked={prize.jackpot} onCheckedChange={(checked) => update(prize.id, { jackpot: checked })} /> Mark as featured prize</label>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deletePrize(prize.id)} disabled={saving === prize.id}><Trash2 className="mr-1.5 size-4" />Remove</Button>
                <Button onClick={() => void savePrize(prize)} disabled={saving === prize.id || !prize.name.trim()}><Save className="mr-1.5 size-4" />Save prize</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
