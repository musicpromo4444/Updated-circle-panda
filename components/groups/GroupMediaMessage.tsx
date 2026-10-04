import { useRef, useState } from "react";
import { Image as ImageIcon, Play, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GroupMediaItem = {
  id: string;
  author: string;
  body: string;
  at: number;
  mine?: boolean;
  messageType: "text" | "image" | "video" | "audio";
  mediaUrl?: string;
  durationSeconds?: number | null;
  mimeType?: string;
};

export function GroupMediaMessage({ message }: { message: GroupMediaItem }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (message.messageType === "text") {
    return <p className={`mt-0.5 inline-block max-w-[88%] rounded-2xl px-3.5 py-2 text-sm ${message.mine ? "bg-primary text-primary-foreground" : "bg-card"}`}>{message.body}</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        className={`mt-1 block max-w-[88%] overflow-hidden rounded-2xl border text-left ${message.mine ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}
      >
        {message.messageType === "image" && message.mediaUrl ? (
          <img src={message.mediaUrl} alt="Group media" className="max-h-[360px] w-full object-cover" />
        ) : message.messageType === "video" && message.mediaUrl ? (
          <div className="relative">
            <video src={message.mediaUrl} playsInline preload="metadata" className="max-h-[360px] w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid size-12 place-items-center rounded-full bg-black/60 text-white"><Play className="size-5 fill-current" /></span></span>
          </div>
        ) : message.messageType === "audio" && message.mediaUrl ? (
          <div className="flex min-w-[230px] items-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={playing ? "Pause voice note" : "Play voice note"} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" onClick={(e) => { e.stopPropagation(); setPlaying(v => !v); }}>
              {playing ? <span className="text-xs font-bold">Ⅱ</span> : <Play className="size-4 fill-current" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {Array.from({length: 22}).map((_,i)=><span key={i} className="h-1 w-1 rounded-full bg-current opacity-60" style={{height:`${6 + ((i * 7) % 14)}px`}} />)}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{message.durationSeconds ? `${message.durationSeconds}s` : "Voice message"}</p>
              <audio src={message.mediaUrl} controls={false} autoPlay={playing} onEnded={() => setPlaying(false)} className="hidden" preload="metadata" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3"><Volume2 className="size-5" /><span className="text-sm font-medium">Voice note</span></div>
        )}
        {message.body ? <p className="px-3 py-2 text-xs text-muted-foreground">{message.body}</p> : null}
      </button>

      {viewerOpen && message.mediaUrl ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-3" onClick={() => setViewerOpen(false)}>
          <Button variant="ghost" size="icon" className="absolute right-3 top-3 z-10 text-white hover:bg-white/10" onClick={() => setViewerOpen(false)}><X className="size-5" /></Button>
          <div className="flex max-h-full max-w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {message.messageType === "image" ? <img src={message.mediaUrl} alt="Group media viewer" className="max-h-[92vh] max-w-[96vw] object-contain" /> : null}
            {message.messageType === "video" ? <video src={message.mediaUrl} controls playsInline controlsList="nodownload" className="max-h-[92vh] max-w-[96vw]" /> : null}
            {message.messageType === "audio" ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8"><Volume2 className="mx-auto mb-4 size-10 text-white" /><audio src={message.mediaUrl} controls controlsList="nodownload" /></div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MediaTypeIcon({ type }: { type: "image" | "video" | "audio" }) {
  return type === "image" ? <ImageIcon className="size-4" /> : type === "video" ? <Play className="size-4" /> : <Volume2 className="size-4" />;
}
