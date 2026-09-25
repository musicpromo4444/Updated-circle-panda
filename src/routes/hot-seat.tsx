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
import { BottomLiveOverlay } from "@/components/hotseat/BottomLiveOverlay";
import { FloatingActionColumn } from "@/components/hotseat/FloatingActionColumn";
import { FloatingHearts, useFloatingHearts } from "@/components/hotseat/FloatingHearts";
import { GiftDrawer, type VirtualGift } from "@/components/hotseat/GiftDrawer";
import { HostProfileModal } from "@/components/hotseat/HostProfileModal";
import { LiveGiveawayModal } from "@/components/hotseat/LiveGiveawayModal";
import {
  LiveChatDrawer,
  type HotSeatQuestion,
  type LiveChatMessage,
} from "@/components/hotseat/LiveChatDrawer";
import { ShareModal } from "@/components/hotseat/ShareModal";

export const Route = createFileRoute("/hot-seat")({
  head: () => ({
    meta: [
      { title: "Hot Sit Live — Circle Panda" },
      {
        name: "description",
        content: "Live anonymous questions, one host, 24 hours on the Circle Panda Hot Sit.",
      },
    ],
  }),
  component: HotSeatPage,
});

const INITIAL_QUESTIONS: HotSeatQuestion[] = [
  {
    id: "q1",
    alias: "Midnight Panda",
    body: "What is one thing you pretend to understand but absolutely do not?",
    age: "just now",
    votes: 42,
    priority: true,
    status: "waiting",
  },
  {
    id: "q2",
    alias: "Anon Cub",
    body: "What was your most chaotic first date story?",
    age: "2 min ago",
    votes: 18,
    priority: false,
    status: "waiting",
  },
  {
    id: "q3",
    alias: "Quiet Leaf",
    body: "If you could swap lives with anyone for a day, who would it be?",
    age: "4 min ago",
    votes: 11,
    priority: false,
    status: "waiting",
  },
  {
    id: "q4",
    alias: "Bamboo Ghost",
    body: "What is the nicest lie someone has told you?",
    age: "6 min ago",
    votes: 8,
    priority: false,
    status: "answered",
    answer: "That I look like I know what I am doing. I choose to believe it.",
  },
  {
    id: "q5",
    alias: "Paper Panda",
    body: "Would you rather have unlimited Panda Coins or know who upvotes your anonymous confessions?",
    age: "8 min ago",
    votes: 24,
    priority: true,
    status: "waiting",
  },
  {
    id: "q6",
    alias: "Silent Sprout",
    body: "What is an unwritten rule in this app that newcomers always break?",
    age: "11 min ago",
    votes: 15,
    priority: false,
    status: "waiting",
  },
  {
    id: "q7",
    alias: "Lekki Nomad",
    body: "Who was your first WCW or MCM vote this season?",
    age: "14 min ago",
    votes: 19,
    priority: false,
    status: "waiting",
  },
  {
    id: "q8",
    alias: "Night Owl #99",
    body: "What's the deepest confession you've read that felt like it was about you?",
    age: "18 min ago",
    votes: 29,
    priority: false,
    status: "answered",
    answer:
      "The one about someone sitting in traffic on Third Mainland Bridge wondering if everyone else also felt like an imposter. Hits home every time.",
  },
];

const INITIAL_CHAT_MESSAGES: LiveChatMessage[] = [
  { id: "c1", user: "Anon Cub", text: "The 3am confessions are so real 😭", time: "just now" },
  {
    id: "c2",
    user: "Lekki Nomad",
    text: "Host has 1:20 left to answer the imposter question 🔥",
    time: "1m ago",
  },
  {
    id: "c3",
    user: "Bamboo Ghost",
    text: "Sent 🎋 Fresh Bamboo to Midnight Panda!",
    isGift: true,
    time: "2m ago",
  },
  {
    id: "c4",
    user: "Quiet Leaf",
    text: "Ask about the Lekki bridge traffic story next!",
    time: "2m ago",
  },
  {
    id: "c5",
    user: "Paper Panda",
    text: "Who's bidding for the next 24h Hot Sit seat?",
    time: "3m ago",
  },
  {
    id: "c6",
    user: "Silent Sprout",
    text: "LMAO Midnight Panda's reaction to that question 💀",
    time: "3m ago",
  },
  {
    id: "c7",
    user: "Neon Tiger",
    text: "Can we get an encore on the campus dining hall debate?",
    time: "4m ago",
  },
  {
    id: "c8",
    user: "Abuja Belle",
    text: "Upvoted all the juicy relationship questions! 🍿",
    time: "4m ago",
  },
  {
    id: "c9",
    user: "Cyber Cub",
    text: "Sent 👑 Golden Crown to Midnight Panda!",
    isGift: true,
    time: "5m ago",
  },
  {
    id: "c10",
    user: "Campus Ghost",
    text: "Midnight Panda is killing it tonight 🔥 Keep the questions coming!",
    time: "5m ago",
  },
  {
    id: "c11",
    user: "Sunset Surfer",
    text: "Timer is running down fast! Next hot seat host please!",
    time: "6m ago",
  },
  {
    id: "c12",
    user: "VI Hustler",
    text: "Dropping 60 Panda Coins on the queue right now.",
    time: "6m ago",
  },
  {
    id: "c13",
    user: "Velvet Fox",
    text: "Whoever asked question #5 about imposter syndrome is a legend.",
    time: "7m ago",
  },
  {
    id: "c14",
    user: "Midnight Fan",
    text: "Sent ☕ Warm Boba to Midnight Panda!",
    isGift: true,
    time: "7m ago",
  },
  {
    id: "c15",
    user: "Quiet Observer",
    text: "This Hot Sit is definitely the most entertaining one this month.",
    time: "8m ago",
  },
  {
    id: "c16",
    user: "Yaba Dev",
    text: "No cap, the anonymous upvoting feature is addictive.",
    time: "8m ago",
  },
  {
    id: "c17",
    user: "Coffee Panda",
    text: "Midnight Panda needs to drop the skincare routine too haha.",
    time: "9m ago",
  },
  {
    id: "c18",
    user: "Street Smart",
    text: "Check out the giveaway button on the left! Big coin drops tonight 🎁",
    time: "9m ago",
  },
  {
    id: "c19",
    user: "Retro Gamer",
    text: "Sent 🚀 Rocket Booster to Midnight Panda!",
    isGift: true,
    time: "10m ago",
  },
  {
    id: "c20",
    user: "Golden Cub",
    text: "Let's get this live stream to 50k hearts guys! Double tap! ❤️",
    time: "10m ago",
  },
  {
    id: "c21",
    user: "Echo Walker",
    text: "Keep spamming hearts, host is on fire tonight!",
    time: "11m ago",
  },
  {
    id: "c22",
    user: "Mystery Guest",
    text: "Checking the live queue to bid next round...",
    time: "11m ago",
  },
];

const QUEUE = [
  { name: "Paper Panda", avatar: "📄", bid: 80 },
  { name: "Bamboo Ghost", avatar: "🎋", bid: 65 },
  { name: "Anon Cub", avatar: "🐾", bid: 50 },
  { name: "Quiet Leaf", avatar: "🌿", bid: 35 },
];

function formatLongTimer(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

function QueuePanel({
  joined,
  onJoin,
  onBid,
}: {
  joined: boolean;
  onJoin: () => void;
  onBid: () => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-950 p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-amber-400">
            <Trophy className="size-3.5" /> Waiting room auction
          </p>
          <h2 className="mt-1 font-display text-xl font-bold">Next seat opens in 04:32</h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            The highest Black Coin priority bid gets first question rights & next host rotation.
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-xl">
          🪙
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {QUEUE.map((item, idx) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/70 px-3.5 py-2.5 text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-neutral-500">#{idx + 1}</span>
              <span className="text-base">{item.avatar}</span>
              <span className="font-semibold text-white">{item.name}</span>
            </div>
            <span className="font-bold text-amber-400">{item.bid} BC</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button
          onClick={onJoin}
          disabled={joined}
          variant="outline"
          className="border-white/20 bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-xs"
        >
          {joined ? "✓ In Queue" : "Join Queue (5 BC)"}
        </Button>
        <Button
          onClick={onBid}
          className="bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white shadow text-xs hover:opacity-95"
        >
          Boost Bid (+25 BC)
        </Button>
      </div>
    </section>
  );
}

function HotSeatPage() {
  const navigate = useNavigate();
  const { spendCoins, isAdmin } = useStore();

  // Video & HUD states
  const [muted, setMuted] = useState(true);
  const [windowSeconds, setWindowSeconds] = useState(23 * 3600 + 17 * 60 + 44);
  const [likeCount, setLikeCount] = useState(14842);
  const [isFollowing, setIsFollowing] = useState(false);
  const [questions, setQuestions] = useState<HotSeatQuestion[]>(INITIAL_QUESTIONS);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [giftBanner, setGiftBanner] = useState<string | null>(null);

  // Modals / Drawers states
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [giftDrawerOpen, setGiftDrawerOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const [waitingRoomOpen, setWaitingRoomOpen] = useState(false);
  const [giveawayModalOpen, setGiveawayModalOpen] = useState(false);
  const [joined, setJoined] = useState(false);

  // Floating Hearts Hook
  const { hearts, spawnHeart } = useFloatingHearts();

  // Double tap detection
  const lastTapRef = useRef<number>(0);

  // Timer countdown
  useEffect(() => {
    const interval = window.setInterval(() => {
      setWindowSeconds((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Periodic incoming ambient reactions
  useEffect(() => {
    const randomComments = [
      "Midnight Panda is dropping wisdom 🔥",
      "That confession had me dead 😭",
      "Upvoted the date question!",
      "Lagos traffic imposter syndrome is 100% real",
      "Anyone else staying up for the 24h reset?",
    ];
    const randomUsers = ["LekkiPanda", "QuietCub", "NightSprout", "AnonNomad", "EchoLeaf"];

    const interval = window.setInterval(() => {
      const u = randomUsers[Math.floor(Math.random() * randomUsers.length)];
      const t = randomComments[Math.floor(Math.random() * randomComments.length)];
      setChatMessages((prev) => [
        ...prev.slice(-25),
        { id: `${Date.now()}`, user: u, text: t, time: "just now" },
      ]);
    }, 12000);

    return () => window.clearInterval(interval);
  }, []);

  // Double tap on video spawns floating hearts
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 350;
    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double tap!
      spawnHeart(e.clientX, e.clientY);
      setLikeCount((c) => c + 1);
    }
    lastTapRef.current = now;
  };

  // Like button tap
  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left + rect.width / 2, rect.top);
    setLikeCount((c) => c + 1);
  };

  // Follow toggle
  const handleToggleFollow = () => {
    setIsFollowing((prev) => {
      const next = !prev;
      if (next) {
        toast.success("Following Midnight Panda! 🐼", {
          description: "You'll be notified when upcoming Hot Sit sessions go live.",
        });
      } else {
        toast("Unfollowed Midnight Panda");
      }
      return next;
    });
  };

  // Ask question
  const handleAskQuestion = (body: string, priority: boolean) => {
    if (priority) {
      if (!spendCoins(25, "Hot Sit Priority Question")) {
        toast.error("Low Black Coin balance!", {
          description: "You need 25 BC to boost your question with Priority.",
        });
        return;
      }
    }

    const newQuestion: HotSeatQuestion = {
      id: `mine-${Date.now()}`,
      alias: "You (anonymous)",
      body,
      age: "now",
      votes: 1,
      priority,
      status: "waiting",
    };

    setQuestions((prev) => [newQuestion, ...prev]);
    toast.success("Anonymous question submitted! 🔥", {
      description: priority
        ? "Boosted with Priority. Pinned to the top of host queue."
        : "The host has 2 minutes to answer.",
    });
  };

  // Send live chat message
  const handleSendChatMessage = (text: string) => {
    const msg: LiveChatMessage = {
      id: `${Date.now()}`,
      user: "You",
      text,
      time: "now",
    };
    setChatMessages((prev) => [...prev, msg]);
  };

  // Upvote question
  const handleUpvoteQuestion = (id: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q)));
    toast.success("Upvoted! Moved up in the host queue.");
  };

  // Answer question (if host/admin)
  const handleAnswerQuestion = (id: string, answerText: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "answered", answer: answerText } : q)),
    );
    toast.success("Host reply published to stream!");
  };

  // Send virtual gift
  const handleSendGift = (gift: VirtualGift) => {
    const giftAnnouncement = `Anon Panda sent ${gift.emoji} ${gift.name}!`;
    setGiftBanner(giftAnnouncement);
    setTimeout(() => setGiftBanner(null), 3500);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        user: "Anon Panda",
        text: `Sent ${gift.emoji} ${gift.name}!`,
        isGift: true,
        time: "now",
      },
    ]);

    // Spawn hearts
    for (let i = 0; i < 4; i++) {
      setTimeout(() => spawnHeart(), i * 150);
    }
  };

  // Universal share trigger
  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Midnight Panda LIVE on Hot Sit",
          text: "🔥 Watch Midnight Panda live on the Circle Panda Hot Sit and ask anything anonymously!",
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
    if (!spendCoins(5, "Hot Sit queue entry")) return;
    setJoined(true);
    toast.success("You joined the waiting room queue! 🎟️", {
      description: "The next 24-hour seat opens in 04:32.",
    });
  };

  const handleBoostQueue = () => {
    if (!spendCoins(25, "Hot Sit priority boost")) return;
    setJoined(true);
    toast.success("Queue priority boosted! 🚀", {
      description: "Your 25 BC bid moved you ahead in the auction.",
    });
  };

  return (
    <div
      id="hot-sit-immersive-viewport"
      onClick={handleVideoTap}
      className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-black select-none"
    >
      {/* 1. Main Live Video Feed (Spans 100% of the screen width and height) */}
      <video
        autoPlay
        loop
        muted={muted}
        playsInline
        poster="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80"
        src="https://cdn.pixabay.com/video/2023/10/13/184374-873392978_large.mp4"
        className="absolute inset-0 size-full object-cover select-none pointer-events-none"
      />

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
          id="hot-sit-back-button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: "/" });
          }}
          aria-label="Exit Hot Sit back to feed"
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/70 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Exit</span>
        </button>

        {/* Top Center / Right: Live Badge, Timer, Audio Mute, and Sit Action */}
        <div className="flex items-center gap-2">
          {/* Live Indicator Badge */}
          <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/70 px-2.5 sm:px-3 py-1 text-[11px] font-bold text-red-200 backdrop-blur-md shadow-[0_0_16px_rgba(239,68,68,0.4)]">
            <span className="size-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-extrabold uppercase tracking-wider text-[10px]">LIVE</span>
            <span className="text-white/80 hidden sm:inline">· 3.8k</span>
          </div>

          {/* Host Window Timer */}
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-md">
            <Clock3 className="size-3 text-orange-400" />
            <span className="tabular-nums font-mono">{formatLongTimer(windowSeconds)}</span>
          </div>

          {/* Sit on Hot Sit Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setWaitingRoomOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-orange-500/60 bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Flame className="size-3.5 fill-current" />
            <span className="hidden xs:inline">Sit on</span> Hot Sit
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

      {/* 2. Right-Side Floating Action Bar (Exactly 5 action icons) */}
      <FloatingActionColumn
        likeCount={likeCount}
        commentCount={questions.length}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onOpenHostProfile={() => setHostProfileOpen(true)}
        onLike={handleLike}
        onOpenComments={() => setChatDrawerOpen(true)}
        onOpenGifts={() => setGiftDrawerOpen(true)}
        onShare={handleShare}
      />

      {/* 3. Bottom Overlay (Host Handle, Live Topic, Single-Line Scrolling Live Comment Feed) */}
      <BottomLiveOverlay
        hostHandle="@MidnightPanda"
        hostName="Midnight Panda"
        topicTitle="What is one thing you pretend to understand but absolutely do not?"
        chatMessages={chatMessages}
        onOpenChatDrawer={() => setChatDrawerOpen(true)}
        onQuickComment={(text) => handleSendChatMessage(text)}
        onOpenGiveaway={() => setGiveawayModalOpen(true)}
      />

      {/* Modals & Drawers */}

      {/* Live Stream Giveaway Modal */}
      <LiveGiveawayModal
        open={giveawayModalOpen}
        onOpenChange={setGiveawayModalOpen}
        hostName="Midnight Panda"
      />

      {/* Live Chat & Questions Drawer */}
      <LiveChatDrawer
        open={chatDrawerOpen}
        onOpenChange={setChatDrawerOpen}
        questions={questions}
        chatMessages={chatMessages}
        onAskQuestion={handleAskQuestion}
        onSendChatMessage={handleSendChatMessage}
        onUpvoteQuestion={handleUpvoteQuestion}
        onAnswerQuestion={handleAnswerQuestion}
        adminMode={isAdmin}
      />

      {/* Virtual Gifts & Rewarded Ad Drawer */}
      <GiftDrawer
        open={giftDrawerOpen}
        onOpenChange={setGiftDrawerOpen}
        onSendGift={handleSendGift}
      />

      {/* Universal Share Sheet / Fallback Modal */}
      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />

      {/* Host Profile Info Modal */}
      <HostProfileModal
        open={hostProfileOpen}
        onOpenChange={setHostProfileOpen}
        windowSeconds={windowSeconds}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onOpenWaitingRoom={() => setWaitingRoomOpen(true)}
      />

      {/* Auction Waiting Room Modal */}
      <Dialog open={waitingRoomOpen} onOpenChange={setWaitingRoomOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-neutral-950/95 text-white backdrop-blur-2xl sm:max-w-lg p-0 rounded-3xl">
          <DialogTitle className="sr-only">Auction Queue Waiting Room</DialogTitle>
          <DialogDescription className="sr-only">
            Join the Hot Sit auction queue with Panda Coins or boost your priority bid.
          </DialogDescription>
          <QueuePanel joined={joined} onJoin={handleJoinQueue} onBid={handleBoostQueue} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
