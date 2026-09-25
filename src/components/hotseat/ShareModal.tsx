import { Check, Copy, MessageCircle, Send, Share2, Twitter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ShareModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://circlepanda.app/hot-seat";
  const shareText =
    "🔥 Midnight Panda is LIVE on the Circle Panda Hot Sit! Watch the stream & ask anything anonymously:";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      toast.success("Link copied to clipboard!", {
        description: "Share the Hot Sit live stream with your friends.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Midnight Panda LIVE on Hot Sit",
          text: shareText,
          url: shareUrl,
        });
        onOpenChange(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-white/10 bg-neutral-950/95 text-white backdrop-blur-2xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-orange-500/20 text-orange-400">
              <Share2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl font-bold text-white">
                Share Live Stream
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Invite pandas to watch Midnight Panda on the Hot Sit.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Share Action Grid */}
        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-2 rounded-xl bg-neutral-900/80 p-3 text-xs transition-all hover:bg-neutral-800 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="grid size-11 place-items-center rounded-full bg-orange-500/20 text-orange-400 text-lg shadow-inner">
              <Share2 className="size-5" />
            </span>
            <span className="font-medium text-neutral-300">Quick Share</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-center gap-2 rounded-xl bg-neutral-900/80 p-3 text-xs transition-all hover:bg-neutral-800 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="grid size-11 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 text-lg shadow-inner">
              <MessageCircle className="size-5" />
            </span>
            <span className="font-medium text-neutral-300">WhatsApp</span>
          </a>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-center gap-2 rounded-xl bg-neutral-900/80 p-3 text-xs transition-all hover:bg-neutral-800 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="grid size-11 place-items-center rounded-full bg-sky-500/20 text-sky-400 text-lg shadow-inner">
              <Twitter className="size-5" />
            </span>
            <span className="font-medium text-neutral-300">X / Twitter</span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-center gap-2 rounded-xl bg-neutral-900/80 p-3 text-xs transition-all hover:bg-neutral-800 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="grid size-11 place-items-center rounded-full bg-blue-500/20 text-blue-400 text-lg shadow-inner">
              <Send className="size-5" />
            </span>
            <span className="font-medium text-neutral-300">Telegram</span>
          </a>
        </div>

        {/* Copy Link Input Bar */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-3 py-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full bg-transparent text-xs text-neutral-300 outline-none select-all font-mono"
          />
          <Button
            size="sm"
            onClick={handleCopy}
            className="shrink-0 gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold h-8 text-xs"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
