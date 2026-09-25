import { Check, Gift, Heart, MessageCircle, Plus, Share2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

export function FloatingActionColumn({
  likeCount,
  commentCount,
  isFollowing,
  onToggleFollow,
  onOpenHostProfile,
  onLike,
  onOpenComments,
  onOpenGifts,
  onShare,
}: {
  likeCount: number;
  commentCount: number;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onOpenHostProfile: () => void;
  onLike: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenComments: () => void;
  onOpenGifts: () => void;
  onShare: () => void;
}) {
  const { coins } = useStore();
  const [heartPulsing, setHeartPulsing] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
  };

  const handleHeartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setHeartPulsing(true);
    setTimeout(() => setHeartPulsing(false), 300);
    onLike(e);
  };

  return (
    <div
      id="hot-sit-floating-action-bar"
      className="absolute right-3.5 bottom-24 sm:bottom-20 z-30 flex flex-col items-center gap-4 select-none pointer-events-auto"
    >
      {/* 1. Profile/Host Icon (Shows host avatar with a "+" follow button) */}
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          onClick={onOpenHostProfile}
          aria-label="View host Midnight Panda profile"
          className="relative grid size-12 place-items-center rounded-full border-2 border-orange-500/80 bg-neutral-900 text-2xl shadow-[0_0_20px_rgba(234,88,12,0.45)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          🐼
        </button>

        {/* Plus / Follow badge positioned over the bottom of the avatar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFollow();
          }}
          aria-label={isFollowing ? "Following host" : "Follow host"}
          className={`absolute -bottom-2 z-10 grid size-5 place-items-center rounded-full text-[10px] font-black text-white shadow-md transition-all cursor-pointer ${
            isFollowing
              ? "bg-emerald-600 scale-100 ring-2 ring-neutral-900"
              : "bg-red-600 hover:bg-red-500 hover:scale-110 active:scale-90"
          }`}
        >
          {isFollowing ? (
            <Check className="size-3 stroke-[3]" />
          ) : (
            <Plus className="size-3.5 stroke-[3]" />
          )}
        </button>
      </div>

      {/* 2. Heart/Like Icon (Displays real-time like count with floating heart animation on tap) */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label="Like Hot Sit live stream"
          className={`grid size-12 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md shadow-lg transition-transform hover:bg-black/65 cursor-pointer ${
            heartPulsing ? "scale-125" : "hover:scale-105 active:scale-90"
          }`}
        >
          <Heart
            className={`size-6 transition-colors ${
              heartPulsing ? "text-red-500 fill-red-500" : "text-white fill-white/10"
            }`}
          />
        </button>
        <span className="font-display text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tabular-nums">
          {formatNumber(likeCount)}
        </span>
      </div>

      {/* 3. Comments Icon (Displays comment count; opens live chat overlay drawer) */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onOpenComments}
          aria-label="Open live comments and questions"
          className="grid size-12 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md shadow-lg transition-transform hover:scale-105 hover:bg-black/65 active:scale-90 cursor-pointer"
        >
          <MessageCircle className="size-6 text-white" />
        </button>
        <span className="font-display text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tabular-nums">
          {commentCount}
        </span>
      </div>

      {/* 4. Gift/Black Coins Icon (Opens low-balance/rewarded ad pop-up or gift drawer) */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onOpenGifts}
          aria-label="Send gift or get Black Coins"
          className="relative grid size-12 place-items-center rounded-full border border-amber-500/50 bg-black/45 text-amber-400 backdrop-blur-md shadow-[0_0_16px_rgba(245,158,11,0.25)] transition-transform hover:scale-105 hover:bg-black/65 active:scale-90 cursor-pointer"
        >
          <Gift className="size-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          {/* Subtle glowing dot */}
          <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-400 animate-ping pointer-events-none" />
        </button>
        <span className="font-display text-[11px] font-bold text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          Gift
        </span>
      </div>

      {/* 5. Universal Share Icon (Triggers native share sheet / fallback share modal) */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onShare}
          aria-label="Share Hot Sit live stream"
          className="grid size-12 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md shadow-lg transition-transform hover:scale-105 hover:bg-black/65 active:scale-90 cursor-pointer"
        >
          <Share2 className="size-5.5 text-white" />
        </button>
        <span className="font-display text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          Share
        </span>
      </div>
    </div>
  );
}
