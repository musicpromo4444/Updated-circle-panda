import { Clock3, Flame, Lock, ShieldCheck, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function HostProfileModal({
  open,
  onOpenChange,
  windowSeconds,
  isFollowing,
  onToggleFollow,
  onOpenWaitingRoom,
  hostName = "",
  reputation = 0,
  location = "",
  answeredCount = 0,
  viewerCount = 0,
  topic = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windowSeconds: number;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onOpenWaitingRoom: () => void;
  hostName?: string;
  reputation?: number;
  location?: string;
  answeredCount?: number;
  viewerCount?: number;
  topic?: string;
}) {
  const formatTimer = (totalSeconds: number) => {
    const seconds = Math.max(0, totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return [hours, minutes, rest].map((v) => String(v).padStart(2, "0")).join(":");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-neutral-950/95 text-white backdrop-blur-2xl p-6 shadow-2xl">
        <DialogHeader className="relative text-center sm:text-center pb-2">
          {/* Avatar Hero */}
          <div className="mx-auto relative flex size-20 items-center justify-center rounded-2xl border-2 border-orange-500/70 bg-neutral-900 text-4xl shadow-[0_0_30px_rgba(234,88,12,0.4)] mb-3">
            🐼
            {hostName ? <span className="absolute -bottom-2 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
              LIVE HOST
            </span> : null}
          </div>

          <DialogTitle className="font-display text-2xl font-bold text-white flex items-center justify-center gap-1.5">
            {hostName || "Hot Seat"}
            {hostName ? <ShieldCheck className="size-5 text-orange-400 fill-orange-400/20" /> : null}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Panda Host{reputation ? ` · ${reputation.toLocaleString()} Reputation` : ""}{location ? ` · ${location}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-2">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Time Left
            </p>
            <p className="mt-1 font-display text-sm font-bold text-orange-400 tabular-nums">
              {formatTimer(windowSeconds)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Answered
            </p>
            <p className="mt-1 font-display text-base font-bold text-white">{answeredCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Viewers
            </p>
            <p className="mt-1 font-display text-base font-bold text-emerald-400">{viewerCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Host Bio & Topic */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-3.5 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-orange-300 uppercase tracking-wider text-[10px]">
            <Flame className="size-3.5" /> Current Hot Topic
          </div>
          <p className="text-sm font-medium text-neutral-200">
            {topic ? `“${topic}”` : "No live topic has been published yet."}
          </p>
          <p className="text-[11px] text-neutral-400">
            {hostName ? "Host has a strict 2-minute SLA to reply to upvoted anonymous community questions." : "A live host profile will appear here when the next Hot Seat session starts."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Button
            variant="outline"
            onClick={onToggleFollow}
            className={`rounded-xl border-white/20 font-bold transition-all cursor-pointer ${
              isFollowing
                ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-600/30"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            {isFollowing ? "✓ Following Host" : "+ Follow Host"}
          </Button>

          <Button
            onClick={() => {
              onOpenChange(false);
              onOpenWaitingRoom();
            }}
            className="gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 font-bold text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] hover:opacity-95 cursor-pointer"
          >
            <Flame className="size-4" />
            Sit on Hot Seat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
