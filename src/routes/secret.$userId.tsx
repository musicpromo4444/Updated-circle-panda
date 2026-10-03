import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Eye, Lock, Send, Share2, SmilePlus, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { VipIdentity } from "@/components/VipIdentity";
import { requestLogin } from "@/components/auth/LoginRequiredDialog";

type SharedProfile = { id: string; display_name: string; avatar_url?: string | null; bio?: string | null; country?: string | null; is_vip?: boolean };
type Secret = { id: string; content: string; created_at: string };
type Interaction = { reaction: string | null; reaction_count: number; comment_count: number; heart_count:number; laugh_count:number; wow_count:number; sad_count:number; angry_count:number; panda_count:number };
type SecretComment = { id:string; author_id:string; body:string; created_at:string };

export const Route = createFileRoute("/secret/$userId")({
  head: () => ({ meta: [{ title: "Secret Panda Profile — Circle Panda" }] }),
  component: SecretProfilePage,
});

function SecretProfilePage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Record<string, Interaction>>({});
  const [commentPost, setCommentPost] = useState<Secret | null>(null);
  const [commentText, setCommentText] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsBySecret, setCommentsBySecret] = useState<Record<string, SecretComment[]>>({});
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const adAfter = (count: number) => count === 5 || count === 10 || count === 17 || count === 24 ? count : count > 24 && (count - 24) % 10 === 0 ? count : -1;
  const adSlotForCount = (count: number) => count === 5 ? "secret_profile_slot_1" : count === 10 ? "secret_profile_slot_2" : count === 17 ? "secret_profile_slot_3" : "secret_profile_slot_4";

  const load = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: secretData }] = await Promise.all([
      (supabase as any).rpc("get_shared_profile_public", { p_user_id: userId }),
      (supabase as any).from("profile_secrets").select("id,content,created_at").eq("target_user_id", userId).eq("is_published", true).order("created_at", { ascending: false }).limit(50),
    ]);
    setProfile(Array.isArray(profileData) ? profileData[0] ?? null : profileData ?? null);
    const next = (secretData ?? []) as Secret[];
    setSecrets(next);
    if (next.length) {
      const ids = next.map((x) => x.id);
      const { data } = await (supabase as any).rpc("get_profile_secret_interactions", { p_secret_ids: ids });
      const map: Record<string, Interaction> = {};
      for (const row of data ?? []) map[row.secret_id] = {
        reaction: row.reaction ?? null, reaction_count:Number(row.reaction_count ?? 0), comment_count:Number(row.comment_count ?? 0),
        heart_count:Number(row.heart_count ?? 0), laugh_count:Number(row.laugh_count ?? 0), wow_count:Number(row.wow_count ?? 0),
        sad_count:Number(row.sad_count ?? 0), angry_count:Number(row.angry_count ?? 0), panda_count:Number(row.panda_count ?? 0),
      };
      setInteractions(map);
    } else setInteractions({});
    setLoading(false);
  };

  useEffect(() => { void load(); }, [userId]);

  const submit = async () => {
    if (content.trim().length < 3) { toast.error("Write at least 3 characters."); return false; }
    setPosting(true);
    const { data, error } = await (supabase as any).rpc("submit_profile_secret", { p_target_user_id: userId, p_content: content.trim() });
    setPosting(false);
    if (error) { toast.error(error.message); return false; }
    const newSecret: Secret = { id: String(data), content: content.trim(), created_at: new Date().toISOString() };
    setSecrets((current) => [newSecret, ...current]);
    setInteractions((current) => ({ ...current, [newSecret.id]: { reaction:null,reaction_count:0,comment_count:0,heart_count:0,laugh_count:0,wow_count:0,sad_count:0,angry_count:0,panda_count:0 } }));
    setContent("");
    toast.success("Secret posted anonymously.");
    return true;
  };

  const react = async (id:string, reaction:string) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) { requestLogin("react to a secret"); return; }
    const { error } = await (supabase as any).rpc("react_to_profile_secret_secure", { p_secret_id:id, p_reaction:reaction });
    if (error) return toast.error(error.message);
    setReactionMenuId(null);
    await load();
  };

  const openComments = async (secret:Secret) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) { requestLogin("comment on a secret"); return; }
    setCommentPost(secret);
    setCommentText("");
    const { data } = await (supabase as any).rpc("get_profile_secret_comments", { p_secret_id:secret.id });
    setCommentsBySecret((current) => ({ ...current, [secret.id]: data ?? [] }));
  };

  const submitComment = async () => {
    if (!commentPost || !commentText.trim()) return;
    const { error } = await (supabase as any).rpc("add_profile_secret_comment_secure", { p_secret_id:commentPost.id, p_body:commentText.trim() });
    if (error) return toast.error(error.message);
    const { data } = await (supabase as any).rpc("get_profile_secret_comments", { p_secret_id:commentPost.id });
    setCommentsBySecret((current) => ({ ...current, [commentPost.id]: data ?? [] }));
    setInteractions((current) => ({ ...current, [commentPost.id]: { ...(current[commentPost.id] ?? {reaction:null,reaction_count:0,heart_count:0,laugh_count:0,wow_count:0,sad_count:0,angry_count:0,panda_count:0}), comment_count:data?.length ?? 0 } }));
    setCommentText("");
    setCommentPost(null);
    toast.success("Comment posted");
  };

  const shareSecret = async (secret:Secret) => {
    const url = window.location.origin + "/secret/" + userId + "#" + secret.id;
    try {
      if (navigator.share) await navigator.share({ title:"Secret Panda Profile", text:secret.content, url });
      else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    } catch (e:any) { if (e?.name !== "AbortError") toast.error("Could not share this secret."); }
  };

  const focusComposer = () => {
    setComposerOpen(true);
    window.setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
      composerRef.current?.focus();
    }, 50);
  };

  if (loading) return <main className="min-h-screen bg-background p-5 text-center text-muted-foreground">Loading Secret Profile…</main>;
  if (!profile) return <main className="min-h-screen bg-background p-5"><div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 text-center"><p className="text-4xl">🐼</p><h1 className="mt-3 text-xl font-bold">Profile not found</h1><Link to="/" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Back to Circle</Link></div></main>;

  const reactionOptions = [
    {key:"heart",emoji:"❤️",label:"Heart"},{key:"laugh",emoji:"😂",label:"Laugh"},{key:"wow",emoji:"😮",label:"Wow"},
    {key:"angry",emoji:"😡",label:"Angry"},{key:"panda",emoji:"🐼",label:"Panda"},
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Circle Panda</Link>
          <Button variant="outline" size="sm" onClick={() => void navigator.share?.({title:"Secret Panda Profile",text:"Leave a secret about this Panda.",url:window.location.href})}><Share2 className="mr-1 size-4" /> Share</Button>
        </div>

        <section className="panda-panel rounded-3xl p-4 text-center">
          <VipIdentity isVip={Boolean(profile.is_vip)} seed={profile.id} avatar={profile.avatar_url || "🐼"} />
          <h1 className="mt-2 font-display text-xl font-bold">{profile.display_name}</h1>
          {profile.country ? <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{profile.country}</p> : null}
          <p className="mx-auto mt-2 max-w-md text-xs font-bold leading-5 text-red-500 dark:text-red-400">Post on this secret page and they will not know it was you. Feel free.</p>
          <Button className="mt-3 h-9 rounded-xl px-4 text-xs font-black" onClick={focusComposer}><Send className="mr-1.5 size-3.5" /> Post a Secret</Button>
        </section>

        <section className="space-y-4">
          <div className="px-1">
            <h2 className="font-display text-2xl font-black leading-tight">Secrets about {profile.display_name}</h2>
          </div>

          <div className="space-y-4">
            {secrets.length ? secrets.map((secret,index) => {
              const ix = interactions[secret.id] ?? {reaction:null,reaction_count:0,comment_count:0,heart_count:0,laugh_count:0,wow_count:0,sad_count:0,angry_count:0,panda_count:0};
              const selected = reactionOptions.find((r) => r.key === ix.reaction);
              const showAd = adAfter(index + 1) === index + 1;
              return <div key={secret.id} className="space-y-3">
                <article id={secret.id} className="min-w-0 rounded-[1.65rem] border border-border/70 bg-card p-5 shadow-sm">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <VipIdentity isVip={false} seed={secret.id} avatar="🐼" compact />
                    <span className="min-w-0 truncate"><Eye className="mr-1 inline size-3.5" /> Anonymous Panda</span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7">{secret.content}</p>
                  <div className="relative mt-4 w-full border-t border-border/50 pt-3">
                    <div className="grid w-full grid-cols-3 items-center gap-1">
                    <Button variant={selected ? "default" : "ghost"} size="sm" className="w-full min-w-0 rounded-full px-1 text-xs" aria-label="React to secret" onClick={() => setReactionMenuId(reactionMenuId===secret.id?null:secret.id)}>
                      {selected ? <><span className="text-base leading-none">{selected.emoji}</span><span className="ml-1 text-[10px]">{ix.reaction_count}</span></> : <><SmilePlus className="mr-1 size-4" /><span className="text-[10px]">{ix.reaction_count}</span></>}
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full min-w-0 rounded-full px-1 text-xs" onClick={() => void openComments(secret)}><MessageCircle className="mr-1 size-4 shrink-0" /> Comment <span className="ml-1 text-[10px]">{ix.comment_count}</span></Button>
                    <Button variant="ghost" size="sm" className="w-full min-w-0 rounded-full px-1 text-xs" onClick={() => void shareSecret(secret)}><Share2 className="mr-1 size-4 shrink-0" /> Share</Button>
                    </div>
                    {reactionMenuId===secret.id ? <div className="absolute bottom-full left-0 z-50 mb-2 flex max-w-[calc(100vw-2rem)] flex-wrap gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl">
                      {reactionOptions.map((r)=><button key={r.key} type="button" title={r.label} onClick={()=>void react(secret.id,r.key)} className="grid size-10 place-items-center rounded-full text-xl hover:bg-secondary">{r.emoji}</button>)}
                    </div> : null}
                  </div>
                  {commentsBySecret[secret.id]?.length ? <div className="mt-3 space-y-2 rounded-2xl bg-secondary/30 p-3">
                    {commentsBySecret[secret.id].slice(-3).map((comment)=><div key={comment.id} className="text-sm"><span className="font-semibold">Anonymous Panda</span><span className="text-muted-foreground"> · {comment.body}</span></div>)}
                  </div> : null}
                </article>
                {showAd ? <StandardBannerAd placement={adSlotForCount(index + 1)} variant="card" /> : null}
              </div>;
            }) : <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No secrets yet. Be the first.</p>}
          </div>

          {composerOpen ? <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="font-display text-lg font-bold">Post your secret</h2><p className="mt-1 text-xs text-muted-foreground">Your secret about {profile.display_name} is posted anonymously.</p></div>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={()=>setComposerOpen(false)}>Close</Button>
              </div>
              <textarea ref={composerRef} value={content} onChange={(e)=>setContent(e.target.value)} maxLength={1000} placeholder="Write a secret about this Panda…" className="cp-input mt-4 min-h-28 w-full resize-y" />
              <Button className="mt-3 w-full rounded-2xl" disabled={posting || content.trim().length<3} onClick={async()=>{ if (await submit()) setComposerOpen(false); }}>{posting ? "Posting…" : <><Send className="mr-2 size-4" /> Post secret anonymously</>}</Button>
            </div>
          </div> : null}
        </section>

        <div className="rounded-2xl border border-border/70 bg-card p-4 text-center text-xs text-muted-foreground">
          <p>Want your own Secret Profile?</p>
          <Link to="/login" className="mt-1 inline-flex items-center gap-1 font-bold text-primary"><Copy className="size-3" /> Log in or create your Panda</Link>
        </div>
      </div>

      <DialogPlaceholder commentPost={commentPost} setCommentPost={setCommentPost} commentText={commentText} setCommentText={setCommentText} submitComment={submitComment} />
    </main>
  );
}

function DialogPlaceholder({commentPost,setCommentPost,commentText,setCommentText,submitComment}:{commentPost:Secret|null;setCommentPost:(v:Secret|null)=>void;commentText:string;setCommentText:(v:string)=>void;submitComment:()=>Promise<void>}) {
  if (!commentPost) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold">Comment on this secret</h2>
      <p className="mt-1 text-xs text-muted-foreground">Your comment is shown as Anonymous Panda.</p>
      <textarea value={commentText} onChange={(e)=>setCommentText(e.target.value)} maxLength={1000} className="cp-input mt-3 min-h-28 w-full" placeholder="Write a comment..." />
      <div className="mt-3 flex gap-2"><Button variant="outline" className="flex-1 rounded-xl" onClick={()=>setCommentPost(null)}>Cancel</Button><Button className="flex-1 rounded-xl" disabled={!commentText.trim()} onClick={()=>void submitComment()}>Post comment</Button></div>
    </div>
  </div>;
}
