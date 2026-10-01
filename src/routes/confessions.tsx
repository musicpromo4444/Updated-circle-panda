import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Upload, Crown, SmilePlus, MessageCircle, Share2, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { requestLogin } from "@/components/auth/LoginRequiredDialog";
import { VipIdentity } from "@/components/VipIdentity";

export const Route = createFileRoute("/confessions")({
  head: () => ({ meta: [{ title: "Confessions — Circle Panda" }] }),
  component: ConfessionsPage,
});

type Confession = {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author_id?: string | null;
  author_vip_at?: string | null;
};

type ReactionState = { reaction:string|null; heart_count:number; laugh_count:number; wow_count:number; sad_count:number; angry_count:number; panda_count:number; };
type ConfessionComment = { id:string; author_id:string; body:string; created_at:string; };

type WeeklyEntry = {
  id: string;
  display_name?: string;
  kind?: string;
  emoji?: string;
  media_url?: string;
  media_type?: string;
  vote_count?: number;
  reaction_count?: number;
};

export function ConfessionsPage() {
  const [weekly, setWeekly] = useState<{ wcw: WeeklyEntry[]; mcm: WeeklyEntry[] }>({ wcw: [], mcm: [] });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<Confession[]>([]);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<string | null>(null);
  const [reactionState, setReactionState] = useState<Record<string, ReactionState>>({});
  const [commentPost, setCommentPost] = useState<Confession | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, ConfessionComment[]>>({});
  const [messagePost, setMessagePost] = useState<Confession | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = useMemo(() => 2000 - content.length, [content.length]);

  const load = async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    const { data, error } = await supabase
      .from("confessions")
      .select("id,content,is_anonymous,created_at,author_id,author_vip_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else {
      const nextItems = (data ?? []) as Confession[];
      setItems(nextItems);
      if (nextItems.length) {
        const { data: reactions } = await (supabase as any).rpc("get_confession_reaction_state", { p_confession_ids: nextItems.map((x) => x.id) });
        const next: Record<string, ReactionState> = {};
        for (const row of reactions ?? []) next[row.confession_id] = { reaction:row.reaction ?? null, heart_count:Number(row.heart_count ?? 0), laugh_count:Number(row.laugh_count ?? 0), wow_count:Number(row.wow_count ?? 0), sad_count:Number(row.sad_count ?? 0), angry_count:Number(row.angry_count ?? 0), panda_count:Number(row.panda_count ?? 0) };
        setReactionState(next);
      } else setReactionState({});
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadWeekly = async () => {
    const { data, error } = await (supabase as any).rpc("get_wcw_mcm_current_week");
    if (error) return;
    if (Array.isArray(data)) {
      setWeekly({
        wcw: data.filter((x: any) => String(x.kind ?? "").toLowerCase() === "wcw"),
        mcm: data.filter((x: any) => String(x.kind ?? "").toLowerCase() === "mcm"),
      });
    }
  };

  useEffect(() => {
    if (window.location.hash === "#upload") setUploadOpen(true);
    void load();
    void loadWeekly();
  }, []);

  const chooseFile = () => fileInputRef.current?.click();

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Only photos and videos are allowed.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Please keep the upload under 6MB.");
      return;
    }
    setUploadFile(file);
  };

  const uploadCrush = async () => {
    if (!uploadFile) return toast.error("Tap Choose photo or video first.");
    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid || authData.user?.is_anonymous) throw new Error("Please sign in before uploading your WCW/MCM entry.");

      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${uid}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("circle-panda-crush")
        .upload(path, uploadFile, {
          upsert: false,
          contentType: uploadFile.type,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("circle-panda-crush").getPublicUrl(path).data.publicUrl;
      const { error } = await (supabase as any).rpc("submit_crush_media_secure", {
        p_media_url: publicUrl,
        p_media_type: uploadFile.type.startsWith("video/") ? "video" : "image",
        p_caption: uploadCaption.trim(),
        p_emoji: "🐼",
      });
      if (error) throw error;

      toast.success("Your WCW/MCM entry is uploaded.");
      setUploadFile(null);
      setUploadCaption("");
      setUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadWeekly();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submitNow = async (trimmed: string, postAnonymous: boolean) => {
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc("submit_confession_secure", {
      p_content: trimmed,
      p_anonymous: postAnonymous,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message ?? "Your confession could not be submitted.");
    setContent("");
    setShowSignup(false);
    toast.success("Confession posted 🐼");
    await load(true);
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 3) return toast.error("Write at least 3 characters first.");
    if (trimmed.length > 2000) return toast.error("Your confession is too long.");

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) {
      // The confession itself must stay in the composer while the visitor signs in.
      // Do not silently submit as an anonymous Supabase auth session.
      if (authData.user?.is_anonymous) {
        await supabase.auth.signOut();
      }
      setShowSignup(true);
      return;
    }
    await submitNow(trimmed, anonymous);
  };

  const reactionOptions = [
    { key:"heart", emoji:"❤️", label:"Heart" },
    { key:"laugh", emoji:"😂", label:"Laugh" },
    { key:"wow", emoji:"😮", label:"Surprised" },
    { key:"angry", emoji:"😡", label:"Angry" },
    { key:"panda", emoji:"🐼", label:"Panda" },
  ];
  const react = async (id: string, reaction: string) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) {
      requestLogin("react to a confession");
      setReactionMenuId(null);
      return;
    }
    const { data, error } = await (supabase as any).rpc("react_to_confession_secure", { p_confession_id:id, p_reaction:reaction });
    if (error) return toast.error(error.message);
    await load(true);
    setReactionMenuId(null);
  };

  const openComments = async (item: Confession) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) return requestLogin("comment on a confession");
    setCommentPost(item);
    setCommentText("");
    const { data } = await (supabase as any).rpc("get_confession_comments", { p_confession_id:item.id });
    setCommentsByPost((current) => ({ ...current, [item.id]: data ?? [] }));
  };

  const submitComment = async () => {
    if (!commentPost || !commentText.trim()) return;
    const { error } = await (supabase as any).rpc("add_confession_comment_secure", { p_confession_id:commentPost.id, p_body:commentText.trim() });
    if (error) return toast.error(error.message);
    const { data } = await (supabase as any).rpc("get_confession_comments", { p_confession_id:commentPost.id });
    setCommentsByPost((current) => ({ ...current, [commentPost.id]: data ?? [] }));
    setCommentText("");
    toast.success("Comment posted");
  };

  const shareConfession = async (item: Confession) => {
    const url = window.location.origin + "/confessions#" + item.id;
    try {
      if (navigator.share) await navigator.share({ title:"Circle Panda Anonymous Feed", text:item.content, url });
      else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    } catch (e:any) {
      if (e?.name !== "AbortError") toast.error("Could not share this confession.");
    }
  };

  const openMessage = async (item: Confession) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) return requestLogin("message a Panda");
    if (!item.author_id || item.author_id === authData.user.id) return toast.error("You can't message yourself.");
    setMessagePost(item);
    setMessageText("");
  };

  const sendMessage = async () => {
    if (!messagePost?.author_id || !messageText.trim()) return;
    setSendingMessage(true);
    const { error } = await (supabase as any).rpc("request_direct_message_secure", { p_recipient_id:messagePost.author_id, p_message:messageText.trim() });
    setSendingMessage(false);
    if (error) return toast.error(error.message);
    setMessageText("");
    setMessagePost(null);
    toast.success("Message request sent");
  };

  const mcmCount = weekly.mcm.length;
  const wcwCount = weekly.wcw.length;

  return (
    <AppShell title="Anonymous Feed" hidePageHeader>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="space-y-1 px-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-black leading-tight sm:text-3xl">Anonymous Feed</h1>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Nobody knows it's you. Replies are public.</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 rounded-full text-xs">
              <Crown className="mr-1 size-3.5" /> Leaders
            </Button>
          </div>
        </section>

        <section className="rounded-[1.65rem] border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-black">👑 WCW &amp; MCM this week</h2>
            <span className="shrink-0 text-xs font-semibold text-primary">Vote now</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
            >
              <span className="grid size-[58px] place-items-center rounded-full border border-dashed border-primary/70 bg-background text-2xl text-primary shadow-inner sm:size-16">+</span>
              <span className="w-full truncate text-[11px] font-semibold">Upload</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.assign("/crush#mcm")}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
            >
              <span className="grid size-[58px] place-items-center rounded-full border-2 border-sky-400 bg-background text-2xl shadow-[0_0_12px_rgba(56,189,248,.12)] sm:size-16">💙</span>
              <span className="w-full truncate text-[11px] font-semibold">MCM</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.assign("/crush#wcw")}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
            >
              <span className="grid size-[58px] place-items-center rounded-full border-2 border-pink-400 bg-background text-2xl shadow-[0_0_12px_rgba(244,114,182,.12)] sm:size-16">❤️</span>
              <span className="w-full truncate text-[11px] font-semibold">WCW</span>
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">
            Upload to enter • MCM Monday • WCW Wednesday
          </p>

          {mcmCount + wcwCount > 0 ? (
            <p className="mt-1 text-center text-[9px] text-muted-foreground">
              {mcmCount} MCM entries · {wcwCount} WCW entries
            </p>
          ) : null}
        </section>

        <section className="rounded-[1.65rem] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              placeholder="Say the thing you'd never sign your name to..."
              aria-label="Anonymous confession"
              className="min-h-36 w-full resize-none rounded-2xl border-0 bg-transparent p-0 text-base leading-7 outline-none placeholder:text-muted-foreground focus:ring-0"
              disabled={submitting}
            />
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/50 pt-3">
            <div className="min-w-0">
              <p className="text-xs leading-4 text-muted-foreground">Posting is free · messages cost 1 BC</p>
              <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} disabled={submitting} />
                Post anonymously
              </label>
            </div>
            <Button onClick={() => void submit()} disabled={submitting || content.trim().length < 3} className="shrink-0 rounded-full px-4 text-xs font-bold">
              {submitting ? "Posting…" : "Post anonymously"}
            </Button>
          </div>
        </section>

        {loading ? <div className="rounded-3xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">Loading confessions…</div> : null}
        {!loading && items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No published confessions yet. Be the first.</div>
        ) : null}

        {items.map((item, idx) => (
          <div key={item.id} className="space-y-4">
            <article className={`rounded-[1.65rem] border border-border/70 bg-card p-5 shadow-sm ${item.author_vip_at ? "vip-content-card" : ""}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <VipIdentity isVip={Boolean(item.author_vip_at)} seed={item.author_id ?? item.id} compact />
                <span className="min-w-0 truncate">
                  <Eye className="mr-1 inline size-3.5" /> {item.is_anonymous ? "Anonymous Panda" : "Panda"} · {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7">{item.content}</p>
              {(() => {
                const rs = reactionState[item.id] ?? { reaction:null,heart_count:0,laugh_count:0,wow_count:0,sad_count:0,angry_count:0, panda_count:0 };
                const selected = reactionOptions.find((r) => r.key === rs.reaction);
                return (
                  <div className="relative mt-4">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <Button variant={selected ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setReactionMenuId(reactionMenuId === item.id ? null : item.id)}>
                        <SmilePlus className="mr-1 size-4" /> {selected ? selected.emoji : "React"}
                        {selected ? <span className="ml-1 text-[10px]">{(rs as any)[selected.key + "_count"] ?? 0}</span> : null}
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void openComments(item)}><MessageCircle className="mr-1 size-4" /> Comment</Button>
                      <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void shareConfession(item)}><Share2 className="mr-1 size-4" /> Share</Button>
                      {item.author_id ? <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void openMessage(item)}><Send className="mr-1 size-4" /> Message</Button> : null}
                    </div>
                    {reactionMenuId === item.id ? (
                      <div className="absolute bottom-full left-0 z-30 mb-2 flex items-center gap-1 rounded-full border border-border bg-card p-2 shadow-xl">
                        {reactionOptions.map((r) => (
                          <button key={r.key} type="button" title={r.label} aria-label={r.label} onClick={() => void react(item.id,r.key)}
                            className={`grid size-11 place-items-center rounded-full text-2xl transition-transform hover:scale-110 ${rs.reaction===r.key ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-secondary"}`}>
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
              {commentsByPost[item.id]?.length ? (
                <div className="mt-3 space-y-2 rounded-2xl bg-secondary/30 p-3">
                  {commentsByPost[item.id].slice(-3).map((comment) => <div key={comment.id} className="text-sm"><span className="font-semibold">Anonymous Panda</span><span className="text-muted-foreground"> · {comment.body}</span></div>)}
                </div>
              ) : null}
            </article>
            {((idx + 1) === 4 || (idx + 1) === 8 || ((idx + 1) >= 15 && (idx + 1 - 15) % 7 === 0)) ? (
              <StandardBannerAd index={idx} variant="feed-card" placement="confessions_inline" />
            ) : null}
          </div>
        ))}
      </div>

      <Dialog open={uploadOpen} onOpenChange={(v) => {
        if (!v && !uploading) {
          setUploadOpen(false);
          setUploadFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogTitle>Upload to MCM / WCW</DialogTitle>
          <DialogDescription>Your gender decides the weekly category automatically. One entry per week, maximum 6MB.</DialogDescription>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />

          <button
            type="button"
            onClick={chooseFile}
            disabled={uploading}
            className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-primary/60 bg-secondary/30 px-4 text-center transition-colors hover:bg-secondary/50 active:scale-[.99]"
          >
            <Upload className="size-7 text-primary" />
            <span className="mt-2 text-sm font-bold">{uploadFile ? "Change photo or video" : "Choose photo or video"}</span>
            <span className="mt-1 max-w-full truncate text-xs text-muted-foreground">
              {uploadFile ? uploadFile.name : "Tap here to open your phone gallery/files"}
            </span>
          </button>

          <Textarea
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            maxLength={300}
            placeholder="Optional caption..."
            className="rounded-2xl"
            disabled={uploading}
          />
          <Button onClick={() => void uploadCrush()} disabled={uploading || !uploadFile} className="w-full rounded-2xl">
            {uploading ? "Uploading…" : "Publish weekly entry"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(commentPost)} onOpenChange={(open) => { if (!open) setCommentPost(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogTitle>Comment on this confession</DialogTitle>
          <DialogDescription>Your comment is public and shown as Anonymous Panda.</DialogDescription>
          <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} maxLength={1000} placeholder="Write a comment..." className="min-h-28 rounded-2xl" />
          <Button onClick={() => void submitComment()} disabled={!commentText.trim()} className="w-full rounded-2xl">Post comment</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(messagePost)} onOpenChange={(open) => { if (!open) setMessagePost(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogTitle>Message Panda</DialogTitle>
          <DialogDescription>Send a direct message request to this confession's author.</DialogDescription>
          <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={2000} placeholder="Write your message..." className="min-h-28 rounded-2xl" />
          <Button onClick={() => void sendMessage()} disabled={sendingMessage || !messageText.trim()} className="w-full rounded-2xl">{sendingMessage ? "Sending…" : "Send message"}</Button>
        </DialogContent>
      </Dialog>

      <AuthModal
        open={showSignup}
        onOpenChange={setShowSignup}
        defaultTab="signin"
        onAuthenticated={() => {
          const trimmed = content.trim();
          if (trimmed.length >= 3) void submitNow(trimmed, anonymous);
        }}
      />
    </AppShell>
  );
}
