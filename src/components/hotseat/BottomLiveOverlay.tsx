import { Flame, MessageCircle, Radio, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { LiveChatMessage } from "./LiveChatDrawer";

export function BottomLiveOverlay({
  hostHandle = "@MidnightPanda",
  hostName = "Midnight Panda",
  topicTitle = "What is one thing you pretend to understand but absolutely do not?",
  chatMessages,
  onOpenChatDrawer,
  onQuickComment,
  onOpenGiveaway,
}: {
  hostHandle?: string;
  hostName?: string;
  topicTitle?: string;
  chatMessages: LiveChatMessage[];
  onOpenChatDrawer: () => void;
  onQuickComment?: (text: string) => void;
  onOpenGiveaway?: () => void;
}) {
  const [quickInput, setQuickInput] = useState("");

  // Default live rolling comments ticker
  const tickerItems =
    chatMessages.length > 0
      ? chatMessages.slice(-8)
      : [
          { id: "1", user: "Anon Cub", text: "The 3am confessions are way too real 😭" },
          { id: "2", user: "Lekki Nomad", text: "Host has 1:24 left on the response clock! 🔥" },
          { id: "3", user: "Paper Panda", text: "Sent 🎋 Fresh Bamboo to Midnight Panda!" },
          { id: "4", user: "Quiet Leaf", text: "Ask about the first date story next!" },
          { id: "5", user: "Silent Sprout", text: "Upvoted the imposter syndrome question 👏" },
        ];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) {
      onOpenChatDrawer();
      return;
    }
    if (onQuickComment) {
      onQuickComment(quickInput.trim());
      setQuickInput("");
    } else {
      onOpenChatDrawer();
    }
  };

  return (
    <div
      id="hot-sit-bottom-overlay"
      className="absolute bottom-4 sm:bottom-6 left-3.5 right-20 sm:right-24 z-30 flex flex-col gap-2.5 max-w-[calc(100%-5.75rem)] sm:max-w-lg pointer-events-auto select-none"
    >
      {/* Giveaway Floating Action Button: Positioned on the left side above host overlay details */}
      <div className="flex items-center self-start mb-0.5">
        <button
          type="button"
          id="giveaway-floating-btn"
          onClick={onOpenGiveaway}
          aria-label="Enter live stream giveaway"
          className="group relative flex flex-col items-center justify-center p-1 cursor-pointer transition-transform duration-200 active:scale-90 hover:scale-105 select-none"
        >
          {/* Continuous spinning and glowing outer aura animation */}
          <div className="relative flex items-center justify-center">
            {/* Spinning colorful gradient aura ring */}
            <div className="animate-giveaway-spin absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,#f59e0b,#ef4444,#ec4899,#8b5cf6,#f59e0b)] opacity-85 blur-[2.5px]" />

            {/* Glowing outer aura halo pulse */}
            <div className="animate-giveaway-glow absolute -inset-2 rounded-full bg-amber-500/40 blur-md pointer-events-none" />

            {/* Circular badge container with 🎁 gift box icon */}
            <div className="relative grid size-11 sm:size-12 place-items-center rounded-full border border-amber-400/80 bg-neutral-950/90 shadow-[0_0_16px_rgba(245,158,11,0.65)] backdrop-blur-md">
              <span className="text-xl sm:text-2xl select-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                🎁
              </span>
            </div>
          </div>

          {/* Text directly beneath the icon reading "GIVEAWAY" */}
          <span className="mt-1 rounded-full border border-amber-400/50 bg-neutral-950/90 px-2 py-0.5 text-[9px] sm:text-[10px] font-black tracking-widest text-amber-300 uppercase shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md">
            GIVEAWAY
          </span>
        </button>
      </div>

      {/* 1. Host Handle and Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 font-display text-sm sm:text-base font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          <span>{hostHandle}</span>
          <ShieldCheck className="size-4 text-orange-400 fill-orange-400/20" />
        </div>

        <span className="rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
          HOST
        </span>

        <span className="text-[11px] font-medium text-white/70 drop-shadow">2.4k rep</span>
      </div>

      {/* 2. Live Topic Title */}
      <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-0.5">
          <Flame className="size-3 text-orange-400 fill-orange-400 animate-pulse" />
          <span>Current Hot Topic</span>
        </div>
        <p className="font-sans text-xs sm:text-sm font-semibold text-white/95 leading-snug drop-shadow line-clamp-2">
          &ldquo;{topicTitle}&rdquo;
        </p>
      </div>

      {/* 3. Single-Line Scrolling Live Comment Feed */}
      <div
        onClick={onOpenChatDrawer}
        role="button"
        tabIndex={0}
        aria-label="Open live comments drawer"
        className="group relative flex h-7 sm:h-8 w-full items-center overflow-hidden rounded-full border border-white/15 bg-black/55 px-2.5 backdrop-blur-md shadow-md cursor-pointer transition-colors hover:bg-black/70 active:scale-[0.99]"
      >
        {/* Left Live Indicator Icon */}
        <div className="flex shrink-0 items-center gap-1.5 pr-2 text-orange-400">
          <Radio className="size-3 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
            CHAT:
          </span>
        </div>

        {/* Scrolling Ticker Stream */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          <div className="animate-marquee-stream flex items-center gap-6 text-[11px] sm:text-xs text-white/90">
            {tickerItems.map((item, idx) => (
              <span
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="font-bold text-orange-200">{item.user}:</span>
                <span className="text-white/80">{item.text}</span>
                <span className="text-white/30 ml-2">·</span>
              </span>
            ))}
            {/* Duplicate set for seamless continuous loop */}
            {tickerItems.map((item, idx) => (
              <span
                key={`dup-${item.id}-${idx}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="font-bold text-orange-200">{item.user}:</span>
                <span className="text-white/80">{item.text}</span>
                <span className="text-white/30 ml-2">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Quick Anonymous Comment Input Pill */}
      <form onSubmit={handleQuickSubmit} className="flex items-center gap-2">
        <div
          onClick={onOpenChatDrawer}
          className="relative flex-1 flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-1.5 backdrop-blur-md transition-all hover:border-orange-500/50 cursor-pointer shadow-md"
        >
          <MessageCircle className="size-3.5 text-white/60 mr-2 shrink-0" />
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Ask or comment anonymously..."
            className="w-full bg-transparent text-xs text-white placeholder:text-white/50 outline-none"
          />
        </div>

        <button
          type="submit"
          aria-label="Send live question or comment"
          className="grid size-8 place-items-center rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
