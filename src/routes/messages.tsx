import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Database,
  Heart,
  MessageSquarePlus,
  Radio,
  Send,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeAgo } from "@/components/TimeAgo";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { subscribeToThreadMessages } from "@/lib/realtime-chat";
import { BackendSetupGuideModal } from "@/components/admin/BackendSetupGuideModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Search = { thread?: string };

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["thread"] === "string" ? { thread: search["thread"] } : {},
  head: () => ({
    meta: [
      { title: "Direct Messages — Circle Panda" },
      {
        name: "description",
        content:
          "Anonymous direct messages with real-time Supabase WebSockets. Every message sent costs 1 Panda Coin.",
      },
      { property: "og:title", content: "Direct Messages — Circle Panda" },
      {
        property: "og:description",
        content: "Realtime anonymous chats, 1 BC per message with RLS.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { threads, sendMessage, coins, appendIncomingMessage, startDmWithAuthor } = useStore();
  const { user, isSupabaseReady } = useCurrentUser();
  const search = useSearch({ from: "/messages" });
  const [activeId, setActiveId] = useState<string | null>(search.thread ?? null);
  const [draft, setDraft] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatHandle, setNewChatHandle] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (search.thread) setActiveId(search.thread);
  }, [search.thread]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  // Real-time WebSocket subscription for active chat thread
  useEffect(() => {
    if (!activeId) return;
    const unsub = subscribeToThreadMessages(activeId, user?.id, (newMsg) => {
      appendIncomingMessage(activeId, newMsg);
    });
    return () => unsub();
  }, [activeId, appendIncomingMessage, user?.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length]);

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = newChatHandle.trim();
    if (!handle) {
      toast.error("Please enter a Panda handle or name");
      return;
    }
    const newId = startDmWithAuthor(handle, "Started direct message");
    setActiveId(newId);
    setShowNewChatModal(false);
    setNewChatHandle("");
    toast.success(`Chat started with ${handle}`);
  };

  if (!active) {
    return (
      <AppShell
        title="Direct Messages"
        subtitle="Real-time WebSockets & Row-Level Security · 1 BC per message sent."
      >
        {/* Backend Realtime & Security Status Card */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl text-xs",
                isSupabaseReady
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-500 border border-amber-500/30",
              )}
            >
              <Radio className={cn("size-4", isSupabaseReady && "animate-pulse")} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-xs font-bold text-foreground">
                  {isSupabaseReady ? "PostgreSQL Realtime Active" : "Local Storage Mode"}
                </p>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider",
                    isSupabaseReady
                      ? "bg-emerald-500/20 text-emerald-500"
                      : "bg-amber-500/20 text-amber-500",
                  )}
                >
                  {isSupabaseReady ? "Supabase Connected" : "Prototype"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isSupabaseReady
                  ? "Messages broadcast live across clients. RLS restricts access to thread members."
                  : "Messages stored locally. Connect Supabase credentials to enable multi-device sync."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="h-8 gap-1.5 rounded-xl text-xs"
            >
              <Database className="size-3.5" /> Backend Guide
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNewChatModal(true)}
              className="h-8 gap-1.5 rounded-xl text-xs font-bold"
            >
              <MessageSquarePlus className="size-3.5" /> New Chat
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {threads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center">
              <Users className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-display font-semibold text-foreground">No active chats yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Start a conversation with an anonymous Panda or match from the Dating tab.
              </p>
              <Button
                size="sm"
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 rounded-xl text-xs gap-1.5"
              >
                <MessageSquarePlus className="size-3.5" /> Start First Chat
              </Button>
            </div>
          ) : (
            threads.map((t, idx) => (
              <div key={t.id} className="space-y-3">
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className="panda-panel flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-accent/40 cursor-pointer"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-lg">
                    {t.kind === "dating" ? "💗" : "🐼"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{t.name}</span>
                      {t.kind === "dating" ? (
                        <span className="rounded-full bg-[var(--dating)]/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--dating)] uppercase">
                          Dating
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {t.messages.at(-1)?.body ?? t.blurb}
                    </span>
                  </span>
                  {t.messages.length ? (
                    <TimeAgo
                      at={t.messages.at(-1)!.at}
                      className="shrink-0 text-[11px] text-muted-foreground"
                    />
                  ) : null}
                </button>
                {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} /> : null}
              </div>
            ))
          )}
        </div>

        {/* New Chat Modal */}
        <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
          <DialogContent className="sm:max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
                <MessageSquarePlus className="size-5 text-primary" /> Start Anonymous Chat
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter an anonymous Panda handle to begin a 1-on-1 direct message.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateNewChat} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Panda Handle</label>
                <Input
                  placeholder="e.g. Midnight Bamboo, Silent Sprout"
                  value={newChatHandle}
                  onChange={(e) => setNewChatHandle(e.target.value)}
                  className="rounded-xl"
                  autoFocus
                  required
                />
              </div>

              <div className="rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
                Each message sent costs 1 Panda Coin (BC). Messages are delivered in real time.
              </div>

              <Button type="submit" className="w-full rounded-xl font-bold">
                Open Chat Thread
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <BackendSetupGuideModal open={showGuide} onOpenChange={setShowGuide} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Chat" subtitle={`Balance: ${coins} BC · each message costs 1 BC`}>
      <div className="panda-panel overflow-hidden rounded-2xl">
        {active.kind === "dating" ? (
          <div className="flex items-center justify-center gap-2 bg-[var(--dating)] px-4 py-2 font-display text-sm font-bold tracking-[0.18em] text-[var(--dating-foreground)] uppercase">
            <Heart className="size-4 fill-current" /> Dating Chat
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 cursor-pointer"
            onClick={() => setActiveId(null)}
          >
            <ChevronLeft className="size-4" /> All
          </Button>
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-sm">
            {active.kind === "dating" ? "💗" : "🐼"}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{active.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{active.blurb}</p>
          </div>

          {/* Realtime Status Indicator Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold select-none",
                isSupabaseReady
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-500 border border-amber-500/30",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isSupabaseReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
                )}
              />
              {isSupabaseReady ? "Realtime Active" : "Prototype"}
            </span>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              title="View Realtime & Database Setup Guide"
              className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
            >
              <Database className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] min-h-48 space-y-2.5 overflow-y-auto bg-secondary/20 p-3">
          {active.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Say something first. It costs 1 BC.
            </p>
          ) : (
            active.messages.map((m, idx) => (
              <div key={m.id} className="space-y-2.5">
                <div className={m.mine ? "text-right" : ""}>
                  <p
                    className={`inline-block max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.mine
                        ? active.kind === "dating"
                          ? "bg-[var(--dating)] text-[var(--dating-foreground)]"
                          : "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground shadow-xs border border-border/40"
                    }`}
                  >
                    {m.body}
                  </p>
                  <TimeAgo at={m.at} className="mt-0.5 block text-[10px] text-muted-foreground" />
                </div>

                {/* Standard Banner Ad after every sequence of 4 chat messages */}
                {(idx + 1) % 4 === 0 ? (
                  <div className="py-1">
                    <StandardBannerAd index={Math.floor(idx / 4)} className="mx-auto max-w-md" />
                  </div>
                ) : null}
              </div>
            ))
          )}
          <div ref={bottom} />
        </div>

        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            sendMessage(active.id, draft.trim());
            setDraft("");
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message (1 BC)…"
            className="rounded-xl"
          />
          <Button type="submit" className="shrink-0 rounded-xl cursor-pointer">
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      <BackendSetupGuideModal open={showGuide} onOpenChange={setShowGuide} />
    </AppShell>
  );
}
