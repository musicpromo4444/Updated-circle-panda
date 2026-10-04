import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Crown, Plus, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { CrushSubmissionDialog } from "@/components/CrushSubmissionDialog";

/** Round, tappable MCM/WCW story row for the Circle Panda home feed. */
export function CrushTray() {
  const { nominees } = useStore();
  const navigate = useNavigate();
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const ranked = [...nominees].filter((n) => n.mediaUrl).sort((a, b) => b.votes - a.votes);
  const viewerItem = viewerIndex === null ? null : ranked[viewerIndex] ?? null;
  const closeViewer = () => setViewerIndex(null);
  const previousViewer = () => setViewerIndex((value) => value === null || !ranked.length ? value : (value - 1 + ranked.length) % ranked.length);
  const nextViewer = () => setViewerIndex((value) => value === null || !ranked.length ? value : (value + 1) % ranked.length);

  return (
    <>
      <section className="panda-panel mb-4 overflow-hidden rounded-2xl p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Crown className="size-4 text-[var(--coin)]" />
          <h2 className="font-display text-sm font-bold">MCM & WCW</h2>
          <Link to="/crush" search={{ kind: ranked[0]?.kind ?? "wcw" }} className="ml-auto text-[11px] font-semibold text-primary">Open</Link>
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
            <button key={n.id} type="button" onClick={() => setViewerIndex(ranked.findIndex((item) => item.id === n.id))} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5" aria-label={`Open ${n.kind === "wcw" ? "WCW" : "MCM"} picture`}>
              <span className={`relative grid size-[66px] place-items-center overflow-hidden rounded-full border-4 shadow-[0_0_0_2px_hsl(var(--background))] ${n.kind === "wcw" ? "border-[var(--dating)]" : "border-primary"}`}>
                {n.mediaType === "video" ? <span className="text-2xl">▶️</span> : n.mediaUrl ? <img src={n.mediaUrl} alt="" className="size-full object-cover" /> : <span className="text-2xl">{n.emoji}</span>}
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold text-muted-foreground">{n.kind === "wcw" ? "WCW" : "MCM"}</span>
            </button>
          ))}
        </div>
      </section>
      {viewerItem ? (
        <div className="fixed inset-0 z-[100] bg-black text-white" role="dialog" aria-modal="true" aria-label={viewerItem.kind === "wcw" ? "Woman Crush Wednesday gallery" : "Man Crush Monday gallery"}>
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button type="button" onClick={closeViewer} aria-label="Close gallery" className="grid size-11 place-items-center rounded-full bg-black/60 backdrop-blur-md">
              <X className="size-6" />
            </button>
            <div className="rounded-full bg-black/60 px-4 py-2 text-xs font-black backdrop-blur-md">
              {viewerItem.kind === "wcw" ? "WOMAN CRUSH WEDNESDAY" : "MAN CRUSH MONDAY"}
            </div>
            <button type="button" onClick={() => void navigate({ to: "/crush", search: { kind: viewerItem.kind } })} aria-label="Open full crush page" className="rounded-full bg-black/60 px-3 py-2 text-[11px] font-bold backdrop-blur-md">
              Open
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {viewerItem.mediaType === "video" ? (
              <video
                key={viewerItem.id}
                src={viewerItem.mediaUrl}
                controls
                playsInline
                autoPlay
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <img
                key={viewerItem.id}
                src={viewerItem.mediaUrl}
                alt="Circle Panda MCM/WCW submission"
                className="max-h-full max-w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  toast.error("This picture could not be loaded from Circle Panda storage.");
                }}
              />
            )}

            {ranked.length > 1 ? (
              <>
                <button type="button" onClick={previousViewer} aria-label="Previous picture" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur-md">
                  <ChevronLeft className="size-7" />
                </button>
                <button type="button" onClick={nextViewer} aria-label="Next picture" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur-md">
                  <ChevronRight className="size-7" />
                </button>
              </>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
            <p className="text-sm font-black">{viewerItem.kind === "wcw" ? "Woman Crush Wednesday" : "Man Crush Monday"}</p>
            <p className="mt-1 text-[11px] text-white/65">Swipe through the gallery with the arrows.</p>
          </div>
        </div>
      ) : null}

      <CrushSubmissionDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </>
  );
}
