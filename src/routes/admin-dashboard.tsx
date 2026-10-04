import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Eye, Loader2, RefreshCw, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { UniversalAdManager } from "@/components/admin/UniversalAdManager";
import { PaymentProviderSetup } from "@/components/admin/PaymentProviderSetup";
import { UniversalWinnerManager } from "@/components/admin/UniversalWinnerManager";
import { AdminIntegrationCenter } from "@/components/admin/AdminIntegrationCenter";
import { AdminControlCenter } from "@/components/admin/AdminControlCenter";
import { AdminPermissionManager } from "@/components/admin/AdminPermissionManager";
import { UniversalFloatingIconManager } from "@/components/admin/UniversalFloatingIconManager";
import { AdminOperationsCenter } from "@/components/admin/AdminOperationsCenter";
import { AdminAppDownloadPromotion } from "@/components/admin/AdminAppDownloadPromotion";
import { AdminCampaignReports } from "@/components/admin/AdminCampaignReports";
import { VipGroupCallSettings } from "@/components/admin/VipGroupCallSettings";
import { AdminMonetizationControl } from "@/components/admin/AdminMonetizationControl";
import { CirclePandaMediaManager } from "@/components/admin/CirclePandaMediaManager";
import { useAdminStore } from "@/components/admin/adminStore";

export const Route = createFileRoute("/admin-dashboard")({ component: AdminDashboardPage });

type RewardItem = { label: string; amount: number };
type Activity = { slug: string; title: string; description: string; free_attempts: number; timer_seconds: number; is_enabled: boolean; sort_order: number; reward_pool?: RewardItem[] };
type Day = { day_number: number; activity_slug: string | null; activity_title: string | null; enabled: boolean; updated_at: string };
type GlobalAction = { enabled: boolean; feature_key: string; destination: string; icon: string; label: string };

const GLOBAL_FEATURES = [
  ["hot-seat", "/hot-seat", "Hot Seat"], ["live", "/live", "Live"], ["activities", "/activities", "Activities"],
  ["music-time", "/music-time", "Music Time"], ["sweepstakes", "/sweepstakes", "Sweepstakes"], ["dating", "/dating", "Dating"],
  ["groups", "/groups", "Groups"], ["events", "/events", "Events"], ["confessions", "/confessions", "Confessions"],
  ["leaders", "/leaders", "Leaders"], ["store", "/store", "Store"], ["profile", "/profile", "Profile"], ["messages", "/messages", "Messages"],
] as const;

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function InputLike({value,onChange,maxLength,placeholder}:{value:string;onChange:(v:string)=>void;maxLength:number;placeholder:string}) {
  return <input value={value} onChange={e=>onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" />;
}

function AdminDashboardPage() {
  const { isAdmin } = useStore();
  const admin = useAdminStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [globalAction, setGlobalAction] = useState<GlobalAction | null>(null);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingActivity, setSavingActivity] = useState<string | null>(null);
  const [globalDraft, setGlobalDraft] = useState<GlobalAction | null>(null);
  const [savedActivities, setSavedActivities] = useState<Record<string, Activity>>({});
  const [sweepActivitySlug, setSweepActivitySlug] = useState("wheel_spin");
  const [savedSweepActivitySlug, setSavedSweepActivitySlug] = useState("wheel_spin");
  const [savingSweepActivity, setSavingSweepActivity] = useState(false);

  const load = async () => {
    setLoading(true);
    const [catalog, schedule, global, sweep] = await Promise.all([
      (supabase as any).rpc("admin_get_seven_day_activity_catalog"),
      (supabase as any).rpc("admin_get_seven_day_activity_schedule"),
      (supabase as any).rpc("get_global_action_slot"),
      (supabase as any).rpc("get_sweepstakes_activity_config"),
    ]);
    setLoading(false);
    if (catalog.error || schedule.error || global.error || sweep.error) return toast.error((catalog.error ?? schedule.error ?? global.error ?? sweep.error)?.message ?? "Admin data could not load");
    const loadedActivities = (catalog.data ?? []) as Activity[];
    setActivities(loadedActivities);
    setSavedActivities(Object.fromEntries(loadedActivities.map(activity => [activity.slug, structuredClone(activity)])));
    setDays(schedule.data ?? []);
    setGlobalAction(global.data ?? null);
    setGlobalDraft(global.data ?? null);
    const selectedSweep = String(sweep.data?.[0]?.activity_slug ?? "wheel_spin");
    setSweepActivitySlug(selectedSweep);
    setSavedSweepActivitySlug(selectedSweep);
  };
  useEffect(() => { if (isAdmin) void load(); else setLoading(false); }, [isAdmin]);

  const draftChanged = JSON.stringify(globalDraft) !== JSON.stringify(globalAction);
  const validDraft = Boolean(globalDraft && globalDraft.icon.trim().length >= 1 && globalDraft.icon.trim().length <= 8 && globalDraft.label.trim().length >= 1 && globalDraft.label.trim().length <= 24);
  const activityChanged = (activity: Activity) => JSON.stringify(activity) !== JSON.stringify(savedActivities[activity.slug]);
  const unsavedActivities = activities.filter(activityChanged).length;
  const enabledActivities = activities.filter(a => a.is_enabled).length;
  const assignedDays = days.filter(d => d.activity_slug).length;
  const disabledAssignedActivities = days.filter(d => d.activity_slug && !activities.find(a => a.slug === d.activity_slug)?.is_enabled);

  const updateRewardItem = (slug: string, index: number, patch: Partial<RewardItem>) => setActivities(prev => prev.map(item => item.slug === slug ? { ...item, reward_pool: (item.reward_pool ?? []).map((reward, i) => i === index ? { ...reward, ...patch } : reward) } : item));

  const addRewardItem = (slug: string) => setActivities(prev => prev.map(item => item.slug === slug ? { ...item, reward_pool: [...(item.reward_pool ?? []), { label: "New reward", amount: 0 }] } : item));

  const removeRewardItem = (slug: string, index: number) => setActivities(prev => prev.map(item => item.slug === slug ? { ...item, reward_pool: (item.reward_pool ?? []).filter((_, i) => i !== index) } : item));

  const saveActivity = async (activity: Activity) => {
    const rewardPool = (activity.reward_pool ?? []).map(item => ({ label: item.label.trim(), amount: Math.max(0, Math.floor(Number(item.amount) || 0)) }));
    if (rewardPool.some(item => !item.label || item.label.length > 80)) return toast.error("Reward labels must be 1–80 characters");
    setSavingActivity(activity.slug);
    const { data, error } = await (supabase as any).rpc("admin_update_seven_day_activity_config", {
      p_slug: activity.slug,
      p_enabled: activity.is_enabled,
      p_free_attempts: activity.free_attempts,
      p_reward_pool: rewardPool,
      p_timer_seconds: activity.timer_seconds,
    });
    setSavingActivity(null);
    if (error) return toast.error(error.message ?? "Could not update activity");
    const saved = { ...activity, is_enabled: data.enabled, free_attempts: data.free_attempts, timer_seconds: data.timer_seconds, reward_pool: data.reward_pool ?? rewardPool };
    setActivities(prev => prev.map(item => item.slug === activity.slug ? saved : item));
    setSavedActivities(prev => ({ ...prev, [activity.slug]: structuredClone(saved) }));
    toast.success(`${activity.title} settings saved`);
  };

  const save = async (day: number, slug: string | null) => {
    setSaving(day);
    const { data, error } = await (supabase as any).rpc("admin_set_seven_day_activity", { p_day_number: day, p_activity_slug: slug, p_enabled: Boolean(slug) });
    setSaving(null);
    if (error) return toast.error(error.message ?? "Could not update the activity schedule");
    setDays(prev => prev.map(row => row.day_number === day ? { ...row, activity_slug: data.activity_slug, activity_title: activities.find(a => a.slug === data.activity_slug)?.title ?? null, enabled: data.enabled, updated_at: data.updated_at } : row));
    toast.success(`${DAYS[day-1]} activity updated`);
  };

  if (!isAdmin) return <AppShell title="Admin Dashboard" hidePageHeader><div className="mx-auto max-w-xl p-6"><div className="panda-panel rounded-3xl p-7 text-center"><Shield className="mx-auto size-10 text-muted-foreground"/><h1 className="mt-3 font-display text-xl font-bold">Admin access required</h1><p className="mt-1 text-sm text-muted-foreground">This area is protected by the Circle Panda server role.</p><Link to="/"><Button className="mt-5">Return home</Button></Link></div></div></AppShell>;

  return <AppShell title="Admin Dashboard" hidePageHeader>
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-24 sm:p-6">
      <AdminControlCenter />
      <VipGroupCallSettings />
      <AdminAppDownloadPromotion />
      <AdminCampaignReports />
      <CirclePandaMediaManager />
      <AdminMonetizationControl
        adConfig={admin.adConfig}
        adMetrics={admin.adMetrics}
        onUpdateConfig={admin.updateAdConfig}
        onTogglePartner={admin.toggleSponsorPartner}
        onAddCreative={admin.addCreative}
        onUpdateCreative={admin.updateCreative}
        onDeleteCreative={admin.deleteCreative}
        onToggleCreativeStatus={admin.toggleCreativeStatus}
      />
      <AdminPermissionManager />
      <UniversalAdManager />
      <UniversalFloatingIconManager />
      <AdminOperationsCenter />
      <PaymentProviderSetup />
      <AdminIntegrationCenter />
      <UniversalWinnerManager />
      <div className="flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back"><ChevronLeft className="size-5"/></Button></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Master Admin</p><h1 className="font-display text-2xl font-black">7-Day Activity Schedule</h1><p className="text-sm text-muted-foreground">Choose exactly one activity for each day, or disable a day.</p></div></div>
      {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="size-9 animate-spin text-primary"/></div> : <>
        <section className="panda-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2"><Shield className="size-4 text-primary"/><h2 className="font-display font-bold">Global action slot</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">This is the single floating action shown consistently across Circle Panda pages. Turn it off, or replace Hot Seat with another existing feature.</p>
          {globalDraft ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={globalDraft.enabled} onChange={e=>setGlobalDraft(v=>v?{...v,enabled:e.target.checked}:v)} /> Show floating action</label>
            <label className="text-xs font-semibold">Feature<select value={globalDraft.feature_key} onChange={e=>{const x=GLOBAL_FEATURES.find(f=>f[0]===e.target.value); setGlobalDraft(v=>v?{...v,feature_key:e.target.value,destination:x?.[1]??v.destination}:v)}} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm">{GLOBAL_FEATURES.map(([key,dest,name])=><option key={key} value={key}>{name}</option>)}</select></label>
            <label className="text-xs font-semibold">Destination<div className="mt-1 flex h-11 items-center rounded-xl border bg-secondary/50 px-3 text-sm text-muted-foreground">{globalDraft.destination}</div></label>
            <label className="text-xs font-semibold">Custom icon<InputLike value={globalDraft.icon} onChange={v=>setGlobalDraft(x=>x?{...x,icon:v}:x)} maxLength={8} placeholder="🔥" /></label>
            <label className="text-xs font-semibold">Short label<InputLike value={globalDraft.label} onChange={v=>setGlobalDraft(x=>x?{...x,label:v}:x)} maxLength={24} placeholder="HOT SEAT" /></label>
            <div className="sm:col-span-2 flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="size-4"/><span>Preview: <strong className="text-foreground">{globalDraft.icon} {globalDraft.label}</strong> → {globalDraft.destination}</span></div><span className="text-[10px] font-semibold">{draftChanged ? "Unsaved changes" : "Saved"}</span></div><Button disabled={savingGlobal || !draftChanged || !validDraft} onClick={async()=>{if(!globalDraft || !validDraft)return; setSavingGlobal(true); const {data,error}=await (supabase as any).rpc("admin_update_global_action_slot",{p_enabled:globalDraft.enabled,p_feature_key:globalDraft.feature_key,p_destination:globalDraft.destination,p_icon:globalDraft.icon.trim(),p_label:globalDraft.label.trim()}); setSavingGlobal(false); if(error){toast.error(error.message);return;} setGlobalAction(data); setGlobalDraft(data); toast.success("Global action updated across the app");}} className="sm:col-span-2">{savingGlobal?<Loader2 className="mr-2 size-4 animate-spin"/>:null}Save global action</Button>
          </div> : null}
        </section>

        <section className="panda-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><Shield className="size-4 text-primary"/><h2 className="font-display font-bold">Sweepstakes activity</h2></div>
              <p className="mt-1 text-xs text-muted-foreground">Choose which game appears in the Sweepstakes feature. It is no longer permanently tied to Spin the Wheel.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Admin controlled</span>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value={sweepActivitySlug} onChange={e=>setSweepActivitySlug(e.target.value)} className="h-11 flex-1 rounded-xl border bg-background px-3 text-sm">
              {activities.filter(a=>a.is_enabled).map(a=><option key={a.slug} value={a.slug}>{a.title}</option>)}
            </select>
            <Button disabled={savingSweepActivity || sweepActivitySlug===savedSweepActivitySlug} onClick={async()=>{
              setSavingSweepActivity(true);
              const { data,error } = await (supabase as any).rpc("admin_set_sweepstakes_activity",{p_activity_slug:sweepActivitySlug});
              setSavingSweepActivity(false);
              if(error){toast.error(error.message);return;}
              const saved=String(data?.[0]?.activity_slug ?? sweepActivitySlug);
              setSweepActivitySlug(saved); setSavedSweepActivitySlug(saved);
              toast.success("Sweepstakes activity updated");
            }}>{savingSweepActivity?<Loader2 className="mr-2 size-4 animate-spin"/>:null}Save Sweepstakes activity</Button>
          </div>
        </section>

        <section className="panda-panel rounded-3xl p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Shield className="size-4 text-primary"/><h2 className="font-display font-bold">Daily assignment</h2></div><Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-3.5"/>Refresh</Button></div><p className="mt-1 text-xs text-muted-foreground">Users never see the full nine-activity list. After claiming Daily Login, they receive only the activity assigned to the current day.</p>
          <div className="mt-4 space-y-3">{DAYS.map((name,index)=>{const day=index+1; const row=days.find(d=>d.day_number===day); return <div key={day} className="rounded-2xl border border-border/70 bg-card p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="w-28"><p className="font-semibold">Day {day}</p><p className="text-[11px] text-muted-foreground">{name}</p></div><select aria-label={`${name} activity`} value={row?.activity_slug ?? ""} onChange={e=>void save(day,e.target.value || null)} disabled={saving===day} className="h-11 flex-1 rounded-xl border bg-background px-3 text-sm"><option value="">No activity — disabled</option>{activities.filter(a=>a.is_enabled).map(a=><option key={a.slug} value={a.slug}>{a.title}</option>)}</select><div className="min-w-24 text-right text-[11px] font-semibold text-muted-foreground">{saving===day?<Loader2 className="ml-auto size-4 animate-spin"/>:row?.activity_slug?<span className="inline-flex items-center gap-1 text-primary"><Check className="size-3.5"/> Active</span>:<span className="inline-flex items-center gap-1"><X className="size-3.5"/> Disabled</span>}</div></div></div>})}</div>
        </section>
        <section className="panda-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Shield className="size-4 text-primary"/><h2 className="font-display font-bold">Configuration summary</h2></div><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live admin state</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-card p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enabled</p><p className="mt-1 text-xl font-black">{enabledActivities}<span className="text-xs font-semibold text-muted-foreground">/{activities.length}</span></p></div>
            <div className="rounded-2xl border border-border/70 bg-card p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned days</p><p className="mt-1 text-xl font-black">{assignedDays}<span className="text-xs font-semibold text-muted-foreground">/7</span></p></div>
            <div className="rounded-2xl border border-border/70 bg-card p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unsaved</p><p className="mt-1 text-xl font-black">{unsavedActivities}</p></div>
            <div className="rounded-2xl border border-border/70 bg-card p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Global action</p><p className="mt-1 text-sm font-black">{globalAction?.enabled ? globalAction.label : "Off"}</p></div>
          </div>
          {disabledAssignedActivities.length > 0 ? <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs"><p className="font-bold text-destructive">Scheduled activity is disabled</p><p className="mt-1 text-muted-foreground">{disabledAssignedActivities.map(d => `${DAYS[d.day_number - 1]}: ${d.activity_title ?? d.activity_slug}`).join(" • ")}. Re-enable the activity or assign an enabled activity to keep that day playable.</p></div> : null}
        </section>
        <section className="panda-panel rounded-3xl p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Shield className="size-4 text-primary"/><h2 className="font-display font-bold">Activity configuration</h2></div><p className="mt-1 text-xs text-muted-foreground">These controls change the server-side configuration used when the activity is assigned. Reward definitions remain stored and validated by the server.</p></div>{unsavedActivities > 0 ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{unsavedActivities} unsaved</span> : null}</div><div className="mt-4 space-y-3">{activities.map(a=><div key={a.slug} className="rounded-2xl border border-border/70 bg-card p-3"><div className="flex flex-col gap-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-sm">{a.title}</p>{activityChanged(a)?<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Unsaved</span>:<span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Saved</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{a.description}</p></div><label className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={a.is_enabled} onChange={e=>setActivities(prev=>prev.map(x=>x.slug===a.slug?{...x,is_enabled:e.target.checked}:x))}/>{a.is_enabled?"Enabled":"Disabled"}</label></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold">Free attempts<input type="number" min={1} max={10} value={a.free_attempts} onChange={e=>{const n=Math.max(1,Math.min(10,Number(e.target.value)||1));setActivities(prev=>prev.map(x=>x.slug===a.slug?{...x,free_attempts:n}:x))}} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label><label className="text-xs font-semibold">Timer seconds<input type="number" min={0} max={300} value={a.timer_seconds} onChange={e=>{const n=Math.max(0,Math.min(300,Number(e.target.value)||0));setActivities(prev=>prev.map(x=>x.slug===a.slug?{...x,timer_seconds:n}:x))}} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"/></label><div className="flex items-end gap-2"><Button className="h-10 flex-1" disabled={savingActivity===a.slug || !activityChanged(a)} onClick={()=>void saveActivity(a)}>{savingActivity===a.slug?<Loader2 className="mr-2 size-4 animate-spin"/>:null}Save settings</Button><Button type="button" variant="outline" className="h-10" disabled={savingActivity===a.slug || !activityChanged(a)} onClick={()=>setActivities(prev=>prev.map(x=>x.slug===a.slug?structuredClone(savedActivities[a.slug] ?? x):x))}>Reset</Button></div></div><div className="rounded-2xl border border-border/70 bg-secondary/20 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Reward pool</p><p className="text-[11px] text-muted-foreground">Server selects one configured result. Amounts must be whole non-negative BC.</p></div><Button type="button" variant="outline" size="sm" onClick={()=>addRewardItem(a.slug)}>Add reward</Button></div><div className="mt-3 space-y-2">{(a.reward_pool ?? []).map((reward,index)=><div key={`${a.slug}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]"><input aria-label={`${a.title} reward label ${index+1}`} value={reward.label} onChange={e=>updateRewardItem(a.slug,index,{label:e.target.value})} maxLength={80} className="h-10 rounded-xl border bg-background px-3 text-sm" placeholder="Reward label"/><input aria-label={`${a.title} reward amount ${index+1}`} type="number" min={0} step={1} value={reward.amount} onChange={e=>updateRewardItem(a.slug,index,{amount:Math.max(0,Math.floor(Number(e.target.value)||0))})} className="h-10 rounded-xl border bg-background px-3 text-sm"/><Button type="button" variant="ghost" size="sm" onClick={()=>removeRewardItem(a.slug,index)} aria-label={`Remove reward ${index+1}`}>Remove</Button></div>)}{(a.reward_pool ?? []).length===0?<p className="py-2 text-xs text-muted-foreground">No rewards configured. Activities that depend on a reward pool will reveal no BC reward until the admin adds one.</p>:null}</div></div></div></div>)}</div></section>
      </>}
    </main>
  </AppShell>;
}
