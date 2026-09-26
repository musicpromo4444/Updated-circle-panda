import { Flame, MessageCircle, Radio, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { LiveChatMessage } from "./LiveChatDrawer";

export function BottomLiveOverlay({
  hostHandle = "",
  hostName = "",
  topicTitle = "",
  chatMessages,
  onOpenChatDrawer,
  onQuickComment,
  reputation = 0,
}: {
  hostHandle?: string;
  hostName?: string;
  topicTitle?: string;
  chatMessages: LiveChatMessage[];
  onOpenChatDrawer: () => void;
  onQuickComment?: (text: string) => void;
  reputation?: number;
}) {
  const [quickInput, setQuickInput] = useState("");

  // Default live rolling comments ticker
  const tickerItems = chatMessages.slice(-8);

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
      {/* 1. Host Handle and Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 font-display text-sm sm:text-base font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          <span>{hostHandle || "Hot Seat"}</span>
          {hostHandle && <ShieldCheck className="size-4 text-orange-400 fill-orange-400/20" />}
        </div>

        <span className="rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
          HOST
        </span>

        {reputation > 0 && <span className="text-[11px] font-medium text-white/70 drop-shadow">{reputation.toLocaleString()} rep</span>}
      </div>

      {/* 2. Live Topic Title */}
      <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-0.5">
          <Flame className="size-3 text-orange-400 fill-orange-400 animate-pulse" />
          <span>Current Hot Topic</span>
        </div>
        <p className="font-sans text-xs sm:text-sm font-semibold text-white/95 leading-snug drop-shadow line-clamp-2">
          {topicTitle ? <> &ldquo;{topicTitle}&rdquo; </> : "Waiting for the next live topic."}
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
                <span className="text-white/30 ml-2">Â·</span>
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
                <span className="text-white/30 ml-2">Â·</span>
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
