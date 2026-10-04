import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Heart, Send, ShieldBan, X, Sparkles, Phone, Video, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TimeAgo } from "@/components/TimeAgo";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { VipPrivateCall } from "@/components/messages/VipPrivateCall";

type Search = { thread?: string; request?: string };
type PendingDatingDecision = { connection_id:string; other_id:string; other_name:string; other_age:number; other_vibe:string; other_blurred_photo_path:string; reveal_at:string; matched_at:string };

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["thread"] === "string" || typeof search["request"] === "string" ? { thread: typeof search["thread"] === "string" ? search["thread"] : undefined, request: typeof search["request"] === "string" ? search["request"] : undefined } : {},
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
  const { threads, sendMessage, coins, isVip, refreshThreads } = useStore();
  const search = useSearch({ from: "/messages" });
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(search.thread ?? null);
  const [draft, setDraft] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(search.request ?? null);
  const [messageRequests, setMessageRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [pendingDating, setPendingDating] = useState<PendingDatingDecision | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (search.thread) setActiveId(search.thread);
    if (search.request) setSelectedRequestId(search.request);
  }, [search.thread, search.request]);

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
    let active = true;
    const loadRequests = async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid || !active) return;
      const [incomingRes, outgoingRes] = await Promise.all([
        (supabase as any).from("direct_message_requests").select("id,sender_id,message,kind,created_at,status").eq("recipient_id",uid).eq("status","pending").order("created_at",{ascending:false}),
        (supabase as any).from("direct_message_requests").select("id,recipient_id,message,kind,created_at,status,responded_at,thread_id").eq("sender_id",uid).in("status",["pending","accepted"]).order("created_at",{ascending:false}).limit(50),
      ]);
      if (!active) return;
      if (!incomingRes.error) {
        const rows = incomingRes.data ?? [];
        setMessageRequests(rows);
        if (search.request && rows.some((r:any) => r.id === search.request)) setSelectedRequestId(search.request);
      }
      if (!outgoingRes.error) setSentRequests(outgoingRes.data ?? []);
    };
    void loadRequests();
    const requestChannel = supabase.channel("message-requests-live")
      .on("postgres_changes", {event:"*", schema:"public", table:"direct_message_requests"}, () => void loadRequests())
      .subscribe();
    void (supabase as any).rpc("get_pending_dating_decisions_secure").then(({data,error}:any)=>{
      if (!error && Array.isArray(data) && data.length) setPendingDating(data[0]);
    });
    return () => {
      active = false;
      void supabase.removeChannel(requestChannel);
    };
  }, [search.request]);

  const respondRequest = async (request: any, accept: boolean) => {
    try {
      const { data, error } = await (supabase as any).rpc("respond_direct_message_request_secure", { p_request_id: request.id, p_accept: accept });
      if (error) throw error;
      setMessageRequests((current) => current.filter((r) => r.id !== request.id));
      setSentRequests((current) => current.map((r) => r.id === request.id ? { ...r, status: accept ? "accepted" : "declined", thread_id: data?.thread_id ?? r.thread_id } : r));
      setSelectedRequestId((current) => current === request.id ? null : current);
      if (accept && data?.thread_id) {
        // Acceptance converts the request into a real thread. Refresh the shared
        // thread store first so the chat card is present before navigation.
        await refreshThreads();
        toast.success("Request accepted 💬");
        void navigate({ to: "/messages", search: { thread: data.thread_id } });
      } else if (!accept) {
        toast.success("Request declined");
      }
    } catch (e:any) {
      toast.error(e?.message ?? "Could not respond to request");
    }
  };

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
    let activePolling = true;
    const checkIncoming = async () => {
      if (!isVip || !activePolling || callId) return;
      const { data } = await (supabase as any).rpc("get_my_incoming_vip_calls");
      if (activePolling && Array.isArray(data) && data[0]?.id) setIncomingCallId(String(data[0].id));
    };
    void checkIncoming();
    const timer = window.setInterval(() => void checkIncoming(), 3000);
    return () => { activePolling = false; window.clearInterval(timer); };
  }, [isVip, callId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    if (activeId) void (supabase as any).rpc("mark_direct_thread_read", { p_thread_id: activeId });
  }, [activeId, active?.messages.length]);

  if (!active) {
    return (
      <AppShell title="Messages" subtitle="Real conversations · 1 BC per normal message · VIP free · Dating free for 72 hours">
        <div className="space-y-3">
          {messageRequests.length ? (
            <section className="panda-panel rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2"><span className="text-lg">💌</span><div><p className="font-display text-sm font-bold">Message requests</p><p className="text-[11px] text-muted-foreground">Open a request or accept/decline it directly.</p></div></div>
              <div className="mt-3 space-y-2">
                {messageRequests.map((r:any)=>(
                  <div key={r.id} className="rounded-xl bg-background p-3">
                    <button type="button" className="w-full text-left" onClick={() => setSelectedRequestId(r.id)}>
                      <p className="text-[10px] font-bold text-muted-foreground">Anonymous Panda · {r.kind === "crush" ? "MCM/WCW Message Request" : r.kind === "dating" ? "Dating request" : "Message request"}</p>
                      {r.message ? <p className="mt-1 line-clamp-2 text-sm">{r.message}</p> : null}
                    </button>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" className="gap-1" onClick={() => void respondRequest(r,true)}><Check className="size-3.5"/>Accept</Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => void respondRequest(r,false)}><X className="size-3.5"/>Decline</Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => void (supabase as any).rpc("block_user_secure",{p_user_id:r.sender_id}).then(({error}:any)=>{if(error)throw error;setMessageRequests(x=>x.filter(y=>y.id!==r.id));}).catch((e:any)=>toast.error(e?.message??"Could not block user"))}><ShieldBan className="size-3.5"/>Block</Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {sentRequests.length ? (
            <section className="panda-panel rounded-2xl border border-[var(--dating)]/20 bg-[var(--dating)]/5 p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📨</span>
                <div>
                  <p className="font-display text-sm font-bold">Sent message requests</p>
                  <p className="text-[11px] text-muted-foreground">Your Dating requests stay here until they are accepted. Declined requests disappear.</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {sentRequests.map((r:any) => (
                  <div key={r.id} className="rounded-xl bg-background p-3">
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Anonymous Panda · {r.kind === "dating" ? "Dating Message Request" : r.kind === "crush" ? "MCM/WCW Message Request" : "Message Request"}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {r.status === "pending" ? "Sent request" : "Request accepted 💗"}
                    </p>
                    {r.message ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.message}</p> : null}
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
                className={`panda-panel flex min-h-[84px] w-full items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-accent/40 ${t.kind === "dating" ? "border-2 border-red-500/30 bg-red-500/5" : ""}`}
              >
                {t.kind === "dating" ? (
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-500 shadow-sm">
                    <Heart className="size-8 fill-current" />
                  </span>
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-xl">🐼</span>
                )}
                <span className="min-w-0 flex-1">
                  {t.kind === "dating" ? (
                    <span className="mb-1 flex items-center gap-2 text-red-500">
                      <Heart className="size-4 fill-current" />
                      <span className="font-display text-xs font-black tracking-[0.16em] uppercase">Dating Message</span>
                    </span>
                  ) : null}
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{t.name}</span>
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
              {(idx + 1) % 4 === 0 ? <StandardBannerAd index={Math.floor(idx / 4)} placement="messages_inline" /> : null}
            </div>
          ))}
        </div>
      <Dialog open={!!selectedRequestId} onOpenChange={(open) => { if (!open) { setSelectedRequestId(null); void navigate({ to: "/messages" }); } }}>
        <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none border-0 bg-background p-0">
          {(() => {
            const request = messageRequests.find((r:any) => r.id === selectedRequestId);
            if (!request) return null;
            return <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedRequestId(null)}><ChevronLeft className="size-5"/></Button>
                <span className="grid size-10 place-items-center rounded-full bg-secondary text-xl">🐼</span>
                <div className="min-w-0 flex-1"><p className="font-semibold">Anonymous Panda</p><p className="text-[11px] text-muted-foreground">{request.kind === "crush" ? "MCM/WCW Message Request" : request.kind === "dating" ? "Dating Message Request" : "Message Request"}</p></div>
              </div>
              <div className="flex-1 overflow-y-auto bg-secondary/20 p-4">
                <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm shadow-sm">{request.message || "This Panda sent you a message request."}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button variant="outline" onClick={() => void respondRequest(request,false)}>Decline</Button>
                <Button onClick={() => void respondRequest(request,true)} className="gap-2"><Check className="size-4"/>Accept & Reply</Button>
              </div>
            </div>;
          })()}
        </DialogContent>
      </Dialog>

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
      <div className="panda-panel flex min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl">
        {active.kind === "dating" ? (
          <div className="flex items-center justify-center gap-2 bg-[var(--dating)] px-4 py-2 font-display text-sm font-bold tracking-[0.18em] text-[var(--dating-foreground)] uppercase">
            <Heart className="size-4 fill-current" /> Dating Chat
          </div>
        ) : null}

        <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => setActiveId(null)}
          >
            <ChevronLeft className="size-4" /> All
          </Button>
          <span className={`grid size-11 place-items-center rounded-full ${active.kind === "dating" ? "bg-red-500/15 text-red-500" : "bg-secondary text-lg"}`}>
            {active.kind === "dating" ? <Heart className="size-6 fill-current" /> : "🐼"}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold">{active.name}</p>
            <p className={active.kind === "dating" ? "text-[11px] font-bold text-red-500" : "text-[11px] text-muted-foreground"}>{active.kind === "dating" ? "DATING MESSAGE · FREE FOR 72 HOURS" : active.otherVip ? "VIP private chat · calls free" : "Direct message · 1 BC per message"}</p>
          </div>
          {active.kind === "dm" && active.otherVip && isVip ? (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="VIP voice call" onClick={async()=>{ const {data,error}=await (supabase as any).rpc("start_vip_private_call",{p_thread_id:active.id,p_call_type:"voice"}); if(error){toast.error(error.message??"Call unavailable");return;} setCallId(String(data.id)); }}>
                <Phone className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="VIP video call" onClick={async()=>{ const {data,error}=await (supabase as any).rpc("start_vip_private_call",{p_thread_id:active.id,p_call_type:"video"}); if(error){toast.error(error.message??"Call unavailable");return;} setCallId(String(data.id)); }}>
                <Video className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-secondary/20 p-3 sm:p-5">
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
          className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            sendMessage(active.id, draft.trim());
            setDraft("");
          }}
        >
          <Input
            className="h-12 rounded-2xl px-4"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={active.kind === "dating" ? "Type a message (free for 72h)…" : "Type a message (1 BC)…"}
          />
          <Button type="submit" className="h-12 w-12 shrink-0 rounded-2xl">
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      <VipPrivateCall callId={callId} onClose={()=>setCallId(null)} />
      <VipPrivateCall callId={incomingCallId} incoming onClose={()=>setIncomingCallId(null)} />
      
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
