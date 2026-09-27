import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Laugh, Plus, Send, Sparkles, Eye, RefreshCw, ShieldCheck, Crown, Trophy, Upload, Share2 } from "lucide-react";
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

type WeeklyEntry = { id: string; user_id?: string; display_name?: string; panda_name?: string; kind?: string; blurb?: string; emoji?: string; media_url?: string; media_type?: string; week_start?: string; vote_count?: number; reaction_count?: number; my_vote?: boolean; my_reaction?: string | null };
export function ConfessionsPage() {
  const [weekly, setWeekly] = useState<{ wcw: WeeklyEntry[]; mcm: WeeklyEntry[] }>({ wcw: [], mcm: [] });
  const [weeklyWinner, setWeeklyWinner] = useState<{ wcw: any | null; mcm: any | null }>({ wcw: null, mcm: null });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [claimingVip, setClaimingVip] = useState<string | null>(null);
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
      const [{ data }, { data: winners }] = await Promise.all([
        (supabase as any).rpc("get_wcw_mcm_current_week"),
        supabase.from("crush_winners").select("kind,display_name,vote_count,week_start,created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      if (Array.isArray(data)) {
        setWeekly({
          wcw: data.filter((x: any) => String(x.kind ?? "").toLowerCase() === "wcw"),
          mcm: data.filter((x: any) => String(x.kind ?? "").toLowerCase() === "mcm"),
        });
      }
      const currentWeek = new Date();
      const sunday = new Date(currentWeek);
      sunday.setDate(currentWeek.getDate() - currentWeek.getDay());
      const week = sunday.toISOString().slice(0,10);
      setWeeklyWinner({
        wcw: (winners ?? []).find((x: any) => x.kind === "wcw" && x.week_start === week) ?? null,
        mcm: (winners ?? []).find((x: any) => x.kind === "mcm" && x.week_start === week) ?? null,
      });
    };
    void loadWeekly();
  }, []);

  const uploadCrush = async () => {
    if (!uploadFile) return toast.error("Choose a photo or video first.");
    if (uploadFile.size > 6 * 1024 * 1024) return toast.error("Please keep the upload under 6MB.");
    if (!uploadFile.type.startsWith("image/") && !uploadFile.type.startsWith("video/")) return toast.error("Only photos and videos are allowed.");
    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) throw new Error("Please sign in first.");
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${uid}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("circle-panda-crush").upload(path, uploadFile, { upsert: false, contentType: uploadFile.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("circle-panda-crush").getPublicUrl(path).data.publicUrl;
      const { error } = await (supabase as any).rpc("submit_crush_media_secure", {
        p_media_url: publicUrl,
        p_media_type: uploadFile.type.startsWith("video/") ? "video" : "image",
        p_caption: uploadCaption.trim(),
        p_emoji: "🐼",
      });
      if (error) throw error;
      toast.success("Your WCW/MCM entry is uploaded.");
      setUploadFile(null); setUploadCaption(""); setUploadOpen(false);
      const { data } = await (supabase as any).rpc("get_wcw_mcm_current_week");
      if (Array.isArray(data)) setWeekly({ wcw: data.filter((x:any)=>x.kind==="wcw"), mcm: data.filter((x:any)=>x.kind==="mcm") });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed.");
    } finally { setUploading(false); }
  };

  const voteWeekly = async (id: string) => {
    const { error } = await (supabase as any).rpc("cast_crush_vote_secure", { p_nominee_id: id });
    if (error) return toast.error(error.message ?? "Vote could not be saved.");
    toast.success("Vote counted.");
    const { data } = await (supabase as any).rpc("get_wcw_mcm_current_week");
    if (Array.isArray(data)) setWeekly({ wcw: data.filter((x:any)=>x.kind==="wcw"), mcm: data.filter((x:any)=>x.kind==="mcm") });
  };

  const reactWeekly = async (id: string, reaction: string) => {
    const { error } = await (supabase as any).rpc("react_to_crush_secure", { p_nominee_id: id, p_reaction: reaction });
    if (error) return toast.error(error.message ?? "Reaction could not be saved.");
    const { data } = await (supabase as any).rpc("get_wcw_mcm_current_week");
    if (Array.isArray(data)) setWeekly({ wcw: data.filter((x:any)=>x.kind==="wcw"), mcm: data.filter((x:any)=>x.kind==="mcm") });
  };

  const claimVip = async (kind: string) => {
    setClaimingVip(kind);
    const { error } = await (supabase as any).rpc("claim_crush_vip_secure", { p_kind: kind });
    setClaimingVip(null);
    if (error) return toast.error(error.message ?? "VIP could not be claimed.");
    toast.success("Your free 7-day VIP is now active 👑");
    const { data: winners } = await supabase.from("crush_winners").select("kind,display_name,vote_count,week_start,vip_claimed_at,created_at").order("created_at",{ascending:false}).limit(10);
    const currentWeek = new Date();
    const sunday = new Date(currentWeek); sunday.setDate(currentWeek.getDate()-currentWeek.getDay());
    const week = sunday.toISOString().slice(0,10);
    setWeeklyWinner({
      wcw: (winners ?? []).find((x:any)=>x.kind==="wcw"&&x.week_start===week) ?? null,
      mcm: (winners ?? []).find((x:any)=>x.kind==="mcm"&&x.week_start===week) ?? null,
    });
  };

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
            <div><p className="text-xs font-bold uppercase tracking-widest text-primary">This week</p><h2 className="font-display text-xl font-bold">WCW & MCM</h2><p className="text-xs text-muted-foreground">Upload • Vote • React • Win weekly VIP</p></div>
            <Button size="sm" onClick={() => setUploadOpen(v => !v)} className="rounded-2xl"><Upload className="mr-1 size-4" /> Upload</Button>
          </div>
          {uploadOpen ? <div className="mb-4 space-y-3 rounded-2xl bg-secondary/40 p-4">
            <input type="file" accept="image/*,video/*" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} className="w-full text-xs" disabled={uploading} />
            <Textarea value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} maxLength={300} placeholder="Optional caption..." className="rounded-2xl" disabled={uploading} />
            <p className="text-[10px] text-muted-foreground">Your gender decides WCW or MCM automatically. One entry per week. Maximum 6MB.</p>
            <Button onClick={() => void uploadCrush()} disabled={uploading || !uploadFile} className="w-full rounded-2xl">{uploading ? "Uploading…" : "Publish weekly entry"}</Button>
          </div> : null}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "wcw", title: "💗 WCW", subtitle: "Wednesday", entries: weekly.wcw, winner: weeklyWinner.wcw },
              { key: "mcm", title: "🔥 MCM", subtitle: "Monday", entries: weekly.mcm, winner: weeklyWinner.mcm },
            ].map((group) => (
              <div key={group.key} className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between"><span className="font-bold">{group.title}</span><span className="text-[10px] text-muted-foreground">{group.subtitle}</span></div>
                {group.winner ? <div className="mt-2 rounded-xl bg-primary/10 p-2 text-center"><p className="text-[10px] font-bold text-primary">👑 LAST WEEK WINNER</p><p className="text-xs font-bold">{group.winner.display_name}</p><p className="text-[10px] text-muted-foreground">{group.winner.vote_count} votes · 7-day VIP</p>{group.winner.vip_claimed_at ? <p className="mt-1 text-[10px] font-bold text-primary">VIP claimed ✓</p> : <Button size="sm" className="mt-2 rounded-full" onClick={() => void claimVip(group.key)}>Claim free VIP</Button>}</div> : null}
                <div className="mt-3 space-y-3">
                  {group.entries.length ? group.entries.map((entry, i) => (
                    <div key={entry.id} className="rounded-2xl bg-background/60 p-2">
                      <div className="flex items-center gap-2">
                        {entry.media_url ? <img src={entry.media_url} alt="" className="size-11 rounded-full object-cover ring-2 ring-primary/30" /> : <div className="grid size-11 place-items-center rounded-full bg-primary/15">{entry.emoji ?? "🐼"}</div>}
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{entry.display_name ?? entry.panda_name ?? "Panda"}</p><p className="text-[10px] text-muted-foreground">{entry.vote_count ?? 0} votes · {entry.reaction_count ?? 0} reactions</p></div>
                        <Button size="sm" variant={entry.my_vote ? "secondary" : "default"} disabled={entry.my_vote} onClick={() => void voteWeekly(entry.id)}>{entry.my_vote ? "Voted" : "Vote"}</Button>
                      </div>
                      {entry.media_url ? <div className="mt-2 overflow-hidden rounded-xl">{entry.media_type === "video" ? <video src={entry.media_url} controls playsInline className="max-h-48 w-full object-cover" /> : <img src={entry.media_url} alt="Weekly entry" className="max-h-48 w-full object-cover" />}</div> : null}
                      {entry.blurb ? <p className="mt-2 text-xs text-muted-foreground">{entry.blurb}</p> : null}
                      <div className="mt-2 flex gap-1 overflow-x-auto">
                        {["🐼","❤️","👍","⚡","🌧️"].map(r => <button key={r} type="button" onClick={() => void reactWeekly(entry.id,r)} className={`rounded-full border px-2 py-1 text-xs ${entry.my_reaction===r ? "border-primary bg-primary/10" : "border-border"}`}>{r}</button>)}
                        <button type="button" onClick={() => navigator.share?.({title:"Circle Panda WCW/MCM",url:window.location.href})} className="ml-auto rounded-full border border-border px-2 py-1 text-xs"><Share2 className="size-3" /></button>
                      </div>
                    </div>
                  )) : <p className="py-3 text-center text-xs text-muted-foreground">No uploads yet</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">Upload to enter • Vote and react • Weekly winner receives 7-day VIP + badge</p>
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
