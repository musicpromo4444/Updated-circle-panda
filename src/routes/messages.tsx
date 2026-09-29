import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Heart, Send, ShieldBan, X, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TimeAgo } from "@/components/TimeAgo";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type Search = { thread?: string };
type PendingDatingDecision = { connection_id:string; other_id:string; other_name:string; other_age:number; other_vibe:string; other_blurred_photo_path:string; reveal_at:string; matched_at:string };

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["thread"] === "string" ? { thread: search["thread"] } : {},
  head: () => ({
    meta: [
      { title: "Direct Messages — Circle Panda" },
      {
        name: "description",
        content: "Anonymous direct messages with no expiry. Every message sent costs 1 Panda Coin.",
      },
      { property: "og:title", content: "Direct Messages — Circle Panda" },
      { property: "og:description", content: "Pay-per-message anonymous chats, 1 BC each." },
    ],
  }),
  component: MessagesPage,
});

function DatingPhotoBubble({ path, onOpen }: { path?: string; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    let active = true;
    if (!path) return;
    void supabase.storage.from("dating-photos").createSignedUrl(path, 120).then(({data,error}:any) => {
      if (active && !error && data?.signedUrl) {
        setUrl(data.signedUrl);
        window.setTimeout(() => { if (active) setRevealed(true); }, 80);
      }
    });
    return () => { active = false; };
  }, [path]);
  if (!url) return <div className="grid size-44 place-items-center rounded-2xl bg-secondary text-4xl">💗</div>;
  return <button type="button" onClick={() => onOpen(url)} className="block overflow-hidden rounded-2xl border border-[var(--dating)]/30 bg-card shadow-sm" aria-label="Open matched photo">
    <img src={url} alt="Dating match" className={`h-44 w-44 object-cover transition-all duration-700 ease-out ${revealed ? "blur-0 scale-100 opacity-100" : "blur-md scale-110 opacity-70"}`} draggable={false} onContextMenu={(e)=>e.preventDefault()} />
  </button>;
}

function MessagesPage() {
  const { threads, sendMessage, coins } = useStore();
  const search = useSearch({ from: "/messages" });
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(search.thread ?? null);
  const [draft, setDraft] = useState("");
  const [crushRequests, setCrushRequests] = useState<any[]>([]);
  const [messageRequests, setMessageRequests] = useState<any[]>([]);
  const [pendingDating, setPendingDating] = useState<PendingDatingDecision | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (search.thread) setActiveId(search.thread);
  }, [search.thread]);

  useEffect(() => {
    const refresh = () => {
      void (supabase as any).rpc("get_pending_dating_decisions_secure").then(({ data, error }: any) => {
        if (!error && Array.isArray(data)) setPendingDating(data[0] ?? null);
      });
    };
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void (supabase as any).rpc("get_my_crush_message_requests").then(({ data }: any) => setCrushRequests(data ?? []));
    void (supabase as any).from("direct_message_requests").select("id,sender_id,message,kind,created_at").eq("status","pending").order("created_at",{ascending:false}).then(({data,error}:any)=>{ if(!error) setMessageRequests(data??[]); });
    void (supabase as any).rpc("get_pending_dating_decisions_secure").then(({data,error}:any)=>{
      if (!error && Array.isArray(data) && data.length) setPendingDating(data[0]);
    });
  }, []);

  const decideDating = async (decision: "continue" | "ignore") => {
    if (!pendingDating || decisionBusy) return;
    setDecisionBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("decide_dating_match_secure", {
        p_connection_id: pendingDating.connection_id,
        p_decision: decision,
      });
      if (error) throw error;
      setPendingDating(null);
      if (data?.status === "matched" && data?.thread_id) {
        toast.success("It's a match 💗", { description: "Their photo is now in your Dating Chat." });
        void navigate({ to: "/messages", search: { thread: data.thread_id } });
      } else if (data?.status === "waiting") {
        toast.success("Match saved 💗", { description: "Waiting for the other person to accept too." });
      } else if (data?.status === "ended") {
        toast("Dating connection ended");
      }
    } catch (e:any) {
      toast.error(e?.message ?? "Could not save your decision");
    } finally {
      setDecisionBusy(false);
    }
  };

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    if (activeId) void (supabase as any).rpc("mark_direct_thread_read", { p_thread_id: activeId });
  }, [activeId, active?.messages.length]);

  if (!active) {
    return (
      <AppShell title="Direct Messages" subtitle="Requests first. Normal messages cost 1 BC; VIP messages are free.">
        <div className="space-y-3">
          {messageRequests.length ? (
            <section className="panda-panel rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2"><span className="text-lg">💬</span><div><p className="font-display text-sm font-bold">Message requests</p><p className="text-[11px] text-muted-foreground">Accept before a direct chat can begin.</p></div></div>
              <div className="mt-3 space-y-2">
                {messageRequests.map((r:any)=>(
                  <div key={r.id} className="rounded-xl bg-background p-3">
                    <p className="text-[10px] font-bold text-muted-foreground">Anonymous Panda · {r.kind === "dating" ? "Dating request" : "Message request"}</p>
                    {r.message ? <p className="mt-1 text-sm">{r.message}</p> : null}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" className="gap-1" onClick={()=>void (supabase as any).rpc("respond_direct_message_request_secure",{p_request_id:r.id,p_accept:true}).then(({data,error}:any)=>{if(error)throw error;setMessageRequests(x=>x.filter(y=>y.id!==r.id));if(data?.thread_id) void navigate({to:"/messages",search:{thread:data.thread_id}});})}><Check className="size-3.5"/>Accept</Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={()=>void (supabase as any).rpc("respond_direct_message_request_secure",{p_request_id:r.id,p_accept:false}).then(({error}:any)=>{if(error)throw error;setMessageRequests(x=>x.filter(y=>y.id!==r.id));})}><X className="size-3.5"/>Decline</Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={()=>void (supabase as any).rpc("block_user_secure",{p_user_id:r.sender_id}).then(({error}:any)=>{if(error)throw error;setMessageRequests(x=>x.filter(y=>y.id!==r.id));})}><ShieldBan className="size-3.5"/>Block</Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {crushRequests.length ? (
            <section className="panda-panel rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2"><span className="text-lg">💌</span><div><p className="font-display text-sm font-bold">Crush message requests</p><p className="text-[11px] text-muted-foreground">Anonymous messages sent to your MCM/WCW picture.</p></div></div>
              <div className="mt-3 space-y-2">
                {crushRequests.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="rounded-xl bg-background p-3">
                    <p className="text-[10px] font-bold text-muted-foreground">Anonymous Panda · Message Request</p>
                    {r.body ? <p className="mt-1 text-sm">{r.body}</p> : null}
                    {r.attachment_url ? <a href={r.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary">📎 View attachment</a> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {threads.map((t, idx) => (
            <div key={t.id} className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveId(t.id)}
                className="panda-panel flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-accent/40"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-lg">
                  {t.kind === "dating" ? "💗" : "🐼"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.name}</span>
                    {t.kind === "dating" ? (
                      <span className="rounded-full bg-[var(--dating)]/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--dating)] uppercase">
                        Dating
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {t.messages.at(-1)?.body ?? t.blurb}
                  </span>
                </span>
                {t.messages.length ? (
                  <TimeAgo
                    at={t.messages.at(-1)!.at}
                    className="shrink-0 text-[11px] text-muted-foreground"
                  />
                ) : null}
              </button>
              {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} /> : null}
            </div>
          ))}
        </div>
      <Dialog open={!!pendingDating} onOpenChange={(open)=>{ if (!open && !decisionBusy) setPendingDating(null); }}>
        <DialogContent className="max-w-md overflow-hidden border-[var(--dating)]/30 p-0">
          {pendingDating ? (
            <div>
              <div className="absolute inset-0 bg-[var(--dating)]/10 backdrop-blur-[2px]" />
              <div className="relative p-6">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[var(--dating)]/15 text-[var(--dating)]">
                  <Heart className="size-7 fill-current" />
                </div>
                <DialogTitle className="text-center font-display text-2xl">72-hour Dating period ended</DialogTitle>
                <DialogDescription className="mt-2 text-center">
                  You and {pendingDating.other_name} completed the 72-hour dating period. Do you want to continue and match?
                </DialogDescription>
                <div className="mx-auto mt-5 size-40 overflow-hidden rounded-3xl border-4 border-background/70 shadow-xl">
                  {pendingDating.other_blurred_photo_path ? (
                    <img src={supabase.storage.from("dating-photo-blur").getPublicUrl(pendingDating.other_blurred_photo_path).data.publicUrl} alt="Blurred dating match" className="size-full object-cover blur-md scale-105" draggable={false} />
                  ) : <div className="grid size-full place-items-center bg-secondary text-5xl">🐼</div>}
                </div>
                <p className="mt-3 text-center text-sm font-semibold">{pendingDating.other_name} · {pendingDating.other_age}</p>
                <p className="mt-1 text-center text-xs text-muted-foreground">{pendingDating.other_vibe || "Anonymous Panda"}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button variant="outline" disabled={decisionBusy} onClick={()=>void decideDating("ignore")}>Ignore</Button>
                  <Button disabled={decisionBusy} onClick={()=>void decideDating("continue")} className="gap-2 bg-[var(--dating)] text-white hover:bg-[var(--dating)]/90">
                    <Sparkles className="size-4" /> Match
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </AppShell>
    );
  }

  return (
    <AppShell title="Chat" subtitle={`Balance: ${coins} BC · normal messages 1 BC · VIP free · dating free for 72h`}>
      <div className="panda-panel overflow-hidden rounded-2xl">
        {active.kind === "dating" ? (
          <div className="flex items-center justify-center gap-2 bg-[var(--dating)] px-4 py-2 font-display text-sm font-bold tracking-[0.18em] text-[var(--dating-foreground)] uppercase">
            <Heart className="size-4 fill-current" /> Dating Chat
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => setActiveId(null)}
          >
            <ChevronLeft className="size-4" /> All
          </Button>
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-sm">
            {active.kind === "dating" ? "💗" : "🐼"}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium">{active.name}</p>
            <p className="text-[11px] text-muted-foreground">{active.blurb}</p>
          </div>
        </div>

        <div className="max-h-[50vh] min-h-48 space-y-2.5 overflow-y-auto bg-secondary/20 p-3">
          {active.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Say something first. Dating Chat is free for the first 72 hours.
            </p>
          ) : (
            active.messages.map((m, idx) => (
              <div key={m.id} className="space-y-2.5">
                <div className={m.mine ? "text-right" : ""}>
                  {m.messageType === "dating_photo" && active.kind === "dating" ? (
                    <DatingPhotoBubble path={m.mediaPath} onOpen={setPhotoPreviewUrl} />
                  ) : (
                    <p className={`inline-block max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.mine
                        ? active.kind === "dating"
                          ? "bg-[var(--dating)] text-[var(--dating-foreground)]"
                          : "bg-primary text-primary-foreground"
                        : "bg-card"
                    }`}>
                      {m.body}
                    </p>
                  )}
                  <TimeAgo at={m.at} className="mt-0.5 block text-[10px] text-muted-foreground" />
                </div>

                {/* Standard Banner Ad after every sequence of 4 chat messages */}
                {(idx + 1) % 4 === 0 ? (
                  <div className="py-1">
                    <StandardBannerAd index={Math.floor(idx / 4)} className="mx-auto max-w-md" />
                  </div>
                ) : null}
              </div>
            ))
          )}
          <div ref={bottom} />
        </div>

        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            sendMessage(active.id, draft.trim());
            setDraft("");
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={active.kind === "dating" ? "Type a message (free for 72h)…" : "Type a message (1 BC)…"}
          />
          <Button type="submit" className="shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      <Dialog open={!!photoPreviewUrl} onOpenChange={(open)=>{ if(!open) setPhotoPreviewUrl(null); }}>
        <DialogContent className="max-w-3xl border-none bg-black/90 p-2">
          <DialogTitle className="sr-only">Matched dating photo</DialogTitle>
          <DialogDescription className="sr-only">Full-size matched dating photo.</DialogDescription>
          {photoPreviewUrl ? <img src={photoPreviewUrl} alt="Matched dating photo" className="max-h-[82vh] w-full rounded-xl object-contain" draggable={false} onContextMenu={(e)=>e.preventDefault()} /> : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
