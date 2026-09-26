import { Link } from "@tanstack/react-router";
import { Crown, Plus } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { CrushSubmissionDialog } from "@/components/CrushSubmissionDialog";

/** Round, tappable MCM/WCW story row for the Circle Panda home feed. */
export function CrushTray() {
  const { nominees } = useStore();
  const [composeOpen, setComposeOpen] = useState(false);
  const ranked = [...nominees].filter((n) => n.mediaUrl).sort((a, b) => b.votes - a.votes);

  return (
    <>
      <section className="panda-panel mb-4 overflow-hidden rounded-2xl p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Crown className="size-4 text-[var(--coin)]" />
          <h2 className="font-display text-sm font-bold">MCM & WCW</h2>
          <Link to="/crush" className="ml-auto text-[11px] font-semibold text-primary">Open</Link>
        </div>
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
          <button type="button" onClick={() => setComposeOpen(true)} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
            <span className="relative grid size-[66px] place-items-center rounded-full border-4 border-primary bg-secondary shadow-[0_0_0_2px_hsl(var(--background))]">
              <Plus className="size-8 text-primary" strokeWidth={2.7} />
              <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">+</span>
            </span>
            <span className="text-[11px] font-bold">Add yours</span>
          </button>
          {ranked.map((n) => (
            <Link key={n.id} to="/crush" className="flex w-[72px] shrink-0 flex-col items-center gap-1.5" aria-label={`Open ${n.kind === "wcw" ? "WCW" : "MCM"} picture`}>
              <span className={`relative grid size-[66px] place-items-center overflow-hidden rounded-full border-4 shadow-[0_0_0_2px_hsl(var(--background))] ${n.kind === "wcw" ? "border-[var(--dating)]" : "border-primary"}`}>
                {n.mediaType === "video" ? <span className="text-2xl">▶️</span> : n.mediaUrl ? <img src={n.mediaUrl} alt="" className="size-full object-cover" /> : <span className="text-2xl">{n.emoji}</span>}
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold text-muted-foreground">{n.kind === "wcw" ? "WCW" : "MCM"}</span>
            </Link>
          ))}
        </div>
      </section>
      <CrushSubmissionDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </>
  );
}
