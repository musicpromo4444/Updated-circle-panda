import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Eye, Lock, Send, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { VipIdentity } from "@/components/VipIdentity";

type SharedProfile = { id: string; display_name: string; avatar_url?: string | null; bio?: string | null; country?: string | null; is_vip?: boolean };
type Secret = { id: string; content: string; created_at: string };

export const Route = createFileRoute("/secret/$userId")({
  head: () => ({ meta: [{ title: "Secret Panda Profile — Circle Panda" }] }),
  component: SecretProfilePage,
});

function SecretProfilePage() {
  const adAfter = (count: number) => count === 5 || count === 10 || count === 17 || count === 24 ? count : count > 24 && (count - 24) % 10 === 0 ? count : -1;
  const adSlotForCount = (count: number) => count === 5 ? "secret_profile_slot_1" : count === 10 ? "secret_profile_slot_2" : count === 17 ? "secret_profile_slot_3" : "secret_profile_slot_4";
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [justPosted, setJustPosted] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: profileData }, { data: secretData }] = await Promise.all([
        (supabase as any).rpc("get_shared_profile_public", { p_user_id: userId }),
        (supabase as any).from("profile_secrets").select("id,content,created_at").eq("target_user_id", userId).eq("is_published", true).order("created_at", { ascending: false }).limit(50),
      ]);
      setProfile(Array.isArray(profileData) ? profileData[0] ?? null : profileData ?? null);
      setSecrets(secretData ?? []);
      setLoading(false);
    })();
  }, [userId]);

  const submit = async () => {
    if (content.trim().length < 3) return toast.error("Write at least 3 characters.");
    setPosting(true);
    const { data, error } = await (supabase as any).rpc("submit_profile_secret", { p_target_user_id: userId, p_content: content.trim() });
    setPosting(false);
    if (error) return toast.error(error.message);
    if (data) setSecrets((current) => [{ id: String(data), content: content.trim(), created_at: new Date().toISOString() }, ...current]);
    setContent("");
    setJustPosted(true);
    toast.success("Secret posted anonymously.");
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "Secret Panda Profile", text: "Leave a secret about this Panda.", url }); } catch {}
    } else {
      await navigator.clipboard?.writeText(url);
      toast.success("Secret Profile link copied.");
    }
  };

  if (loading) return <main className="min-h-screen bg-background p-5 text-center text-muted-foreground">Loading Secret Profile…</main>;
  if (!profile) return <main className="min-h-screen bg-background p-5"><div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 text-center"><p className="text-4xl">🐼</p><h1 className="mt-3 text-xl font-bold">Profile not found</h1><Link to="/" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Back to Circle</Link></div></main>;

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Circle Panda</Link>
          <Button variant="outline" size="sm" onClick={() => void share()}><Share2 className="mr-1 size-4" /> Share</Button>
        </div>

        <section className="panda-panel rounded-3xl p-6 text-center">
          <VipIdentity isVip={Boolean(profile.is_vip)} seed={profile.id} avatar={profile.avatar_url || "🐼"} />
          <h1 className="mt-3 font-display text-2xl font-bold">{profile.display_name}</h1>
          {profile.country ? <p className="mt-1 text-sm text-muted-foreground">{profile.country}</p> : null}
          {profile.bio ? <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{profile.bio}</p> : null}
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <Eye className="mx-auto mb-1 size-4 text-primary" /> Browse the public profile and secrets. No account is required to read or leave a secret.
          </div>
        </section>

        <section className="panda-panel rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10"><Lock className="size-5 text-primary" /></span>
            <div><h2 className="font-display text-lg font-bold">Secrets about {profile.display_name}</h2><p className="mt-1 text-xs text-muted-foreground">People can leave anonymous secrets about this Panda. The author's identity is never displayed here.</p></div>
          </div>
          <div className="mt-4 space-y-3">
            {secrets.length ? secrets.map((secret, index) => {
              const count = index + 1;
              const showAd = adAfter(count) === count;
              return (
                <div key={secret.id} className="space-y-3">
                  <article className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{secret.content}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">{new Date(secret.created_at).toLocaleString()}</p>
                  </article>
                  {showAd ? <StandardBannerAd placement={adSlotForCount(count)} variant="card" /> : null}
                </div>
              );
            }) : <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No secrets yet. Be the first.</p>}
          </div>

          <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-sm font-bold">Anyone can post a secret — no account required.</p>
            <p className="mt-1 text-xs text-muted-foreground">Your secret is published first. Then you can create a free Circle Panda account.</p>
          </div>
          {!justPosted ? (
            <div className="mt-4 space-y-3">
              <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} placeholder="Write a secret about this Panda…" className="cp-input min-h-28 w-full resize-y" />
              <Button className="w-full rounded-2xl" disabled={posting || content.trim().length < 3} onClick={() => void submit()}>{posting ? "Posting…" : <><Send className="mr-2 size-4" /> Post secret anonymously</>}</Button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-sm font-bold">Your secret has been published anonymously.</p>
              <p className="mt-1 text-xs text-muted-foreground">Create a free Circle Panda account to continue.</p>
              <Link to="/register" search={{ redirect: "/secret/" + userId } as any} className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Create my free account</Link>
              <Button variant="ghost" className="mt-1 w-full" onClick={() => setJustPosted(false)}>Post another secret</Button>
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-border/70 bg-card p-4 text-center text-xs text-muted-foreground">
          <p>Want your own Secret Profile?</p>
          <Link to="/login" className="mt-1 inline-flex items-center gap-1 font-bold text-primary"><Copy className="size-3" /> Log in or create your Panda</Link>
        </div>
      </div>
    </main>
  );
}
