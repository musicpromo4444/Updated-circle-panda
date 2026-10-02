import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle, Paperclip, Play, Send, Share2, Trophy, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CrushAdFrame } from "@/components/ads/CrushAdFrame";
import { CrushPopupAd } from "@/components/ads/CrushPopupAd";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { PlayableVideoAd } from "@/components/ads/PlayableVideoAd";
import { supabase } from "@/integrations/supabase/client";
import { useStore, FREE_DAILY_VOTES, WINNER_REWARD, type CrushKind } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/auth/AuthModal";
import { QuickVoteSignup } from "@/components/auth/QuickVoteSignup";

export const Route = createFileRoute("/crush")({
  head: () => ({ meta: [{ title: "MCM & WCW — Circle Panda" }, { name: "description", content: "Full-screen Circle Panda Man Crush Monday and Woman Crush Wednesday photo voting." }] }),
  component: CrushPage,
});

const REACTIONS = ["🐼", "❤️", "👍", "⚡", "🌧️"];

function CrushPage() {
  const { nominees, voteFor, freeVotesLeft, weekEndsAt, spotlights } = useStore();
  const [kind, setKind] = useState<CrushKind>("wcw");
  const [index, setIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [mineReaction, setMineReaction] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate content");
  const [showAd, setShowAd] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [adSlotIndex, setAdSlotIndex] = useState(0);

  const AD_BLOCKS = [5, 5, 10];
  const AD_FORMATS = ["native", "interstitial", "popup", "banner", "playable"] as const;
  const nextAdBoundary = useMemo(() => {
    let boundary = 0;
    let blockIndex = 0;
    while (boundary <= swipeCount) {
      boundary += AD_BLOCKS[Math.min(blockIndex, 2)];
      blockIndex += 1;
    }
    return boundary;
  }, [swipeCount]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showQuickSignup, setShowQuickSignup] = useState(false);
  const [pendingVote, setPendingVote] = useState(false);

  const refreshLiveNominees = async () => {
    const monday = new Date();
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    const weekStart = monday.toISOString().slice(0, 10);
    const { data, error } = await (supabase as any).rpc("get_crush_results", { p_week_start: weekStart });
    if (error) {
      toast.error(error.message ?? "Could not load WCW/MCM pictures");
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    setLiveNominees(rows.map((n:any) => ({
      id: n.nominee_id,
      name: n.display_name ?? "Anonymous Panda",
      kind: n.kind,
      emoji: n.emoji ?? "🐼",
      blurb: n.blurb ?? "",
      votes: Number(n.vote_count ?? 0),
      avatarUrl: n.media_url ?? undefined,
      mediaUrl: n.media_url ?? undefined,
      mediaType: n.media_type,
      mine: Boolean(n.mine),
    })));
    setLiveNomineesLoaded(true);
  };

  const pool = useMemo(() => (liveNomineesLoaded ? liveNominees : nominees).filter((n) => n.kind === kind && n.mediaUrl), [liveNominees, liveNomineesLoaded, nominees, kind]);
  const card = pool[index] ?? null;
  const ranked = useMemo(() => [...pool].sort((a, b) => b.votes - a.votes), [pool]);

  useEffect(() => {
    void refreshLiveNominees();
    const section = window.location.hash.replace("#", "").toLowerCase();
    if (section === "mcm" || section === "wcw") setKind(section as CrushKind);
    setIndex(0);
  }, [kind]);

  useEffect(() => {
    if (!card) return;
    setShowComments(false); setComment(""); setAttachment(null);
    void loadCardData(card.id);
  }, [card?.id]);

  useEffect(() => {
    const refresh = () => { void refreshLiveNominees(); };
    window.addEventListener("circle-panda-crush-refresh", refresh);
    return () => window.removeEventListener("circle-panda-crush-refresh", refresh);
  }, []);

  async function loadCardData(id: string) {
    setLoadingComments(true);
    const [{ data: commentsData }, { data: reactionsData }] = await Promise.all([
      (supabase as any).rpc("get_crush_comments", { p_nominee_id: id }),
      (supabase as any).rpc("get_crush_reactions", { p_nominee_id: id }),
    ]);
    setComments(commentsData ?? []);
    const counts: Record<string, number> = {};
    let mine: string | null = null;
    (reactionsData ?? []).forEach((r: any) => { counts[r.reaction] = Number(r.reaction_count ?? 0); if (r.mine) mine = r.reaction; });
    setReactions(counts); setMineReaction(mine); setLoadingComments(false);
  }

  const next = (direction: 1 | -1) => {
    if (!pool.length) return;
    const nextCount = direction === 1 ? swipeCount + 1 : swipeCount;
    setSwipeCount(nextCount);
    if (direction === 1 && nextCount === nextAdBoundary) {
      setAdSlotIndex((value) => value + 1);
      setShowAd(true);
      return;
    }
    setIndex((v) => (v + direction + pool.length) % pool.length);
  };

  const vote = async () => {
    if (!card) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.is_anonymous) {
      setPendingVote(true);
      setShowQuickSignup(true);
      toast("Quick signup to vote.", { description: "Use your phone or email and password. Your vote will continue automatically." });
      return;
    }
    voteFor(card.id);
    void refreshLiveNominees();
    next(1);
  };

  const react = async (emoji: string) => {
    if (!card) return;
    const { error } = await (supabase as any).rpc("react_to_crush_secure", { p_nominee_id: card.id, p_reaction: emoji });
    if (error) { toast.error(error.message ?? "Reaction could not be saved"); return; }
    setMineReaction(emoji);
    await loadCardData(card.id);
  };

  const sendComment = async () => {
    if (!card || (!comment.trim() && !attachment)) return;
    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      if (attachment) {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id;
        if (!uid) throw new Error("Please sign in first");
        const path = `${uid}/${crypto.randomUUID()}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("circle-panda-crush").upload(path, attachment, { upsert: false, contentType: attachment.type });
        if (uploadError) throw uploadError;
        attachmentUrl = supabase.storage.from("circle-panda-crush").getPublicUrl(path).data.publicUrl;
        attachmentType = attachment.type;
      }
      const { error } = await (supabase as any).rpc("add_crush_comment_secure", { p_nominee_id: card.id, p_body: comment.trim(), p_attachment_url: attachmentUrl, p_attachment_type: attachmentType });
      if (error) throw error;
      setComment(""); setAttachment(null); await loadCardData(card.id); toast.success("Message request sent 💌");
    } catch (e: any) { toast.error(e?.message ?? "Message could not be sent"); }
    finally { setSending(false); }
  };

  const report = async () => {
    if (!card) return;
    const { error } = await (supabase as any).rpc("report_crush_secure", { p_nominee_id: card.id, p_reason: reportReason, p_details: null });
    if (error) { toast.error(error.message ?? "Report could not be submitted"); return; }
    setReportOpen(false); toast.success("Report received. Thank you for helping keep Circle Panda safe.");
  };

  return (
    <AppShell title="MCM & WCW" hidePageHeader>
      <div className="relative -mx-4 min-h-[calc(100vh-5rem)] overflow-hidden bg-black sm:-mx-6">
        <div className="sticky top-0 z-20 flex items-center justify-between bg-black/80 px-3 py-2 backdrop-blur-xl">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => history.back()}><ArrowLeft className="size-5" /></Button>
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1">
            {(["wcw", "mcm"] as CrushKind[]).map((k) => (
              <button key={k} type="button" onClick={() => { setKind(k); window.history.replaceState(null, "", `#${k}`); }} className={cn("rounded-full px-3 py-1.5 text-[10px] font-black tracking-wider", kind === k ? "bg-white text-black" : "text-white/60")}>{k === "wcw" ? "WCW" : "MCM"}</button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowLeaderboard(true)}><Trophy className="size-5" /></Button>
        </div>

        {showAd ? (
          (() => {
            const format = AD_FORMATS[(adSlotIndex - 1) % AD_FORMATS.length];
            const continueToFeed = () => {
              setShowAd(false);
              setIndex((v) => (v + 1) % Math.max(1, pool.length));
            };
            if (format === "interstitial") return <CrushAdFrame onContinue={continueToFeed} />;
            if (format === "popup") return <CrushPopupAd onContinue={continueToFeed} />;
            if (format === "playable") return <div className="min-h-[calc(100vh-8rem)] bg-black p-3"><PlayableVideoAd placement="crush_playable" index={adSlotIndex} onSkipped={continueToFeed} onComplete={continueToFeed} /></div>;
            if (format === "native") return <div className="min-h-[calc(100vh-8rem)] bg-background p-3"><StandardBannerAd placement="crush_native" variant="feed-card" className="mx-auto max-w-2xl" /><button type="button" onClick={continueToFeed} className="mt-3 w-full text-center text-xs font-bold text-primary">Continue to pictures →</button></div>;
            return <div className="min-h-[calc(100vh-8rem)] bg-background p-3"><StandardBannerAd placement="crush_banner" variant="card" className="mx-auto max-w-2xl" /><button type="button" onClick={continueToFeed} className="mt-3 w-full text-center text-xs font-bold text-primary">Continue to pictures →</button></div>;
          })()
        ) : card ? (
          <div className="flex min-h-[calc(100vh-8rem)] flex-col">
            <div className="relative flex min-h-[62vh] flex-1 items-center justify-center bg-black">
              {card.mediaType === "video" ? (
                <video src={card.mediaUrl} controls playsInline className="max-h-[72vh] w-full object-contain" />
              ) : (
                <img src={card.mediaUrl} alt="Circle Panda Crush submission" className="max-h-[72vh] w-full object-contain" />
              )}

              <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">Votes {card.votes}</div>
              <button type="button" onClick={() => void vote()} className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-xl active:scale-95"><Heart className="size-4 fill-current" /> Vote {freeVotesLeft > 0 ? "Free" : "· 1 BC"}</button>
              <div className="absolute bottom-3 left-3 rounded-xl bg-black/65 px-3 py-2 text-white backdrop-blur-md"><p className="text-xs font-bold">Anonymous Panda</p><p className="text-[10px] text-white/70">{card.kind === "wcw" ? "Woman Crush Wednesday" : "Man Crush Monday"}</p></div>
              <span className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full border border-white/30 bg-black/65 text-xl backdrop-blur-md">{card.emoji}</span>

              <button aria-label="Previous picture" onClick={() => next(-1)} className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"><ChevronLeft /></button>
              <button aria-label="Next picture" onClick={() => next(1)} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"><ChevronRight /></button>
            </div>

            <div className="bg-background px-3 py-3 text-foreground">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => void react(emoji)} className={cn("flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm", mineReaction === emoji ? "border-primary bg-primary/10" : "border-border bg-secondary/40")}>{emoji}<span className="text-[11px] tabular-nums">{reactions[emoji] ?? 0}</span></button>)}
                <button type="button" onClick={() => setReportOpen(true)} className="ml-auto shrink-0 rounded-full border border-border p-2 text-muted-foreground"><Flag className="size-4" /></button>
              </div>
              {card.blurb ? <p className="mb-2 text-sm text-muted-foreground">{card.blurb}</p> : null}
              <button type="button" onClick={() => setShowComments((v) => !v)} className="flex items-center gap-2 text-xs font-semibold"><MessageCircle className="size-4" /> {comments.length} comments / message requests</button>

              {showComments ? <div className="mt-3 space-y-3">
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl bg-secondary/40 p-3">
                  {loadingComments ? <p className="text-xs text-muted-foreground">Loading comments…</p> : comments.length ? comments.map((c) => <div key={c.id} className="rounded-xl bg-background p-2.5"><p className="text-[10px] font-bold text-muted-foreground">{c.mine ? "You" : "Anonymous Panda"}</p><p className="mt-1 text-sm">{c.body}</p>{c.attachment_url ? <a href={c.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Paperclip className="size-3" /> Attachment</a> : null}</div>) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                </div>
                <div className="flex items-end gap-2">
                  <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-border bg-secondary/40"><input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} /><Paperclip className="size-4" /></label>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a message…" className="min-h-10 resize-none" />
                  <Button size="icon" disabled={sending || (!comment.trim() && !attachment)} onClick={() => void sendComment()}><Send className="size-4" /></Button>
                </div>
                {attachment ? <p className="text-[10px] text-muted-foreground">Attached: {attachment.name}</p> : null}
              </div> : null}

              <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{freeVotesLeft} free votes left today</span>
                <span>Swipe/scroll • Sponsored sequence: 5, 5, then every 10 pictures · Native → Interstitial → Popup → Banner → Playable</span>
              </div>
            </div>
          </div>
        ) : <div className="grid min-h-[70vh] place-items-center p-8 text-center text-white"><div><p className="text-4xl">🐼</p><h2 className="mt-3 font-display text-xl font-bold">No {kind === "wcw" ? "WCW" : "MCM"} pictures yet</h2><p className="mt-1 text-sm text-white/60">Use the first round story on the home page to add yours.</p></div></div>}
      </div>

      <QuickVoteSignup open={showQuickSignup} onOpenChange={setShowQuickSignup} onComplete={() => { if (pendingVote && card) { setPendingVote(false); voteFor(card.id); next(1); } }} />
      <AuthModal open={showAuth} onOpenChange={setShowAuth} defaultTab="signup" />

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm"><DialogTitle>Report this picture</DialogTitle><DialogDescription>Tell Circle Panda what is wrong with this submission.</DialogDescription><div className="space-y-2">{["Inappropriate content","Harassment","Impersonation","Copyright concern","Other"].map((r)=><button key={r} type="button" onClick={()=>setReportReason(r)} className={cn("w-full rounded-xl border p-3 text-left text-sm",reportReason===r?"border-primary bg-primary/10":"border-border")}>{r}</button>)}<Button className="w-full" onClick={()=>void report()}>Submit report</Button></div></DialogContent>
      </Dialog>

      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-sm"><DialogTitle>{kind.toUpperCase()} leaderboard</DialogTitle><DialogDescription>{FREE_DAILY_VOTES} free votes reset daily. Weekly winner receives {WINNER_REWARD} BC.</DialogDescription><div className="max-h-[55vh] space-y-2 overflow-y-auto">{ranked.map((n,i)=><div key={n.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"><span className="grid size-8 place-items-center rounded-full bg-background text-sm font-bold">{i===0?"👑":i+1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">Anonymous Panda</span><span className="text-xs text-muted-foreground">{n.votes} votes</span></div>)}{spotlights.length? <p className="pt-2 text-xs text-muted-foreground">Past Spotlights: {spotlights.slice(0,4).map(s=>s.name).join(" · ")}</p>:null}</div></DialogContent>
      </Dialog>
    </AppShell>
  );
}
