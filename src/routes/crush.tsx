import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Heart, MessageCircle, Send, Smile, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  head: () => ({
    meta: [
      { title: "MCM & WCW — Circle Panda" },
      { name: "description", content: "Full-screen Circle Panda Man Crush Monday and Woman Crush Wednesday photo voting." },
    ],
  }),
  component: CrushPage,
});

const REACTIONS = ["🐼", "❤️", "👍", "⚡", "🌧️"];

const CRUSH_BUCKET = "circle-panda-crush";

function crushStoragePath(value: string): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, "");
  const marker = `/storage/v1/object/public/${CRUSH_BUCKET}/`;
  const signedMarker = `/storage/v1/object/sign/${CRUSH_BUCKET}/`;
  const publicIndex = value.indexOf(marker);
  if (publicIndex >= 0) return decodeURIComponent(value.slice(publicIndex + marker.length).split("?")[0]);
  const signedIndex = value.indexOf(signedMarker);
  if (signedIndex >= 0) return decodeURIComponent(value.slice(signedIndex + signedMarker.length).split("?")[0]);
  return null;
}

async function resolveCrushMediaUrl(value: string): Promise<string> {
  const path = crushStoragePath(value);
  if (!path) return value;
  const publicUrl = supabase.storage.from(CRUSH_BUCKET).getPublicUrl(path).data.publicUrl;
  try {
    const response = await fetch(publicUrl, { method: "HEAD" });
    if (response.ok) return publicUrl;
  } catch {
    // Fall through to a signed URL for projects/CDN paths that require auth.
  }
  const { data, error } = await supabase.storage.from(CRUSH_BUCKET).createSignedUrl(path, 60 * 60);
  if (!error && data?.signedUrl) return data.signedUrl;
  return publicUrl;
}

function CrushPage() {
  const { nominees, voteFor, freeVotesLeft, spotlights } = useStore();
  const [kind, setKind] = useState<CrushKind>("wcw");
  const [index, setIndex] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [mineReaction, setMineReaction] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate content");
  const [showAd, setShowAd] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [adSlotIndex, setAdSlotIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showQuickSignup, setShowQuickSignup] = useState(false);
  const [pendingVote, setPendingVote] = useState(false);
  const [liveNominees, setLiveNominees] = useState<any[]>([]);
  const [liveNomineesLoaded, setLiveNomineesLoaded] = useState(false);

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

  const refreshLiveNominees = async () => {
    const monday = new Date();
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    const weekStart = monday.toISOString().slice(0, 10);
    const { data, error } = await (supabase as any).rpc("get_crush_results", { p_week_start: weekStart });
    let rows = Array.isArray(data) ? data : [];
    if (error || !rows.length) {
      // Fallback to the public feed rows when the RPC is temporarily unavailable.
      // This keeps already-uploaded media visible instead of reverting to stale local state.
      const { data: directRows, error: directError } = await (supabase as any)
        .from("crush_nominees")
        .select("id,display_name,kind,emoji,blurb,media_url,media_type,week_start,created_at")
        .eq("week_start", weekStart)
        .in("kind", ["wcw", "mcm"])
        .order("created_at", { ascending: false });
      if (!directError && Array.isArray(directRows)) {
        rows = directRows.map((n: any) => ({ ...n, nominee_id: n.id, vote_count: 0, mine: false }));
      }
    }
    if (!rows.length && error) {
      toast.error(error.message ?? "Could not load WCW/MCM pictures");
    }
    const mediaRows = rows
      .filter((n: any) => typeof n.media_url === "string" && n.media_url.trim().length > 0)
      .map((n: any) => ({
        id: n.nominee_id ?? n.id,
        name: n.display_name ?? "Anonymous Panda",
        kind: n.kind,
        emoji: n.emoji ?? "🐼",
        blurb: n.blurb ?? "",
        votes: Number(n.vote_count ?? 0),
        avatarUrl: n.media_url,
        mediaUrl: n.media_url,
        mediaType: n.media_type === "video" ? "video" : "image",
        mine: Boolean(n.mine),
      }));
    const resolvedRows = await Promise.all(
      mediaRows.map(async (row: any) => ({ ...row, mediaUrl: await resolveCrushMediaUrl(row.mediaUrl) })),
    );
    setLiveNominees(resolvedRows);
    setLiveNomineesLoaded(true);
  };

  const pool = useMemo(
    () => (liveNomineesLoaded ? liveNominees : nominees).filter((n) => n.kind === kind && n.mediaUrl),
    [liveNominees, liveNomineesLoaded, nominees, kind],
  );
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
    setCommentOpen(false);
    setComment("");
    setReactionOpen(false);
    void loadCardData(card.id);
  }, [card?.id]);

  useEffect(() => {
    const refresh = () => { void refreshLiveNominees(); };
    window.addEventListener("circle-panda-crush-refresh", refresh);
    return () => window.removeEventListener("circle-panda-crush-refresh", refresh);
  }, []);

  async function loadCardData(id: string) {
    const { data: reactionsData } = await (supabase as any).rpc("get_crush_reactions", { p_nominee_id: id });
    const counts: Record<string, number> = {};
    let mine: string | null = null;
    (reactionsData ?? []).forEach((r: any) => {
      counts[r.reaction] = Number(r.reaction_count ?? 0);
      if (r.mine) mine = r.reaction;
    });
    setReactions(counts);
    setMineReaction(mine);
  }

  const next = (direction: 1 | -1) => {
    if (!pool.length) return;
    const nextCount = direction === 1 ? swipeCount + 1 : swipeCount;
    setSwipeCount(nextCount);
    setReactionOpen(false);
    setCommentOpen(false);
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
    const { error } = await (supabase as any).rpc("react_to_crush_secure", {
      p_nominee_id: card.id,
      p_reaction: emoji,
    });
    if (error) {
      toast.error(error.message ?? "Reaction could not be saved");
      return;
    }
    setReactionOpen(false);
    setMineReaction(emoji);
    await loadCardData(card.id);
  };

  const sendComment = async () => {
    if (!card || !comment.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).rpc("add_crush_comment_secure", {
        p_nominee_id: card.id,
        p_body: comment.trim(),
        p_attachment_url: null,
        p_attachment_type: null,
      });
      if (error) throw error;
      setComment("");
      setCommentOpen(false);
      toast.success("Comment sent 💌", { description: "It has been sent to the post owner as a message request." });
    } catch (e: any) {
      toast.error(e?.message ?? "Comment could not be sent");
    } finally {
      setSending(false);
    }
  };

  const report = async () => {
    if (!card) return;
    const { error } = await (supabase as any).rpc("report_crush_secure", {
      p_nominee_id: card.id,
      p_reason: reportReason,
      p_details: null,
    });
    if (error) {
      toast.error(error.message ?? "Report could not be submitted");
      return;
    }
    setReportOpen(false);
    toast.success("Report received. Thank you for helping keep Circle Panda safe.");
  };

  return (
    <AppShell title="MCM & WCW" immersive hidePageHeader>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
        {showAd ? (
          (() => {
            const format = AD_FORMATS[(adSlotIndex - 1) % AD_FORMATS.length];
            const continueToFeed = () => {
              setShowAd(false);
              setIndex((v) => (v + 1) % Math.max(1, pool.length));
            };
            if (format === "interstitial") return <CrushAdFrame onContinue={continueToFeed} />;
            if (format === "popup") return <CrushPopupAd onContinue={continueToFeed} />;
            if (format === "playable") {
              return (
                <div className="flex size-full items-center justify-center bg-black p-3">
                  <PlayableVideoAd placement="crush_playable" index={adSlotIndex} onSkipped={continueToFeed} onComplete={continueToFeed} />
                </div>
              );
            }
            if (format === "native") {
              return (
                <div className="flex size-full flex-col items-center justify-center bg-background p-4 text-foreground">
                  <StandardBannerAd placement="crush_native" variant="feed-card" className="w-full max-w-2xl" />
                  <button type="button" onClick={continueToFeed} className="mt-4 text-xs font-bold text-primary">Continue</button>
                </div>
              );
            }
            return (
              <div className="flex size-full flex-col items-center justify-center bg-background p-4 text-foreground">
                <StandardBannerAd placement="crush_banner" variant="card" className="w-full max-w-2xl" />
                <button type="button" onClick={continueToFeed} className="mt-4 text-xs font-bold text-primary">Continue</button>
              </div>
            );
          })()
        ) : card ? (
          <div className="relative size-full bg-black">
            {card.mediaType === "video" ? (
              <video
                src={card.mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <img
                src={card.mediaUrl}
                alt="Circle Panda Crush submission"
                className="absolute inset-0 size-full object-cover"
                onError={async (event) => {
                  const fallback = await resolveCrushMediaUrl(card.mediaUrl);
                  if (fallback && fallback !== card.mediaUrl) {
                    event.currentTarget.src = fallback;
                  } else {
                    toast.error("This picture could not be loaded from Circle Panda storage.");
                  }
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />

            <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-black/45 text-white hover:bg-black/60" onClick={() => history.back()}>
                <ArrowLeft className="size-5" />
              </Button>
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/45 p-1 backdrop-blur-md">
                  {(["wcw", "mcm"] as CrushKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setKind(k); window.history.replaceState(null, "", `#${k}`); }}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-[10px] font-black tracking-wider",
                        kind === k ? "bg-white text-black" : "text-white/70",
                      )}
                    >
                      {k === "wcw" ? "WCW" : "MCM"}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-black/45 text-white hover:bg-black/60" onClick={() => setShowLeaderboard(true)}>
                <Trophy className="size-5" />
              </Button>
            </div>

            <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-20 flex items-center justify-between px-3">
              <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-black backdrop-blur-md">Votes {card.votes}</div>
              <button
                type="button"
                onClick={() => void vote()}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-xl active:scale-95"
              >
                <Heart className="size-4 fill-current" />
                Vote {freeVotesLeft > 0 ? "Free" : "· 1 BC"}
              </button>
            </div>

            <button aria-label="Previous picture" onClick={() => next(-1)} className="absolute left-2 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <ChevronLeft />
            </button>
            <button aria-label="Next picture" onClick={() => next(1)} className="absolute right-2 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <ChevronRight />
            </button>

            <div className="absolute inset-x-0 bottom-24 z-20 px-4">
              <div className="max-w-[78%] rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-md">
                <p className="text-sm font-black">Anonymous Panda</p>
                <p className="mt-0.5 text-[11px] text-white/75">
                  {card.kind === "wcw" ? "Woman Crush Wednesday" : "Man Crush Monday"}
                </p>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/80 px-3 pt-2 backdrop-blur-xl pb-[max(0.65rem,env(safe-area-inset-bottom))]">
              {reactionOpen ? (
                <div className="mb-2 flex items-center justify-end">
                  <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => void react(emoji)}
                        aria-label={`React ${emoji}`}
                        className={cn(
                          "grid size-10 place-items-center rounded-full text-xl transition-transform active:scale-90",
                          mineReaction === emoji ? "bg-white/15" : "hover:bg-white/10",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {commentOpen ? (
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void sendComment(); }}>
                  <Input
                    autoFocus
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comment"
                    className="h-12 flex-1 rounded-full border-white/15 bg-[#20262a] px-4 text-white placeholder:text-white/60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !comment.trim()}
                    aria-label="Send comment"
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="size-5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCommentOpen(true)}
                    className="flex h-12 min-w-0 flex-1 items-center rounded-full border border-white/15 bg-[#20262a] px-4 text-left text-sm text-white/65"
                  >
                    <MessageCircle className="mr-2 size-5 shrink-0" />
                    Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => setReactionOpen((value) => !value)}
                    aria-label="Choose emoji reaction"
                    className="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 bg-[#20262a] text-white/90"
                  >
                    <Smile className="size-6" />
                  </button>
                </div>
              )}
            </div>

            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.7rem)] right-3 z-20">
              <button type="button" onClick={() => setReportOpen(true)} aria-label="Report picture" className="grid size-9 place-items-center rounded-full bg-black/45 text-white/75 backdrop-blur-md">
                <Flag className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid size-full place-items-center bg-black p-8 text-center">
            <div>
              <p className="text-5xl">🐼</p>
              <h2 className="mt-3 font-display text-xl font-bold">No {kind === "wcw" ? "WCW" : "MCM"} pictures yet</h2>
              <p className="mt-1 text-sm text-white/60">Use the first round story on the home page to add yours.</p>
            </div>
          </div>
        )}
      </div>

      <QuickVoteSignup
        open={showQuickSignup}
        onOpenChange={setShowQuickSignup}
        onComplete={() => {
          if (pendingVote && card) {
            setPendingVote(false);
            voteFor(card.id);
            next(1);
          }
        }}
      />
      <AuthModal open={showAuth} onOpenChange={setShowAuth} defaultTab="signup" />

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Report this picture</DialogTitle>
          <DialogDescription>Tell Circle Panda what is wrong with this submission.</DialogDescription>
          <div className="space-y-2">
            {["Inappropriate content", "Harassment", "Impersonation", "Copyright concern", "Other"].map((r) => (
              <button key={r} type="button" onClick={() => setReportReason(r)} className={cn("w-full rounded-xl border p-3 text-left text-sm", reportReason === r ? "border-primary bg-primary/10" : "border-border")}>
                {r}
              </button>
            ))}
            <Button className="w-full" onClick={() => void report()}>Submit report</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{kind.toUpperCase()} leaderboard</DialogTitle>
          <DialogDescription>{FREE_DAILY_VOTES} free votes reset daily. Weekly winner receives {WINNER_REWARD} BC.</DialogDescription>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {ranked.map((n, i) => (
              <div key={n.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <span className="grid size-8 place-items-center rounded-full bg-background text-sm font-bold">{i === 0 ? "👑" : i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">Anonymous Panda</span>
                <span className="text-xs text-muted-foreground">{n.votes} votes</span>
              </div>
            ))}
            {spotlights.length ? <p className="pt-2 text-xs text-muted-foreground">Past Spotlights: {spotlights.slice(0, 4).map((s) => s.name).join(" · ")}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
