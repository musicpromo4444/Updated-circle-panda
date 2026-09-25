import { useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, MessageSquare, Send, Share2, Star } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TierBadge } from "@/components/TierBadge";
import { TimeAgo } from "@/components/TimeAgo";
import { SharePostSheet } from "@/components/feed/SharePostSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, starRating, type Post } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Deterministic pseudo-reputation for anonymous handles. */
function authorScore(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 1600;
  return h;
}

interface BurstHeart {
  id: string;
}

interface MiniHeartParticle {
  id: string;
  emoji: string;
  dx: number;
  rot: number;
  color: string;
}

export function PostCard({ post }: { post: Post }) {
  const { addReply, openPaidDm, threads } = useStore();
  const navigate = useNavigate();

  // Dialog & reply states
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  // Stable deterministic base likes for realistic feed banter
  const baseLikes = useMemo(() => {
    if (typeof post.likes === "number") return post.likes;
    let hash = 0;
    for (let i = 0; i < post.id.length; i++) {
      hash = (hash << 5) - hash + post.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 24) + 5;
  }, [post.id, post.likes]);

  // Like states
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(baseLikes);
  const [burstHearts, setBurstHearts] = useState<BurstHeart[]>([]);
  const [miniHearts, setMiniHearts] = useState<MiniHeartParticle[]>([]);
  const [isBouncing, setIsBouncing] = useState(false);

  // Double tap detection on post card
  const lastTapRef = useRef<number>(0);

  // Trigger heart animation effect
  const triggerHeartAnimation = () => {
    // 1. Center big heart burst
    const burstId = `${Date.now()}-${Math.random()}`;
    setBurstHearts((prev) => [...prev, { id: burstId }]);
    setTimeout(() => {
      setBurstHearts((prev) => prev.filter((b) => b.id !== burstId));
    }, 1000);

    // 2. Micro particle hearts floating up from the like button
    const emojis = ["❤️", "💖", "✨", "🔥", "🌸", "🐼"];
    const colors = ["#f43f5e", "#ec4899", "#fb7185", "#f97316", "#e11d48"];
    const newParticles: MiniHeartParticle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      dx: (Math.random() - 0.5) * 60,
      rot: Math.floor(Math.random() * 40) - 20,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setMiniHearts((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setMiniHearts((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 1000);

    // 3. Like button bounce
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);
  };

  // Like button click handler
  const handleLike = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
      triggerHeartAnimation();
    } else {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    }
  };

  // Double tap on card to like
  const handleCardClick = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 350;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!liked) {
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
      triggerHeartAnimation();
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/#${post.id}` : "";
    const snippet = post.body.length > 140 ? `${post.body.slice(0, 140)}…` : post.body;
    const shareText = `"${snippet}" — anonymous on Circle Panda 🐼`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Circle Panda",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }
    setShareSheetOpen(true);
  };

  const dm = () => {
    const existing = threads.find((t) => t.kind === "dm" && t.name === post.author);
    const id = openPaidDm(post.author, "From their anonymous post");
    if (!id) {
      toast.error("Not enough Panda Coins", { description: "Opening a direct chat costs 1 BC." });
      return;
    }
    toast.success(existing ? "Chat reopened" : "−1 BC · Direct chat unlocked 🪙", {
      description: "Messages cost 1 BC each. Comments stay public.",
    });
    void navigate({ to: "/messages", search: { thread: id } });
  };

  return (
    <article
      id={`post-${post.id}`}
      onClick={handleCardClick}
      className="panda-panel relative overflow-hidden rounded-2xl p-4 transition-all hover:border-border/90"
    >
      {/* Center Big Heart Burst Animation Overlay */}
      {burstHearts.map((burst) => (
        <div
          key={burst.id}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden select-none"
        >
          {/* Radial shockwave ripple */}
          <div className="animate-heart-ring-ripple absolute size-28 rounded-full border-2 border-rose-500/70 bg-rose-500/20" />

          {/* Big glowing heart */}
          <div
            className="animate-post-heart-burst absolute flex items-center justify-center"
            style={{
              filter:
                "drop-shadow(0 0 24px rgba(244, 63, 94, 0.9)) drop-shadow(0 0 50px rgba(239, 68, 68, 0.5))",
            }}
          >
            <Heart className="size-20 fill-rose-500 text-rose-500 stroke-[1.5]" />
          </div>
        </div>
      ))}

      {/* Micro-floating hearts bursting upward from the bottom action bar */}
      <div className="pointer-events-none absolute bottom-12 left-6 z-30 select-none">
        {miniHearts.map((mh) => (
          <span
            key={mh.id}
            className="animate-mini-heart-float absolute text-base font-bold"
            style={
              {
                "--dx": `${mh.dx}px`,
                "--rot": `${mh.rot}deg`,
                color: mh.color,
                filter: `drop-shadow(0 0 8px ${mh.color})`,
              } as React.CSSProperties
            }
          >
            {mh.emoji}
          </span>
        ))}
      </div>

      {/* Post Header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm">
          🐼
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">{post.author}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3 fill-current text-primary" />
            {starRating(authorScore(post.author)).toFixed(1)}
            <span aria-hidden>·</span>
            <TimeAgo at={post.at} />
          </p>
        </div>
        <TierBadge score={authorScore(post.author)} compact />
      </div>

      {/* Post Body */}
      <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap select-text">
        {post.body}
      </p>

      {/* Action Controls Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3">
        {/* Like Button with animated heart effect */}
        <Button
          id={`like-btn-${post.id}`}
          variant="ghost"
          size="sm"
          className={cn(
            "relative gap-1.5 font-medium transition-all cursor-pointer",
            liked
              ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              : "text-muted-foreground hover:text-rose-400 hover:bg-secondary/60",
          )}
          onClick={handleLike}
          aria-label={liked ? "Unlike post" : "Like post"}
        >
          <Heart
            className={cn(
              "size-4 transition-transform duration-200",
              liked && "fill-rose-500 text-rose-500",
              isBouncing && "animate-like-btn-bounce",
            )}
          />
          <span className="tabular-nums text-xs">{likeCount}</span>
        </Button>

        {/* Replies Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle replies"
        >
          <MessageSquare className="size-4" />
          <span className="text-xs">
            {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
          </span>
        </Button>

        {/* Message / Paid Direct Message Button */}
        <Button
          size="sm"
          className="gap-1.5"
          onClick={dm}
          aria-label="Open direct message with poster for 1 BC"
        >
          <MessageCircle className="size-4" />
          <span className="text-xs">Message · 1 BC</span>
        </Button>

        {/* Universal Share Button */}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleShare}
          aria-label="Share post"
        >
          <Share2 className="size-4" />
          <span className="text-xs">Share</span>
        </Button>
      </div>

      {/* Fallback bottom sheet modal with WhatsApp, X, Telegram, and Copy Link */}
      <SharePostSheet open={shareSheetOpen} onOpenChange={setShareSheetOpen} post={post} />

      {/* Public Replies Thread */}
      {open ? (
        <div className="mt-3 space-y-3 rounded-xl bg-secondary/40 p-3">
          {post.replies.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No replies yet. Be the first anonymous voice.
            </p>
          ) : (
            post.replies.map((r) => (
              <div key={r.id} className="text-sm">
                <p className="text-xs text-muted-foreground">
                  {r.author} · <TimeAgo at={r.at} />
                </p>

                <p className="mt-0.5">{r.body}</p>
              </div>
            ))
          )}
          <form
            className="flex gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              addReply(post.id, reply.trim());
              setReply("");
              toast.success("Reply posted publicly");
            }}
          >
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply publicly…"
              className="h-9"
            />
            <Button type="submit" size="sm" className="shrink-0">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
