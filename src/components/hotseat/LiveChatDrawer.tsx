import { useState } from "react";
import {
  ArrowUp,
  ExternalLink,
  Flame,
  Gamepad2,
  MessageCircle,
  Mic2,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type HotSeatQuestion = {
  id: string;
  alias: string;
  body: string;
  age: string;
  votes: number;
  priority: boolean;
  status: "waiting" | "answered" | "flagged";
  answer?: string;
};

export type LiveChatMessage = {
  id: string;
  user: string;
  text: string;
  isGift?: boolean;
  time: string;
};

export interface InFeedAd {
  id: string;
  sponsorName: string;
  icon: string;
  headline: string;
  description: string;
  tagline: string;
  cta: string;
  type?: "playable" | "static";
}

const IN_FEED_ADS: InFeedAd[] = [
  {
    id: "ad-playable-bamboo-dash",
    sponsorName: "Bamboo Rush 3D",
    icon: "🎮",
    headline: "Play Interactive Mini-Challenge",
    description:
      "Tap to test your campus reflexes in this instant 30-second playable demo and unlock 100 free Panda Coins! No install required.",
    tagline: "Sponsored Playable Experience · Instant Demo",
    cta: "Play Now",
    type: "playable",
  },
  {
    id: "ad-vip-pass",
    sponsorName: "Circle Panda VIP",
    icon: "👑",
    headline: "Skip the 24-Hour Hot Sit Queue",
    description:
      "Get instant priority pin for your anonymous questions, gold avatar glow, and 2x Panda Coin multipliers on every live stream.",
    tagline: "circlepanda.app/vip",
    cta: "Learn More",
    type: "static",
  },
  {
    id: "ad-playable-trivia",
    sponsorName: "Campus Trivia Arena",
    icon: "🎯",
    headline: "Live 60s Anonymity Trivia",
    description:
      "Answer 3 quick campus questions in real-time to win sponsored Panda Coins & stream badges.",
    tagline: "Playable Sponsor Demo · Tap to Start",
    cta: "Play Now",
    type: "playable",
  },
  {
    id: "ad-black-coins",
    sponsorName: "Black Coin Vault",
    icon: "🪙",
    headline: "Stack Black Coins & Send Stream Gifts",
    description:
      "Support hosts with animated bamboo gifts and guarantee answers to your burning questions before time runs out.",
    tagline: "Official Coin Store",
    cta: "Learn More",
    type: "static",
  },
];

export function LiveChatDrawer({
  open,
  onOpenChange,
  questions,
  chatMessages,
  onAskQuestion,
  onSendChatMessage,
  onUpvoteQuestion,
  onAnswerQuestion,
  adminMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: HotSeatQuestion[];
  chatMessages: LiveChatMessage[];
  onAskQuestion: (body: string, priority: boolean) => void;
  onSendChatMessage: (text: string) => void;
  onUpvoteQuestion: (id: string) => void;
  onAnswerQuestion?: (id: string, answer: string) => void;
  adminMode?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"questions" | "chat">("questions");
  const [inputQuestion, setInputQuestion] = useState("");
  const [inputChat, setInputChat] = useState("");
  const [priorityBoost, setPriorityBoost] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;
    onAskQuestion(inputQuestion.trim(), priorityBoost);
    setInputQuestion("");
    setPriorityBoost(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputChat.trim()) return;
    onSendChatMessage(inputChat.trim());
    setInputChat("");
  };

  const handleHostAnswerSubmit = (id: string) => {
    if (!answerDraft.trim() || !onAnswerQuestion) return;
    onAnswerQuestion(id, answerDraft.trim());
    setAnsweringId(null);
    setAnswerDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg fixed inset-x-0 bottom-0 top-auto m-0 w-full translate-x-0 translate-y-0 max-h-[85vh] h-[80vh] flex flex-col rounded-t-3xl border-t border-white/15 bg-neutral-950/98 text-white backdrop-blur-2xl p-0 shadow-2xl overflow-hidden [&>button.absolute]:hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-neutral-900 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "questions"
                    ? "bg-orange-500 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Questions ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-orange-500 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Live Stream Chat ({chatMessages.length})
              </button>
            </div>
          </div>

          {/* Single clean close icon positioned neatly at top-right */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close drawer"
            className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "questions" ? (
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const isEvery5 = (idx + 1) % 5 === 0;
                const adIndex = Math.floor(idx / 5) % IN_FEED_ADS.length;
                const ad = IN_FEED_ADS[adIndex];

                return (
                  <div key={q.id} className="space-y-3">
                    {/* Question Card */}
                    <div
                      className={`rounded-2xl border p-3.5 transition-all ${
                        q.priority
                          ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                          : "border-white/10 bg-neutral-900/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="grid size-6 place-items-center rounded-full bg-neutral-800 text-xs">
                            🐼
                          </span>
                          <span className="font-semibold text-white">{q.alias}</span>
                          <span className="text-[11px] text-neutral-400">· {q.age}</span>
                          {q.priority && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                              <Sparkles className="size-2.5" /> Priority
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onUpvoteQuestion(q.id)}
                          className="flex items-center gap-1 rounded-full border border-white/10 bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:text-orange-400 hover:border-orange-500/40 transition-all cursor-pointer"
                        >
                          <ArrowUp className="size-3" />
                          <span>{q.votes}</span>
                        </button>
                      </div>

                      <p className="mt-2 text-sm text-neutral-200 leading-relaxed">{q.body}</p>

                      {q.answer && (
                        <div className="mt-2.5 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs">
                          <p className="flex items-center gap-1 font-bold text-primary mb-1 uppercase text-[10px] tracking-wider">
                            <MessageCircle className="size-3" /> Midnight Panda replied
                          </p>
                          <p className="text-neutral-200">{q.answer}</p>
                        </div>
                      )}

                      {adminMode && !q.answer && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          {answeringId === q.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={answerDraft}
                                onChange={(e) => setAnswerDraft(e.target.value)}
                                placeholder="Type host answer..."
                                className="flex-1 rounded-lg border border-white/15 bg-black px-3 py-1.5 text-xs text-white outline-none"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleHostAnswerSubmit(q.id)}
                                className="h-8 bg-orange-600 text-xs font-bold"
                              >
                                Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setAnsweringId(null)}
                                className="h-8 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAnsweringId(q.id);
                                setAnswerDraft("");
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:underline"
                            >
                              <Mic2 className="size-3" /> Answer as Host
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dynamically inserted native ad card after every 5 questions */}
                    {isEvery5 && (
                      <div
                        id={`in-feed-ad-${idx + 1}`}
                        className="rounded-2xl border border-white/10 bg-neutral-900/85 p-3.5 transition-all hover:border-amber-500/30 relative overflow-hidden"
                      >
                        {/* Header with SPONSORED / AD badge in place of user handle */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="grid size-6 place-items-center rounded-full bg-amber-500/20 text-xs border border-amber-500/30">
                              {ad.icon}
                            </span>
                            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                              SPONSORED
                            </span>
                            <span className="font-semibold text-white">{ad.sponsorName}</span>
                            <span className="text-[11px] text-neutral-400">· Promoted</span>
                          </div>

                          <span className="rounded border border-white/15 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                            AD
                          </span>
                        </div>

                        {/* Ad Headline and Description */}
                        <div className="mt-2.5">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {ad.headline}
                          </h4>
                          <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                            {ad.description}
                          </p>
                        </div>

                        {/* Ad CTA footer */}
                        <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                          <span className="text-[11px] text-neutral-400">{ad.tagline}</span>
                          <button
                            type="button"
                            onClick={() => {
                              toast.info(`Opening ${ad.sponsorName}...`, {
                                description: "Redirecting to sponsored partner.",
                              });
                            }}
                            className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                          >
                            <span>{ad.cta}</span>
                            <ExternalLink className="size-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {chatMessages.map((msg, idx) => {
                const isEvery10 = (idx + 1) % 10 === 0;
                const adIndex = Math.floor(idx / 10) % IN_FEED_ADS.length;
                const ad = IN_FEED_ADS[adIndex];

                return (
                  <div key={msg.id} className="space-y-2.5">
                    {/* Live Chat Message */}
                    <div
                      className={`flex items-start gap-2.5 rounded-xl p-2.5 text-xs transition-colors ${
                        msg.isGift
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-200 shadow-sm"
                          : "bg-neutral-900/60 text-neutral-200 border border-white/5 hover:border-white/10"
                      }`}
                    >
                      <span className="font-bold text-neutral-400 shrink-0">{msg.user}:</span>
                      <span className="flex-1 leading-relaxed">{msg.text}</span>
                      <span className="text-[10px] text-neutral-500 shrink-0 self-center">
                        {msg.time}
                      </span>
                    </div>

                    {/* Dynamically inserted styled banner ad after every 10 live chat messages */}
                    {isEvery10 && (
                      <div
                        id={`chat-in-feed-ad-${idx + 1}`}
                        className="my-3 rounded-2xl border border-white/15 bg-gradient-to-br from-neutral-900/95 via-neutral-900/85 to-neutral-950 p-3.5 shadow-xl relative overflow-hidden backdrop-blur-md transition-all hover:border-amber-500/40"
                      >
                        {/* Header with prominent SPONSORED badge matching dark aesthetic */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="grid size-7 place-items-center rounded-full bg-amber-500/20 text-sm border border-amber-500/30">
                              {ad.icon}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                <Sparkles className="size-2.5" />
                                SPONSORED
                              </span>
                              <span className="font-bold text-white text-xs">{ad.sponsorName}</span>
                            </div>
                          </div>

                          <span className="rounded border border-white/15 bg-neutral-800/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-400">
                            {ad.type === "playable" ? "PLAYABLE" : "AD"}
                          </span>
                        </div>

                        {/* Ad Headline and Description */}
                        <div className="mt-2.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            {ad.headline}
                          </h4>
                          <p className="mt-1 text-[11px] sm:text-xs text-neutral-300 leading-relaxed">
                            {ad.description}
                          </p>
                        </div>

                        {/* CTA Footer with clear Call-To-Action button */}
                        <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                          <span className="text-[11px] text-neutral-400 truncate max-w-[130px] sm:max-w-none">
                            {ad.tagline}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (ad.type === "playable") {
                                toast.success(`🎮 Launching ${ad.sponsorName} playable demo...`, {
                                  description:
                                    "Try the mini-game challenge and claim bonus Panda Coins!",
                                });
                              } else {
                                toast.info(`Opening ${ad.sponsorName}...`, {
                                  description: "Redirecting to sponsored partner.",
                                });
                              }
                            }}
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                              ad.type === "playable"
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                : "bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                            }`}
                          >
                            <span>{ad.cta}</span>
                            {ad.type === "playable" ? (
                              <Gamepad2 className="size-3.5" />
                            ) : (
                              <ExternalLink className="size-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Bottom Input */}
        <div className="border-t border-white/10 bg-neutral-950 p-3 shrink-0">
          {activeTab === "questions" ? (
            <form onSubmit={handleQuestionSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  placeholder="Ask the host anonymously (max 280 chars)..."
                  maxLength={280}
                  className="flex-1 rounded-xl border border-white/15 bg-neutral-900 px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-orange-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputQuestion.trim()}
                  className="gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-2 text-xs font-bold text-white shadow hover:opacity-95"
                >
                  <Send className="size-3.5" /> Ask
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priorityBoost}
                    onChange={(e) => setPriorityBoost(e.target.checked)}
                    className="accent-orange-500"
                  />
                  <span>Boost with Priority (25 BC)</span>
                </label>
                <span>{inputQuestion.length}/280 · Anonymous</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputChat}
                onChange={(e) => setInputChat(e.target.value)}
                placeholder="Say something nice in live chat..."
                maxLength={120}
                className="flex-1 rounded-xl border border-white/15 bg-neutral-900 px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-orange-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputChat.trim()}
                className="gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-orange-500"
              >
                <Send className="size-3.5" /> Send
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
