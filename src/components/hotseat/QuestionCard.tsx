import { useState } from "react";
import { AudioLines, Image as ImageIcon, Lock, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUnlockModal } from "@/components/hotseat/MediaUnlockModal";
import type { AnswerRow, QuestionRow } from "@/lib/hotseat";
import { cn } from "@/lib/utils";

function AnswerBody({ answer, unlocked }: { answer: AnswerRow; unlocked: boolean }) {
  if (answer.kind === "text") {
    return <p className="text-sm">{answer.body}</p>;
  }
  if (!unlocked) return null;
  if (answer.kind === "voice") {
    return (
      <div className="space-y-2">
        <div className="flex items-end gap-0.5">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-primary/70"
              style={{ height: `${6 + ((i * 7) % 22)}px` }}
            />
          ))}
        </div>
        {answer.media_url ? (
          <audio src={answer.media_url} controls autoPlay className="w-full" />
        ) : null}
      </div>
    );
  }
  if (answer.kind === "photo") {
    return answer.media_url ? (
      <img src={answer.media_url} alt="Host reply" className="w-full rounded-xl object-cover" />
    ) : null;
  }
  return answer.media_url ? (
    <video src={answer.media_url} className="w-full rounded-xl" autoPlay playsInline controls />
  ) : null;
}

function LockedPreview({ kind, onUnlock }: { kind: AnswerRow["kind"]; onUnlock: () => void }) {
  const Icon = kind === "voice" ? AudioLines : kind === "photo" ? ImageIcon : Video;
  const label = kind === "voice" ? "Voice note" : kind === "photo" ? "Photo" : "Video";
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70">
      <div className="grid h-32 place-items-center bg-gradient-to-br from-secondary to-secondary/40 blur-[2px]">
        <Icon className="size-10 text-muted-foreground" />
      </div>
      <div className="absolute inset-0 grid place-items-center gap-2 bg-background/50 p-3 backdrop-blur-sm">
        <p className="text-center text-xs text-muted-foreground">{label} · view once</p>
        <Button size="sm" className="gap-1.5" onClick={onUnlock}>
          <Lock className="size-3.5" /> Unlock View-Once Media
        </Button>
      </div>
    </div>
  );
}

export function QuestionCard({ question }: { question: QuestionRow }) {
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card/70 p-4 backdrop-blur",
        question.is_priority
          ? "border-[var(--coin)]/70 shadow-[0_0_25px_hsl(var(--coin)/0.18)]"
          : "border-border/70",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">{question.asker_alias}</span>
        {question.is_priority ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--coin)]/50 px-2 py-0.5 font-semibold text-[var(--coin)]">
            <Sparkles className="size-3" /> Priority
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 font-display text-base">{question.body}</p>

      <div className="mt-3 space-y-3">
        {question.hot_seat_answers.map((a) => (
          <div key={a.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Host reply
            </p>
            {a.kind !== "text" && !unlocked[a.id] ? (
              <LockedPreview kind={a.kind} onUnlock={() => setPending(a.id)} />
            ) : (
              <AnswerBody answer={a} unlocked />
            )}
          </div>
        ))}
        {question.hot_seat_answers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Waiting on the host…</p>
        ) : null}
      </div>

      <MediaUnlockModal
        open={pending !== null}
        onOpenChange={(o) => (!o ? setPending(null) : null)}
        onUnlocked={() => {
          if (pending) setUnlocked((u) => ({ ...u, [pending]: true }));
        }}
      />
    </article>
  );
}
