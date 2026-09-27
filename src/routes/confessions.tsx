import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Laugh, Plus, Send, Sparkles, Eye, RefreshCw, ShieldCheck, Crown, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/confessions")({
  head: () => ({ meta: [{ title: "Confessions — Circle Panda" }] }),
  component: ConfessionsPage,
});

type Confession = { id: string; content: string; is_anonymous: boolean; created_at: string };

type WeeklyEntry = { id: string; panda_name?: string; country?: string; reactions?: number; created_at?: string };
export function ConfessionsPage() {
  const [weekly, setWeekly] = useState<{ wcw: WeeklyEntry[]; mcm: WeeklyEntry[] }>({ wcw: [], mcm: [] });
  const [items, setItems] = useState<Confession[]>([]);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const remaining = useMemo(() => 2000 - content.length, [content.length]);

  const load = async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    const { data, error } = await supabase.from("confessions").select("id,content,is_anonymous,created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(50);
    if (error) toast.error(error.message); else setItems((data ?? []) as Confession[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
    const loadWeekly = async () => {
      const { data } = await (supabase as any).rpc("get_wcw_mcm_current_week");
      if (Array.isArray(data)) {
        setWeekly({
          wcw: data.filter((x: any) => String(x.category ?? x.type ?? "").toLowerCase() === "wcw").slice(0, 5),
          mcm: data.filter((x: any) => String(x.category ?? x.type ?? "").toLowerCase() === "mcm").slice(0, 5),
        });
      }
    };
    void loadWeekly();
  }, []);

  const submit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 3) return toast.error("Write at least 3 characters first.");
    if (trimmed.length > 2000) return toast.error("Your confession is too long.");
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc("submit_confession_secure", { p_content: trimmed, p_anonymous: anonymous });
    setSubmitting(false);
    if (error) return toast.error(error.message ?? "Your confession could not be submitted.");
    if (data?.id) {
      void (supabase as any).rpc("record_activity_participation", { p_activity_id: null, p_activity_type: "post_confession", p_reference_id: data.id, p_points: 0 });
    }
    setContent(""); setOpen(false);
    toast.success("Confession submitted for review.", { description: "It will appear here after moderation approves it." });
  };

  const react = async (id: string, reaction: string) => {
    const { error } = await (supabase as any).rpc("react_to_confession_secure", { p_confession_id: id, p_reaction: reaction });
    if (error) toast.error(error.message); else toast.success("Reaction saved");
  };

  return (
    <AppShell title="Confessions" hidePageHeader={false}>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-widest text-primary">This week</p><h2 className="font-display text-xl font-bold">WCW & MCM</h2></div>
            <Trophy className="size-5 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "wcw", title: "💗 WCW", subtitle: "Wednesday", entries: weekly.wcw },
              { key: "mcm", title: "🔥 MCM", subtitle: "Monday", entries: weekly.mcm },
            ].map((group) => (
              <div key={group.key} className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between"><span className="font-bold">{group.title}</span><span className="text-[10px] text-muted-foreground">{group.subtitle}</span></div>
                <div className="mt-3 space-y-2">
                  {group.entries.length ? group.entries.map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-xl bg-background/60 p-2">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold">{i + 1}</div>
                      <div className="min-w-0"><p className="truncate text-xs font-semibold">{entry.panda_name ?? "Panda"}</p><p className="text-[10px] text-muted-foreground">{entry.country ?? "Worldwide"}</p></div>
                      <Crown className="ml-auto size-3.5 text-primary" />
                    </div>
                  )) : <p className="py-3 text-center text-xs text-muted-foreground">No entries yet</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">Upload to enter • Vote and react • Weekly VIP winner</p>
        </section>
        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Sparkles className="size-4" /> Anonymous corner</p><h1 className="mt-1 font-display text-2xl font-bold">Say what you really think.</h1><p className="mt-1 text-sm text-muted-foreground">Confessions stay anonymous when you choose. New submissions are reviewed before publication.</p></div>
            <div className="flex shrink-0 items-center gap-2"><Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading || refreshing} className="rounded-2xl" aria-label="Refresh confessions">{refreshing ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}</Button><Button onClick={() => setOpen(v => !v)} className="rounded-2xl"><Plus className="mr-1 size-4" /> Confess</Button></div>
          </div>
          {open ? <div className="mt-4 space-y-3 rounded-2xl bg-secondary/40 p-4"><Textarea value={content} onChange={e => setContent(e.target.value)} maxLength={2000} placeholder="Your confession..." className="min-h-32 rounded-2xl" disabled={submitting} aria-label="Confession text" /><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} disabled={submitting} /> Post anonymously</label><span className={`text-xs ${remaining < 100 ? "text-destructive" : "text-muted-foreground"}`}>{remaining} characters left</span></div><div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>Submissions are reviewed before publication. Your identity is not displayed on anonymous confessions.</span></div><Button onClick={() => void submit()} className="w-full rounded-2xl" disabled={submitting || content.trim().length < 3}>{submitting ? <><RefreshCw className="mr-2 size-4 animate-spin" /> Submitting…</> : <><Send className="mr-2 size-4" /> Submit confession</>}</Button></div> : null}
        </section>

        {loading ? <div className="rounded-3xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">Loading confessions…</div> : null}
        {!loading && items.length === 0 ? <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No published confessions yet. Be the first.</div> : null}
        {items.map((item, idx) => <div key={item.id} className="space-y-4"><article className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="size-3.5" /> {item.is_anonymous ? "Anonymous Panda" : "Panda"} · {new Date(item.created_at).toLocaleDateString()}</div><p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7">{item.content}</p><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => void react(item.id,"heart")}><Heart className="mr-1 size-4" /> Heart</Button><Button variant="outline" size="sm" onClick={() => void react(item.id,"laugh")}><Laugh className="mr-1 size-4" /> Laugh</Button></div></article>{(idx + 1) % 5 === 0 ? <StandardBannerAd index={Math.floor(idx / 5)} variant="feed-card" placement="main_feed_card" /> : null}</div>)}
      </div>
    </AppShell>
  );
}
