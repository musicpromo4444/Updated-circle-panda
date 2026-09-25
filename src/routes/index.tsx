import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Lock, Sparkles, ShieldCheck, Heart, MessageCircle, PenLine, Flame, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { CrushTray } from "@/components/CrushTray";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { PostCard } from "@/components/feed/PostCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Circle Panda — Secret Confessions 🤫 & Panda Coins" },
      {
        name: "description",
        content:
          "A safe space to post your secrets and most troubled thoughts, without getting JUDGED 🤷‍♂️. Share your confessions anonymously.",
      },
      { property: "og:title", content: "Circle Panda — Secret Confessions 🤫" },
      {
        property: "og:description",
        content:
          "Share your thoughts, secrets, stories, worries or random confessions anonymously. No judgment. Just let it out. ❤️",
      },
    ],
  }),
  component: FeedPage,
});

const INSPIRATION_PROMPTS = [
  "Late night thought 🌙",
  "Unspoken crush 💌",
  "Guilty habit 🙈",
  "Deep & real 💭",
  "Random confession ☕",
];

export function FeedPage() {
  const { posts, addPost } = useStore();
  const [draft, setDraft] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [filter, setFilter] = useState<"all" | "supported" | "discussed">("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when composer opens
  useEffect(() => {
    if (isComposing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isComposing]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    addPost(draft.trim());
    setDraft("");
    setIsComposing(false);
  };

  // Safe non-destructive filtering for community exploration
  const sortedPosts = [...posts].sort((a, b) => {
    if (filter === "supported") {
      return (b.likes || 0) - (a.likes || 0);
    }
    if (filter === "discussed") {
      return b.replies.length - a.replies.length;
    }
    return 0; // Default chronological order from store
  });

  return (
    <AppShell
      title="Secret Confessions 🤫"
      subtitle={
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/90">
            A safe space to post your secrets and most troubled thoughts, without getting JUDGED 🤷‍♂️.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Share your thoughts, secrets, stories, worries or random confessions anonymously. No
            judgment. Just let it out. ❤️
          </p>
        </div>
      }
    >
      {/* WCW & MCM story section - preserved intact */}
      <CrushTray />

      {/* Secret Confessions Posting Experience */}
      <section className="panda-panel mb-5 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-background p-4.5 shadow-sm transition-all">
        {/* Posting Introduction (Requirement 3) */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="space-y-0.5">
            <h2 className="font-display text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>Your words. Your secret. Your choice.</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Post anonymously and let it off your chest. 🤫
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Sparkles className="size-3" /> Posting is free · messages cost 1 BC
          </span>
        </div>

        {/* Collapsed State: Welcoming Invitation Bar */}
        {!isComposing ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              className="flex-1 cursor-pointer rounded-xl border border-border/80 bg-secondary/40 px-3.5 py-3 text-left text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-secondary/70 flex items-center justify-between"
            >
              <span>Write your confession here… nobody needs to know it&apos;s you.</span>
              <PenLine className="size-3.5 text-muted-foreground/70 shrink-0" />
            </button>
            <Button
              type="button"
              onClick={() => setIsComposing(true)}
              className="h-10 rounded-xl px-4 gap-2 font-semibold shadow-xs active:scale-95 shrink-0"
            >
              <Lock className="size-4" /> Share a Secret 🤫
            </Button>
          </div>
        ) : (
          /* Expanded Confession Composer (Requirements 4 & 5) */
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="confession-input"
                className="font-display text-sm font-bold text-foreground flex items-center gap-1.5"
              >
                What have you been keeping to yourself?
              </label>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Collapse composer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {INSPIRATION_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (!draft.includes(prompt)) {
                      setDraft((prev) => (prev ? `${prev} · ${prompt}: ` : `${prompt}: `));
                    }
                  }}
                  className="rounded-full border border-border/70 bg-secondary/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <Textarea
              id="confession-input"
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your confession here… nobody needs to know it's you."
              className="min-h-28 resize-none rounded-xl border-border/80 bg-background/80 p-3 text-sm text-foreground shadow-inner focus-visible:ring-1 focus-visible:ring-primary"
            />

            {/* Anonymity Reassurance (Requirement 5) */}
            <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
              <span>
                Your confession is posted anonymously. Please don&apos;t include passwords, phone
                numbers, addresses or other private information.
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                Posting is free · messages cost 1 BC
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => setIsComposing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!draft.trim()}
                  className="h-9 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 gap-1.5"
                >
                  <Lock className="size-3.5" /> Post My Confession
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Secret Confessions Community Header & Filter Bar (Requirement 6) */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold text-foreground">Community Confessions</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {posts.length} {posts.length === 1 ? "secret" : "secrets"}
          </span>
        </div>

        {/* Community Vibe Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Latest Secrets
          </button>
          <button
            type="button"
            onClick={() => setFilter("supported")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              filter === "supported"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className="size-3" /> Most Loved
          </button>
          <button
            type="button"
            onClick={() => setFilter("discussed")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              filter === "discussed"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageCircle className="size-3" /> Active Threads
          </button>
        </div>
      </div>

      {/* Confession Cards Feed */}
      <div className="space-y-4">
        {sortedPosts.map((p, idx) => (
          <div key={p.id} className="space-y-4">
            <PostCard post={p} />
            {/* Standard banner advertisement after every sequence of 4 posts */}
            {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} /> : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
