import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Share2, Link2, ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/store";

interface SharePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Pick<Post, "id" | "body" | "author">;
}

export function SharePostSheet({ open, onOpenChange, post }: SharePostSheetProps) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/#${post.id}`;
    }
    return `https://circlepanda.app/#${post.id}`;
  };

  const getShareText = () => {
    const snippet = post.body.length > 140 ? `${post.body.slice(0, 140)}…` : post.body;
    return `"${snippet}" — anonymous on Circle Panda 🐼`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      toast.success("Link copied to clipboard!", {
        description: "You can now paste and share this post anywhere.",
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Failed to copy link. Please copy it manually.");
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`${getShareText()}\n\n${getShareUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(getShareUrl());
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer",
    );
    onOpenChange(false);
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-lg rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl"
      >
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-muted" />

        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Share2 className="size-4" />
            </span>
            <div>
              <SheetTitle className="font-display text-lg font-bold">Share Post</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Spread the conversation to your campus circles and friends
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Post Snippet Preview */}
        <div className="my-4 rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{post.author}: </span>
          <span className="italic line-clamp-2">"{post.body}"</span>
        </div>

        {/* Direct Share Options */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 active:scale-95 cursor-pointer"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-[#25D366] text-white shadow-md transition-transform group-hover:scale-105">
              <svg className="size-6 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-10.416c-4.28 0-7.763 3.483-7.764 7.764 0 1.37.358 2.709 1.037 3.885l-1.103 4.029 4.122-1.082c1.13.616 2.407.941 3.708.941 4.28 0 7.763-3.483 7.764-7.764 0-4.28-3.484-7.773-7.764-7.773z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-foreground">WhatsApp</span>
          </button>

          {/* X (Twitter) */}
          <button
            type="button"
            onClick={handleShareTwitter}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/20 bg-secondary/30 p-3.5 transition-all hover:border-foreground/40 hover:bg-secondary/60 active:scale-95 cursor-pointer"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-neutral-900 text-white shadow-md transition-transform group-hover:scale-105 dark:bg-neutral-100 dark:text-neutral-900">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-foreground">X (Twitter)</span>
          </button>

          {/* Telegram */}
          <button
            type="button"
            onClick={handleShareTelegram}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 transition-all hover:border-sky-500/50 hover:bg-sky-500/10 active:scale-95 cursor-pointer"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-[#229ED9] text-white shadow-md transition-transform group-hover:scale-105">
              <svg className="size-6 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-foreground">Telegram</span>
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 transition-all hover:border-primary/50 hover:bg-primary/10 active:scale-95 cursor-pointer"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
              {copied ? <Check className="size-5" /> : <Link2 className="size-5" />}
            </div>
            <span className="text-xs font-semibold text-foreground">
              {copied ? "Copied!" : "Copy Link"}
            </span>
          </button>
        </div>

        {/* Copy Link Full Bar */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-1.5 pl-3">
          <input
            type="text"
            readOnly
            value={getShareUrl()}
            className="min-w-0 flex-1 bg-transparent text-xs text-muted-foreground outline-none select-all"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopyLink}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
