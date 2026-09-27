import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUp,
  Ban,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Gavel,
  Gift,
  Heart,
  Lock,
  MessageCircle,
  Mic2,
  Radio,
  Send,
  Share2,
  Sparkles,
  TimerReset,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { activeHostQuery, questionsQuery, askQuestion, upvoteQuestion, formatCountdown } from "@/lib/hotseat";
import { BottomLiveOverlay } from "@/components/hotseat/BottomLiveOverlay";
import { FloatingActionColumn } from "@/components/hotseat/FloatingActionColumn";
import { FloatingHearts, useFloatingHearts } from "@/components/hotseat/FloatingHearts";
import { GiftDrawer, type VirtualGift } from "@/components/hotseat/GiftDrawer";
import { HostProfileModal } from "@/components/hotseat/HostProfileModal";
import {
  LiveChatDrawer,
  type HotSeatQuestion,
  type LiveChatMessage,
} from "@/components/hotseat/LiveChatDrawer";
import { ShareModal } from "@/components/hotseat/ShareModal";

export const Route = createFileRoute("/hot-seat")({
  head: () => ({
    meta: [
      { title: "Hot Seat Live — Circle Panda" },
      {
        name: "description",
        content: "Worldwide live Hot Seat sessions: 3 hours live, followed by a mandatory 1-hour water break.",
      },
    ],
  }),
  component: HotSeatPage,
});
function formatLongTimer(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function QueuePanel({ joined, onJoin, onBid }: { joined: boolean; onJoin: () => void; onBid: () => void }) {
  return (
    <div className="p-5 text-white">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-10 place-items-center rounded-2xl bg-orange-500/15 text-orange-300"><Flame className="size-5" /></div>
        <div>
          <h3 className="font-black">Join the Hot Seat</h3>
          <p className="text-xs text-white/55">Be ready for the next live host block.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
        <div className="flex justify-between"><span>Live block</span><strong className="text-white">3 hours</strong></div>
        <div className="mt-2 flex justify-between"><span>Water break</span><strong className="text-white">1 hour</strong></div>
        <div className="mt-2 flex justify-between"><span>Optional pause</span><strong className="text-white">Up to 15 min</strong></div>
      </div>
      <div className="mt-4 grid gap-2">
        <Button type="button" onClick={onJoin} disabled={joined} className="h-11 rounded-xl bg-orange-500 text-white hover:bg-orange-400">
          {joined ? "You're in the queue ✓" : "Join queue · 5 BC"}
        </Button>
        <Button type="button" variant="outline" onClick={onBid} className="h-11 rounded-xl border-orange-400/30 bg-transparent text-orange-200 hover:bg-orange-400/10">
          Boost priority · 25 BC
        </Button>
      </div>
    </div>
  );
}

function HotSeatPage() {
  const navigate = useNavigate();
  const { syncCoins, isAdmin } = useStore();
  const [activeHost, setActiveHost] = useState<any>(null);
  const [loadingLiveData, setLoadingLiveData] = useState(true);
  const [sessionPhase, setSessionPhase] = useState<"live" | "water-break" | "paused" | "ended" | "waiting">("waiting");
  const [userId, setUserId] = useState<string | null>(null);

  // Video & HUD states
  const [muted, setMuted] = useState(true);
  const [windowSeconds, setWindowSeconds] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [questions, setQuestions] = useState<HotSeatQuestion[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [giftBanner, setGiftBanner] = useState<string | null>(null);

  // Modals / Drawers states
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [giftDrawerOpen, setGiftDrawerOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const [waitingRoomOpen, setWaitingRoomOpen] = useState(false);
  const [joined, setJoined] = useState(false);

  // Floating Hearts Hook
  const { hearts, spawnHeart } = useFloatingHearts();

  // Double tap detection
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: sessionData }, hostResult] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from("hot_seat_hosts").select("*").eq("is_active", true).order("started_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!mounted) return;
      setUserId(sessionData.session?.user?.id ?? null);
      setActiveHost(hostResult.data ?? null);
      if (hostResult.data) {
        const { data } = await supabase.from("hot_seat_questions").select("*, hot_seat_answers(*)").eq("host_id", hostResult.data.id).order("is_priority", { ascending: false }).order("created_at", { ascending: false });
        const qs = (data ?? []).map((q: any) => ({ id: q.id, alias: q.asker_alias, body: q.body, age: "now", votes: 0, priority: q.is_priority, status: q.hot_seat_answers?.length ? "answered" : "waiting", answer: q.hot_seat_answers?.[0]?.body }));
        setQuestions(qs as HotSeatQuestion[]);
      }
      const { data: chat } = await supabase.from("hot_seat_chat").select("*").order("created_at", { ascending: false }).limit(50);
      setChatMessages((chat ?? []).reverse().map((m: any) => ({ id: m.id, user: m.alias, text: m.body, time: "now", isGift: m.is_gift })));
      setLoadingLiveData(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("circle-panda-hot-seat-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hot_seat_questions" }, (payload) => {
        const q: any = payload.new;
        if (!activeHost || q.host_id !== activeHost.id) return;
        setQuestions((prev) => [{ id: q.id, alias: q.asker_alias, body: q.body, age: "just now", votes: 0, priority: q.is_priority, status: "waiting" }, ...prev]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hot_seat_chat" }, (payload) => {
        const m: any = payload.new;
        setChatMessages((prev) => [...prev.slice(-49), { id: m.id, user: m.alias, text: m.body, time: "just now", isGift: m.is_gift }]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeHost]);

  // Hot Seat session clock: 3 hours live + mandatory 1 hour water break.
  // The phase is derived from the scheduled start time so the UI stays correct even if the
  // browser is refreshed. Admin-created sessions can still override the provider/slot metadata.
  useEffect(() => {
    const tick = () => {
      if (!activeHost) {
        setSessionPhase("waiting");
        setWindowSeconds(0);
        return;
      }
      const elapsed = Math.floor((Date.now() - new Date(activeHost.started_at).getTime()) / 1000);
      const pauseUntil = activeHost.pause_until ? new Date(activeHost.pause_until).getTime() : 0;
      if (pauseUntil > Date.now()) {
        setSessionPhase("paused");
        setWindowSeconds(Math.ceil((pauseUntil - Date.now()) / 1000));
        return;
      }
      const LIVE_SECONDS = 3 * 60 * 60;
      const BREAK_SECONDS = 60 * 60;
      const CYCLE_SECONDS = LIVE_SECONDS + BREAK_SECONDS;
      const totalDuration = Math.max(0, Math.floor((new Date(activeHost.ends_at).getTime() - new Date(activeHost.started_at).getTime()) / 1000));
      if (elapsed < 0) {
        setSessionPhase("waiting");
        setWindowSeconds(-elapsed);
      } else if (totalDuration > 0 && elapsed >= totalDuration) {
        setSessionPhase("ended");
        setWindowSeconds(0);
      } else {
        const cyclePosition = elapsed % CYCLE_SECONDS;
        if (cyclePosition < LIVE_SECONDS) {
          setSessionPhase("live");
          setWindowSeconds(LIVE_SECONDS - cyclePosition);
        } else {
          setSessionPhase("water-break");
          setWindowSeconds(CYCLE_SECONDS - cyclePosition);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeHost]);

  useEffect(() => {
    if (!userId) return;
    void (supabase as any).from("hot_seat_likes").select("user_id", { count: "exact", head: true }).then((r:any)=>setLikeCount(r.count ?? 0));
    void (supabase as any).from("hot_seat_follows").select("user_id").eq("user_id", userId).maybeSingle().then((r:any)=>setIsFollowing(Boolean(r.data)));
  }, [userId]);

  // Live chat is now driven by Supabase Realtime; no synthetic messages are generated.

  // Double tap on video spawns floating hearts
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 350;
    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double tap!
      spawnHeart(e.clientX, e.clientY);
      void (supabase as any).rpc("toggle_hot_seat_like").then(({ data, error }: any) => {
        if (error) throw error;
        setLikeCount((c) => Math.max(0, c + (data?.liked ? 1 : -1)));
      }).catch((error: any) => toast.error(error?.message ?? "Could not update like."));
    }
    lastTapRef.current = now;
  };

  // Like button tap
  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left + rect.width / 2, rect.top);
    void (supabase as any).rpc("toggle_hot_seat_like").then(({ data, error }: any) => {
      if (error) throw error;
      setLikeCount((c) => Math.max(0, c + (data?.liked ? 1 : -1)));
    }).catch((error:any) => toast.error(error?.message ?? "Could not update like."));
  };

  // Follow toggle
  const handleToggleFollow = () => {
    setIsFollowing((prev) => {
      const next = !prev;
      if (userId) void (next ? (supabase as any).from("hot_seat_follows").upsert({user_id:userId}) : (supabase as any).from("hot_seat_follows").delete().eq("user_id",userId));
      if (next) {
        toast.success(`Following ${activeHost?.alias ?? "the host"}! 🐼`, {
          description: "You'll be notified when upcoming Hot Seat sessions go live.",
        });
      } else {
        toast(`Unfollowed ${activeHost?.alias ?? "the host"}`);
      }
      return next;
    });
  };

  // Ask question
  const handleAskQuestion = (body: string, priority: boolean) => {
    if (!activeHost || !userId) { toast.error("You must be signed in while a Hot Seat host is live."); return; }
    void askQuestion({ hostId: activeHost.id, body, priority }).then(async () => { await syncCoins(); toast.success("Anonymous question submitted! 🔥", {
      description: priority
        ? "Boosted with Priority. Pinned to the top of host queue."
        : "The host has 2 minutes to answer.",
    }); }).catch((error) => toast.error(error?.message ?? "Could not submit the question."));
  };

  // Send live chat message
  const handleSendChatMessage = (text: string) => {
    const msg: LiveChatMessage = {
      id: `${Date.now()}`,
      user: "You",
      text,
      time: "now",
    };
    if (!userId) { toast.error("Sign in to join the live chat."); return; }
    void (supabase as any).rpc("send_hot_seat_chat_secure", { p_body: text }).catch((error:any) => toast.error(error?.message ?? "Could not send message."));
  };

  // Upvote question
  const handleUpvoteQuestion = (id: string) => {
    if (!userId) { toast.error("Sign in to upvote questions."); return; }
    void upvoteQuestion(id, userId).then(() => { setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))); toast.success("Upvoted! Moved up in the host queue."); }).catch((error) => toast.error(error?.message ?? "Could not upvote."));
  };

  // Answer question (if host/admin)
  const handleAnswerQuestion = (id: string, answerText: string) => {
    void (supabase as any).rpc("answer_hot_seat_question_secure", { p_question_id: id, p_body: answerText }).then(({error}:any) => {
      if (error) throw error;
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, status: "answered", answer: answerText } : q)));
      toast.success("Host reply published to stream!");
    }).catch((error:any) => toast.error(error?.message ?? "Could not publish host reply."));
  };

  // Send virtual gift
  const handleSendGift = (gift: VirtualGift) => {
    if (!userId || !activeHost) { toast.error("You must be signed in while a Hot Seat host is live."); return; }
    void (supabase as any).rpc("send_hot_seat_gift", { p_host_id: activeHost.id, p_gift_id: gift.id, p_gift_name: gift.name, p_gift_emoji: gift.emoji, p_cost_bc: gift.cost })
      .then(async ({ data, error }: any) => {
        if (error) throw error;
        await syncCoins();
        setGiftBanner(`Anon Panda sent ${gift.emoji} ${gift.name}!`);
        window.setTimeout(() => setGiftBanner(null), 3500);
        for (let i = 0; i < 4; i++) window.setTimeout(() => spawnHeart(), i * 150);
        toast.success(`Sent ${gift.emoji} ${gift.name}!`, { description: `${Number(data?.cost_bc ?? gift.cost)} BC sent securely.` });
      })
      .catch((error:any) => toast.error(error?.message ?? "Could not send gift."));
  };

  // Universal share trigger
  const handleShare = async () => {
    if (!activeHost) {
      toast.info("Hot Seat is between live hosts right now.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${activeHost?.alias ?? "Circle Panda"} LIVE on Hot Seat`,
          text: `🔥 Watch ${activeHost?.alias ?? "Circle Panda"} live on the Circle Panda Hot Seat and ask anything anonymously!`,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setShareModalOpen(true);
        }
      }
    } else {
      setShareModalOpen(true);
    }
  };

  // Queue actions
  const handleJoinQueue = () => {
    if (!userId) { toast.error("Sign in to join the queue."); return; }
    void (supabase as any).rpc("join_hot_seat_queue_secure", { p_bid_bc: 5 }).then(async (result:any) => { if (result.error) throw result.error; await syncCoins();
    setJoined(true);
    toast.success("You joined the waiting room queue! 🎟️", { description: "Your queue entry is secured." });
    }).catch((error:any) => toast.error(error?.message ?? "Could not join queue."));
  };

  const handleBoostQueue = () => {
    if (!userId) { toast.error("Sign in to boost the queue."); return; }
    void (supabase as any).rpc("join_hot_seat_queue_secure", { p_bid_bc: 25 }).then(async (result:any) => { if (result.error) throw result.error; await syncCoins();
    setJoined(true);
    toast.success("Queue priority boosted! 🚀", { description: "Your priority bid is secured." });
    }).catch((error:any) => toast.error(error?.message ?? "Could not boost queue."));
  };

  return (
    <div
      id="hot-seat-immersive-viewport"
      onClick={handleVideoTap}
      className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-black select-none"
    >
      {/* 1. Main Live Video Feed (Spans 100% of the screen width and height) */}
      <video
        autoPlay
        loop
        muted={muted}
        playsInline
        poster={activeHost?.media_url ?? undefined}
        src={activeHost?.media_url ?? undefined}
        className={`absolute inset-0 size-full object-cover select-none pointer-events-none ${sessionPhase === "live" ? "" : "opacity-0"}`}
      />

      
      {activeHost && sessionPhase === "paused" && (
        <div className="absolute inset-0 z-25 grid place-items-center bg-neutral-950 px-6 text-center">
          <div className="max-w-md rounded-3xl border border-orange-400/20 bg-black/60 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-4 text-5xl">⏸️</div>
            <div className="mb-2 inline-flex rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Optional pause</div>
            <h2 className="text-2xl font-extrabold text-white">Hot Seat paused</h2>
            <p className="mt-2 text-sm text-white/60">The live player is closed while the host takes a short break.</p>
            <div className="mt-5 text-3xl font-black tabular-nums text-white">{formatLongTimer(windowSeconds)}</div>
          </div>
        </div>
      )}

      {activeHost && sessionPhase === "water-break" && (
        <div className="absolute inset-0 z-25 grid place-items-center bg-neutral-950 px-6 text-center">
          <div className="max-w-md rounded-3xl border border-amber-400/20 bg-black/60 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-4 text-5xl">💧</div>
            <div className="mb-2 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
              Mandatory water break
            </div>
            <h2 className="text-2xl font-extrabold text-white">Hot Seat resumes soon</h2>
            <p className="mt-2 text-sm text-white/60">The 3-hour live block has ended. The live player is closed for 1 hour, then the next live block resumes automatically.</p>
            <div className="mt-5 text-3xl font-black tabular-nums text-white">{formatLongTimer(windowSeconds)}</div>
          </div>
        </div>
      )}

      {activeHost && sessionPhase === "ended" && (
        <div className="absolute inset-0 z-25 grid place-items-center bg-neutral-950 px-6 text-center">
          <div className="max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
            <div className="mx-auto mb-4 text-5xl">🐼</div>
            <h2 className="text-2xl font-extrabold text-white">Hot Seat session ended</h2>
            <p className="mt-2 text-sm text-white/60">The scheduled worldwide event has ended. The next event will appear here when an admin starts it.</p>
          </div>
        </div>
      )}

      {!activeHost && !loadingLiveData && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-neutral-950/80 px-6 text-center">
          <div className="max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
            <div className="mx-auto mb-4 text-5xl">🐼</div>
            <h2 className="text-xl font-extrabold text-white">Hot Seat is between hosts</h2>
            <p className="mt-2 text-sm text-white/60">The next live host will appear here automatically when an admin starts a session.</p>
          </div>
        </div>
      )}

      {/* Aesthetic Vignette & Gradient Overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/90 via-black/45 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/95 via-black/70 via-50% to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/60 to-transparent z-10" />

      {/* Floating Hearts Container */}
      <FloatingHearts hearts={hearts} />

      {/* Floating Gift Broadcast Banner */}
      {giftBanner && (
        <div className="pointer-events-none absolute top-20 inset-x-0 mx-auto z-40 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-neutral-950/85 px-4 py-2 text-xs font-bold text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.5)] backdrop-blur-md">
            <Sparkles className="size-4 animate-spin" />
            <span>{giftBanner}</span>
          </div>
        </div>
      )}

      {/* Top Bar HUD (No standard header - custom TikTok/Reels live HUD) */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3.5 sm:p-4 pointer-events-auto">
        {/* Top-Left: Semi-transparent Back Button */}
        <button
          id="hot-seat-back-button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: "/" });
          }}
          aria-label="Exit Hot Seat back to feed"
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/70 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Exit</span>
        </button>

        {/* Top Center / Right: Live Badge, Timer, Audio Mute, and Sit Action */}
        <div className="flex items-center gap-2">
          {/* Live Indicator Badge */}
          <div className={`flex items-center gap-2 rounded-full border px-2.5 sm:px-3 py-1 text-[11px] font-bold backdrop-blur-md shadow-[0_0_16px_rgba(234,88,12,0.2)] ${activeHost ? "border-red-500/40 bg-red-950/70 text-red-200" : "border-white/15 bg-black/45 text-white/70"}`}>
            <span className={`size-2 rounded-full ${activeHost ? "bg-red-500 animate-ping" : "bg-white/40"}`} />
            <span className="font-extrabold uppercase tracking-wider text-[10px]">{sessionPhase === "live" ? "LIVE" : sessionPhase === "water-break" ? "WATER BREAK" : sessionPhase === "ended" ? "ENDED" : "WAITING"}</span>
            {sessionPhase === "live" && activeHost ? <span className="text-white/80 hidden sm:inline">· {Number(activeHost.viewer_count ?? 0).toLocaleString()}</span> : null}
          </div>

          {/* Host Window Timer */}
          <div className={`${activeHost && sessionPhase !== "ended" ? "flex" : "hidden"} items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-md`}>
            <Clock3 className="size-3 text-orange-400" />
            <span className="tabular-nums font-mono">{formatLongTimer(windowSeconds)}</span>
          </div>

          {/* Sit on Hot Seat Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setWaitingRoomOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-orange-500/60 bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Flame className="size-3.5 fill-current" />
            <span className="hidden xs:inline">Sit on</span> Hot Seat
          </button>

          {/* Audio Mute / Unmute Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            aria-label={muted ? "Unmute audio" : "Mute audio"}
            className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70 cursor-pointer"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>

      {activeHost && (
        <div className="pointer-events-none absolute left-3 top-20 z-30 max-w-[78%] rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-white backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/70">
            <Radio className="size-3" /> Worldwide Hot Seat · {activeHost.stream_provider ?? "Admin live provider"}
          </div>
          <div className="mt-1 text-xs font-bold">{Number(activeHost.max_hosts ?? 5)} host slots · 20% BC host economy share</div>
        </div>
      )}

      {/* 2. Right-Side Floating Action Bar (Exactly 5 action icons) */}
      {sessionPhase === "live" && (
        <FloatingActionColumn
          likeCount={likeCount}
          commentCount={questions.length}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
          onOpenHostProfile={() => {
            if (activeHost) setHostProfileOpen(true);
            else toast.info("A live host profile will appear when the next Hot Seat starts.");
          }}
          onLike={handleLike}
          onOpenComments={() => setChatDrawerOpen(true)}
          onOpenGifts={() => setGiftDrawerOpen(true)}
          onShare={handleShare}
        />
      )}

      {/* 3. Bottom Overlay (Host Handle, Live Topic, Single-Line Scrolling Live Comment Feed) */}
      {sessionPhase === "live" && (
        <BottomLiveOverlay
          hostHandle={activeHost ? `@${activeHost.alias.replace(/\s+/g, "")}` : ""}
          hostName={activeHost?.alias ?? ""}
          topicTitle={questions[0]?.body ?? ""}
          chatMessages={chatMessages}
          onOpenChatDrawer={() => setChatDrawerOpen(true)}
          onQuickComment={(text) => handleSendChatMessage(text)}
          reputation={Number(activeHost?.reputation ?? 0)}
        />
      )}

      {/* Modals & Drawers */}


      {/* Live Chat & Questions Drawer */}
      {sessionPhase === "live" && <LiveChatDrawer
        open={chatDrawerOpen}
        onOpenChange={setChatDrawerOpen}
        questions={questions}
        chatMessages={chatMessages}
        onAskQuestion={handleAskQuestion}
        onSendChatMessage={handleSendChatMessage}
        onUpvoteQuestion={handleUpvoteQuestion}
        onAnswerQuestion={handleAnswerQuestion}
        adminMode={isAdmin}
      />}

      {/* Virtual Gifts & Rewarded Ad Drawer */}
      {sessionPhase === "live" && <GiftDrawer
        open={giftDrawerOpen}
        onOpenChange={setGiftDrawerOpen}
        onSendGift={handleSendGift}
        hostName={activeHost?.alias ?? "the host"}
      />}

      {/* Universal Share Sheet / Fallback Modal */}
      <ShareModal open={shareModalOpen && Boolean(activeHost)} onOpenChange={setShareModalOpen} hostName={activeHost?.alias ?? ""} />

      {/* Host Profile Info Modal */}
      <HostProfileModal
        open={hostProfileOpen && Boolean(activeHost)}
        onOpenChange={setHostProfileOpen}
        windowSeconds={windowSeconds}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onOpenWaitingRoom={() => setWaitingRoomOpen(true)}
        hostName={activeHost?.alias ?? ""}
        reputation={Number(activeHost?.reputation ?? 0)}
        location={activeHost?.location ?? ""}
        answeredCount={Number(activeHost?.answered_count ?? questions.filter((q) => q.status === "answered").length)}
        viewerCount={Number(activeHost?.viewer_count ?? 0)}
        topic={activeHost?.topic ?? questions[0]?.body ?? ""}
      />

      {/* Auction Waiting Room Modal */}
      <Dialog open={waitingRoomOpen} onOpenChange={setWaitingRoomOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-neutral-950/95 text-white backdrop-blur-2xl sm:max-w-lg p-0 rounded-3xl">
          <DialogTitle className="sr-only">Auction Queue Waiting Room</DialogTitle>
          <DialogDescription className="sr-only">
            Join the Hot Seat auction queue with Panda Coins or boost your priority bid.
          </DialogDescription>
          <QueuePanel joined={joined} onJoin={handleJoinQueue} onBid={handleBoostQueue} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
