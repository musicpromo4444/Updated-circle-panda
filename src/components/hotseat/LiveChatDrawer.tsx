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
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";

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
                            <MessageCircle className="size-3" /> Host replied
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

                    {/* Admin-configured ad after every 5 questions */}
                    {isEvery5 ? <StandardBannerAd variant="feed-card" placement="hot_seat_questions" /> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {chatMessages.map((msg, idx) => {
                const isEvery5 = (idx + 1) % 5 === 0;

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

                    {/* Admin-configured ad after every 5 comments */}
                    {isEvery5 ? <StandardBannerAd variant="feed-card" placement="hot_seat_comments" /> : null}
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
