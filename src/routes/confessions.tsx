import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Upload, SmilePlus, MessageCircle, Share2, Send, AlertTriangle } from "lucide-react";
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
import { sendMessageRequest, isSelfMessageError } from "@/lib/messageRequests";

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
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [accountGender, setAccountGender] = useState<"male" | "female" | null>(null);
  const [genderPromptOpen, setGenderPromptOpen] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [items, setItems] = useState<Confession[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confessionSubmitLock = useRef(false);
  const commentSubmitLock = useRef(false);
  const messageSubmitLock = useRef(false);
  const [showSignup, setShowSignup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<string | null>(null);
  const [reactionState, setReactionState] = useState<Record<string, ReactionState>>({});
  const [commentPost, setCommentPost] = useState<Confession | null>(null);
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const confessionSubmitLock = useRef(false);
  const commentSubmitLock = useRef(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, ConfessionComment[]>>({});
  const [messagePost, setMessagePost] = useState<Confession | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = useMemo(() => 2000 - content.length, [content.length]);

  const load = async (background = false): Promise<string[] | null> => {
    if (background) setRefreshing(true); else setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_public_confessions", { p_limit: 50 });
      if (error) throw error;
      const nextItems = (data ?? []).map((row: any) => ({ id:row.id, content:row.body, is_anonymous:Boolean(row.is_anonymous), created_at:row.created_at, author_id:row.author_id ?? null })) as Confession[];
      setLoadError(null);
      setItems(nextItems);
      const ids = nextItems.map((x) => x.id);
      if (ids.length) {
        const [{ data: reactions, error: reactionsError }, { data: commentRows, error: commentsError }, authResult] = await Promise.all([
          (supabase as any).from("secret_reactions").select("secret_id,user_id,reaction").in("secret_id", ids),
          (supabase as any).from("secret_comments").select("secret_id").in("secret_id", ids),
          supabase.auth.getUser(),
        ]);
        if (reactionsError) console.error("Confession reactions could not be loaded", reactionsError);
        if (commentsError) console.error("Confession comment counts could not be loaded", commentsError);
        const currentUser = authResult.data.user?.id ?? null;
        const next: Record<string, ReactionState> = {};
        for (const row of reactions ?? []) {
          const state = next[row.secret_id] ?? { reaction:null, heart_count:0, laugh_count:0, wow_count:0, sad_count:0, angry_count:0, panda_count:0 };
          const key = row.reaction === "wow" || row.reaction === "surprised" ? "wow_count" : row.reaction === "heart" ? "heart_count" : row.reaction === "laugh" ? "laugh_count" : row.reaction === "angry" ? "angry_count" : row.reaction === "panda" ? "panda_count" : null;
          if (!key) continue;
          state[key] = Number(state[key] ?? 0) + 1;
          if (row.user_id === currentUser) state.reaction = row.reaction;
          next[row.secret_id] = state;
        }
        setReactionState(next);
        const counts: Record<string, number> = {};
        for (const row of commentRows ?? []) counts[row.secret_id] = (counts[row.secret_id] ?? 0) + 1;
        setCommentCounts(counts);
      } else {
        setReactionState({});
        setCommentCounts({});
      }
      return ids;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load confessions";
      setLoadError(message);
      if (items.length === 0) toast.error(message);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
    void (async () => { const { data } = await (supabase as any).rpc("get_my_profile_gender"); if (data === "male" || data === "female") setAccountGender(data); })();
  }, []);

  useEffect(() => {
    if (loading || !items.length) return;
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [loading, items]);

  const chooseFile = () => fileInputRef.current?.click();
  const openCrushUpload = async () => {
    if (accountGender) {
      setUploadOpen(true);
      return;
    }
    // Re-read the locked profile gender before showing the selector. This avoids
    // a race on first tap while the page is still loading the profile.
    const { data, error } = await (supabase as any).rpc("get_my_profile_gender");
    if (error) {
      toast.error(error.message ?? "Could not load your profile gender");
      return;
    }
    if (data === "male" || data === "female") {
      setAccountGender(data);
      setGenderPromptOpen(false);
      setUploadOpen(true);
      return;
    }
    setUploadOpen(false);
    setGenderPromptOpen(true);
  };
  const saveGender = async (gender: "male" | "female"): Promise<void> => {
    const { data, error } = await (supabase as any).rpc("set_profile_gender_secure", { p_gender: gender });
    if (error) { toast.error(error.message ?? "Gender could not be saved"); return; }
    const savedGender = data === "male" || data === "female" ? data : gender;
    setAccountGender(savedGender);
    setGenderPromptOpen(false);
    // Let Radix finish closing the gender dialog before opening the upload dialog.
    // This prevents the closing focus trap from intercepting the upload controls on mobile.
    window.setTimeout(() => setUploadOpen(true), 0);
    toast.success("Gender saved. Continue with your WCW/MCM upload.");
  };

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
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
  };

  const clearUpload = () => {
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadPreviewUrl(null);
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadCrush = async (): Promise<void> => {
    if (!accountGender) {
      setUploadOpen(false);
      setGenderPromptOpen(true);
      return;
    }
    if (!uploadFile) { toast.error("Tap Choose photo or video first."); return; }
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
      clearUpload();
      setUploadCaption("");
      setUploadOpen(false);
      window.dispatchEvent(new Event("circle-panda-crush-refresh"));
      await loadWeekly();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submitNow = async (trimmed: string) => {
    if (confessionSubmitLock.current || submitting) return;
    confessionSubmitLock.current = true;
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("create_confession", { p_body: trimmed });
      if (error) throw error;
      const createdId = typeof data === "string" ? data : data?.id;
      if (!createdId) throw new Error("The server did not confirm that your confession was saved.");
      const visibleIds = await load(true);
      setContent("");
      setShowSignup(false);
      if (visibleIds?.includes(createdId)) {
        toast.success("Confession posted 🐼");
      } else {
        // The RPC returned a created record ID, so the write succeeded. Do not
        // keep the composer populated or invite a duplicate submission just
        // because the feed refresh is delayed or temporarily unavailable.
        toast.success("Confession saved 🐼", { description: "The feed did not refresh yet. Reopen or refresh the page to see your post." });
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Your confession could not be submitted.");
    } finally {
      confessionSubmitLock.current = false;
      setSubmitting(false);
    }
  };

  const submit = async (): Promise<void> => {
    const trimmed = content.trim();
    if (trimmed.length < 3) { toast.error("Write at least 3 characters first."); return; }
    if (trimmed.length > 2000) { toast.error("Your confession is too long."); return; }

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
    await submitNow(trimmed);
  };

  const reactionOptions = [
    { key:"heart", emoji:"❤️", label:"Heart" },
    { key:"laugh", emoji:"😂", label:"Laugh" },
    { key:"surprised", emoji:"😮", label:"Surprised" },
    { key:"angry", emoji:"😡", label:"Angry" },
    { key:"panda", emoji:"🐼", label:"Panda" },
  ];
  const react = async (id: string, reaction: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.is_anonymous) {
        requestLogin("react to a confession");
        return;
      }

      const { error } = await (supabase as any).rpc("toggle_secret_reaction", {
        p_secret_id: id,
        p_reaction: reaction,
      });
      if (error) throw error;
      await load(true);
    } catch (error: any) {
      toast.error(error?.message ?? "Your reaction could not be saved.");
    } finally {
      setReactionMenuId(null);
    }
  };

  const openComments = async (item: Confession) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.is_anonymous) {
        requestLogin("comment on a confession");
        return;
      }

      const { data, error } = await (supabase as any)
        .from("secret_comments")
        .select("id,author_id,body,created_at")
        .eq("secret_id", item.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      setCommentsByPost((current) => ({ ...current, [item.id]: data ?? [] }));
      setCommentText("");
      setCommentPost(item);
    } catch (error: any) {
      toast.error(error?.message ?? "Comments could not be loaded.");
    }
  };

  const submitComment = async () => {
    const post = commentPost;
    const body = commentText.trim();
    if (!post || !body || commentSubmitLock.current || submittingComment) return;
    commentSubmitLock.current = true;
    setSubmittingComment(true);
    try {
      const { error } = await (supabase as any).rpc("add_secret_comment", {
        p_secret_id: post.id,
        p_body: body,
      });
      if (error) throw error;

      const { data, error: reloadError } = await (supabase as any)
        .from("secret_comments")
        .select("id,author_id,body,created_at")
        .eq("secret_id", post.id)
        .order("created_at", { ascending: true });

      if (reloadError) {
        // The write already succeeded. Update the visible count even if the
        // follow-up read is temporarily unavailable, avoiding a misleading UI.
        setCommentCounts((current) => ({
          ...current,
          [post.id]: (current[post.id] ?? 0) + 1,
        }));
      } else {
        setCommentsByPost((current) => ({ ...current, [post.id]: data ?? [] }));
        setCommentCounts((current) => ({
          ...current,
          [post.id]: (data ?? []).length,
        }));
      }

      setCommentText("");
      setCommentPost(null);
      toast.success("Comment posted");
    } catch (error: any) {
      toast.error(error?.message ?? "Comment could not be posted.");
    } finally {
      commentSubmitLock.current = false;
      setSubmittingComment(false);
    }
  };

  const shareConfession = async (item: Confession) => {
    const url = window.location.origin + "/confessions#" + item.id;
    try {
      if (navigator.share) {
        await navigator.share({ title:"Circle Panda Anonymous Feed", text:item.content, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
      } else {
        // Older browsers and some embedded webviews do not expose Clipboard API.
        window.prompt("Copy this confession link", url);
      }
    } catch (e:any) {
      if (e?.name !== "AbortError") toast.error("Could not share this confession.");
    }
  };

  const openMessage = async (item: Confession) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) return requestLogin("message a Panda");
    if (!item.author_id || item.author_id === authData.user.id) { window.dispatchEvent(new CustomEvent("circle-panda-self-message-blocked")); return; }
    setMessagePost(item);
    setMessageText("");
  };

  const sendMessage = async () => {
    if (!messagePost?.author_id || !messageText.trim() || messageSubmitLock.current) return;
    messageSubmitLock.current = true;
    setSendingMessage(true);
    try {
      const result = await sendMessageRequest(messagePost.author_id, messageText.trim(), "confession", messagePost.id);
      setMessageText("");
      setMessagePost(null);
      toast.success("Message request sent 💌", { description: "It is now in Messages while you wait for acceptance." });
      void navigate({ to: "/messages", search: { request: result.id } });
    } catch (e: any) {
      if (isSelfMessageError(e)) return;
      toast.error(e?.message ?? "Message request could not be sent");
    } finally {
      messageSubmitLock.current = false;
      setSendingMessage(false);
    }
  };

  return (
    <AppShell title="Anonymous Feed" hidePageHeader>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="space-y-1 px-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-black leading-tight sm:text-3xl">Anonymous Feed</h1>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Nobody knows it's you. Replies are public.</p>
            </div>

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
              onClick={openCrushUpload}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
            >
              <span className="grid size-[58px] place-items-center rounded-full border border-dashed border-primary/70 bg-background text-2xl text-primary shadow-inner sm:size-16">+</span>
              <span className="w-full truncate text-[11px] font-semibold">Upload</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.assign("/crush?kind=wcw")}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
            >
              <span className="relative grid size-[58px] place-items-center overflow-hidden rounded-full border-2 border-pink-400 bg-background text-2xl shadow-[0_0_12px_rgba(244,114,182,.12)] sm:size-16">
                {weekly.wcw[0]?.media_url ? (
                  weekly.wcw[0].media_type === "video" ? (
                    <video src={weekly.wcw[0].media_url} muted playsInline preload="metadata" className="size-full object-cover" />
                  ) : (
                    <img src={weekly.wcw[0].media_url} alt="WCW" className="size-full object-cover" loading="lazy" />
                  )
                ) : "❤️"}
              </span>
              <span className="w-full truncate text-[11px] font-semibold">WCW</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.assign("/crush?kind=mcm")}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
            >
              <span className="relative grid size-[58px] place-items-center overflow-hidden rounded-full border-2 border-sky-400 bg-background text-2xl shadow-[0_0_12px_rgba(56,189,248,.12)] sm:size-16">
                {weekly.mcm[0]?.media_url ? (
                  weekly.mcm[0].media_type === "video" ? (
                    <video src={weekly.mcm[0].media_url} muted playsInline preload="metadata" className="size-full object-cover" />
                  ) : (
                    <img src={weekly.mcm[0].media_url} alt="MCM" className="size-full object-cover" loading="lazy" />
                  )
                ) : "💙"}
              </span>
              <span className="w-full truncate text-[11px] font-semibold">MCM</span>
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">
            Tap MCM or WCW to view pictures • Upload to enter
          </p>

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

            </div>
            <Button onClick={() => void submit()} disabled={submitting || content.trim().length < 3} className="shrink-0 rounded-full px-4 text-xs font-bold">
              {submitting ? "Posting…" : "Post anonymously"}
            </Button>
          </div>
        </section>

        {loading ? <div className="rounded-3xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">Loading confessions…</div> : null}
        {!loading && loadError && items.length === 0 ? (
          <div role="alert" className="rounded-3xl border border-destructive/30 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">We could not load the confession feed.</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{loadError}</p>
            <Button type="button" variant="outline" onClick={() => void load()} className="mt-4 rounded-full">Try again</Button>
          </div>
        ) : null}
        {!loading && !loadError && items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No published confessions yet. Be the first.</div>
        ) : null}
        {!loading && loadError && items.length > 0 ? (
          <div role="status" className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Could not refresh the feed. Your previously loaded confessions are still shown. <button type="button" className="ml-1 font-semibold text-primary underline underline-offset-4" onClick={() => void load(true)}>Retry</button>
          </div>
        ) : null}

        {items.map((item, idx) => (
          <div key={item.id} className="space-y-4">
            <article id={item.id} className={`scroll-mt-20 rounded-[1.65rem] border border-border/70 bg-card p-5 shadow-sm ${item.author_vip_at ? "vip-content-card" : ""}`}>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2">
                  <VipIdentity isVip={Boolean(item.author_vip_at)} seed={item.author_id ?? item.id} compact />
                  <span className="min-w-0 truncate">
                    <Eye className="mr-1 inline size-3.5" /> {item.is_anonymous ? "Anonymous Panda" : "Panda"}
                  </span>
                </div>
                {item.author_id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 rounded-full px-2.5 text-[11px] font-semibold"
                    onClick={() => void openMessage(item)}
                  >
                    <Send className="mr-1 size-3.5" /> Message
                  </Button>
                ) : null}
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7">{item.content}</p>
              {(() => {
                const rs = reactionState[item.id] ?? { reaction:null,heart_count:0,laugh_count:0,wow_count:0,sad_count:0,angry_count:0, panda_count:0 };
                const selected = reactionOptions.find((r) => r.key === rs.reaction);
                return (
                  <div className="relative mt-4">
                    <div className="flex w-full flex-wrap items-center gap-2">
                      <Button
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        aria-label="React to confession"
                        className="h-9 min-w-9 rounded-full px-2"
                        onClick={() => setReactionMenuId(reactionMenuId === item.id ? null : item.id)}
                      >
                        <SmilePlus className="size-4" />
                        {selected ? <span className="text-base leading-none">{selected.emoji}</span> : null}
                        <span className="text-[10px]">{[
                          rs.heart_count,rs.laugh_count,rs.wow_count,rs.sad_count,rs.angry_count,rs.panda_count
                        ].reduce((a,b)=>a+Number(b||0),0)}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-full px-2.5"
                        onClick={() => void openComments(item)}
                      >
                        <MessageCircle className="mr-1 size-4" /> Comment
                        <span className="ml-1 text-[10px]">{commentCounts[item.id] ?? 0}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-full px-2.5"
                        onClick={() => void shareConfession(item)}
                      >
                        <Share2 className="mr-1 size-4" /> Share
                      </Button>
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
                  {(commentsByPost[item.id] ?? []).slice(-3).map((comment) => <div key={comment.id} className="text-sm"><span className="font-semibold">Anonymous Panda</span><span className="text-muted-foreground"> · {comment.body}</span></div>)}
                </div>
              ) : null}
            </article>
            {((idx + 1) === 4 || (idx + 1) === 8 || ((idx + 1) >= 15 && (idx + 1 - 15) % 7 === 0)) ? (
              <StandardBannerAd index={idx} variant="feed-card" placement="confessions_inline" />
            ) : null}
          </div>
        ))}
      </div>

      <Dialog open={genderPromptOpen} onOpenChange={setGenderPromptOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>Select your gender to continue with WCW/MCM. This choice is saved to your profile and cannot be changed later.</DialogDescription>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
            <AlertTriangle className="mr-1 inline size-4" />
            Please pick the correct profile. Once saved, your gender is locked and cannot be changed back.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => void saveGender("female")}>👩 Female · WCW</Button>
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => void saveGender("male")}>🧑 Male · MCM</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(v) => {
        if (!v && !uploading) {
          setUploadOpen(false);
          clearUpload();
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

          {uploadPreviewUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-black">
              {uploadFile?.type.startsWith("video/") ? (
                <video src={uploadPreviewUrl} controls playsInline className="max-h-72 w-full object-contain" />
              ) : (
                <img src={uploadPreviewUrl} alt="WCW/MCM upload preview" className="max-h-72 w-full object-contain" />
              )}
              <button type="button" onClick={clearUpload} disabled={uploading} className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={chooseFile}
              disabled={uploading}
              className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-primary/60 bg-secondary/30 px-4 text-center transition-colors hover:bg-secondary/50 active:scale-[.99]"
            >
              <Upload className="size-7 text-primary" />
              <span className="mt-2 text-sm font-bold">Choose photo or video</span>
              <span className="mt-1 max-w-full truncate text-xs text-muted-foreground">Tap here to open your phone gallery/files</span>
            </button>
          )}
          {uploadFile ? <p className="mt-2 truncate text-center text-[11px] text-muted-foreground">{uploadFile.name}</p> : null}

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
          <Button onClick={() => void submitComment()} disabled={submittingComment || !commentText.trim()} className="w-full rounded-2xl">{submittingComment ? "Posting…" : "Post comment"}</Button>
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
          if (trimmed.length >= 3) void submitNow(trimmed);
        }}
      />
    </AppShell>
  );
}
