import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Gift,
  BarChart3,
  Mic,
  Video,
  Plus,
  Users,
  Check,
  Play,
  Pause,
  Clock,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
} from "./vipLoungeData";

interface VipLoungeSpaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = "events" | "giveaways" | "polls" | "notes";

export function VipLoungeSpace({ open, onOpenChange }: VipLoungeSpaceProps) {
  const [data, setData] = useState({ events: [], giveaways: [], polls: [], notes: [] } as any);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingMime, setRecordingMime] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("events");

  // Sub-modal states
  const [hostEventModal, setHostEventModal] = useState(false);
  const [createGiveawayModal, setCreateGiveawayModal] = useState(false);
  const [createPollModal, setCreatePollModal] = useState(false);
  const [recordNoteModal, setRecordNoteModal] = useState(false);
  const [noteKind, setNoteKind] = useState<"voice" | "video">("voice");

  // Audio playback simulation
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState({
    title: "",
    category: "Campus Mixer",
    dateTime: "",
    location: "VIP Rooftop Lounge",
    description: "",
  });

  const [giveawayForm, setGiveawayForm] = useState({
    title: "",
    prize: "",
    bcAmount: 250,
    endsIn: "24 hours",
  });

  const [pollForm, setPollForm] = useState({
    question: "",
    option1: "",
    option2: "",
    option3: "",
  });

  const [mediaForm, setMediaForm] = useState({
    title: "",
    caption: "",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Hydrate shared VIP Lounge state from Supabase whenever the space opens.
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data: payload, error } = await (supabase as any).rpc("vip_lounge_list");
      if (error) { toast.error(error.message ?? "VIP Lounge could not be loaded"); return; }
      const signedNotes = await Promise.all((payload?.notes ?? []).map(async (n:any) => {
        const { data: signed } = await (supabase as any).storage.from("vip-lounge-media").createSignedUrl(n.media_path, 3600);
        return {...n, media_url:signed?.signedUrl};
      }));
      setData({
        events:(payload?.events ?? []).map((e:any)=>({id:e.id,title:e.title,host:e.creator_id===undefined?"VIP Member":"VIP Member",category:e.category,dateTime:new Date(e.starts_at).toLocaleString(),location:e.location,description:e.description,rsvps:Number(e.rsvps??0),hasRsvp:Boolean(e.has_rsvp)})),
        giveaways:(payload?.giveaways ?? []).map((g:any)=>({id:g.id,title:g.title,host:"VIP Member",prize:g.prize,bcAmount:Number(g.bc_amount??0),endsIn:new Date(g.ends_at).toLocaleString(),entriesCount:Number(g.entries_count??0),hasEntered:Boolean(g.has_entered),winner:g.winner_user_id,status:g.status})),
        polls:(payload?.polls ?? []).map((p:any)=>({id:p.id,question:p.question,author:"VIP Member",options:(p.options??[]).map((o:any)=>({id:o.id,text:o.text,votes:Number(o.votes??0)})),userVotedOptionId:p.user_voted_option_id,totalVotes:(p.options??[]).reduce((a:number,o:any)=>a+Number(o.votes??0),0),createdAt:new Date(p.created_at).toLocaleString()})),
        notes:signedNotes.map((n:any)=>({id:n.id,author:"VIP Member",type:n.kind,title:n.title,duration:`${Number(n.duration_seconds??0)}s`,createdAt:new Date(n.created_at).toLocaleString(),caption:n.caption||undefined,mediaUrl:n.media_url,likes:Number(n.likes??0),hasLiked:Boolean(n.has_liked)})),
      });
    })();
  }, [open]);

  // Audio timer ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const refresh = async () => {
    const { data: payload, error } = await (supabase as any).rpc("vip_lounge_list");
    if (error) { toast.error(error.message ?? "Could not refresh VIP Lounge"); return; }
    const signedNotes = await Promise.all((payload?.notes ?? []).map(async (n:any) => { const {data:signed}=await (supabase as any).storage.from("vip-lounge-media").createSignedUrl(n.media_path,3600); return {...n,media_url:signed?.signedUrl}; }));
    setData({
      events:(payload?.events??[]).map((e:any)=>({id:e.id,title:e.title,host:"VIP Member",category:e.category,dateTime:new Date(e.starts_at).toLocaleString(),location:e.location,description:e.description,rsvps:Number(e.rsvps??0),hasRsvp:Boolean(e.has_rsvp)})),
      giveaways:(payload?.giveaways??[]).map((g:any)=>({id:g.id,title:g.title,host:"VIP Member",prize:g.prize,bcAmount:Number(g.bc_amount??0),endsIn:new Date(g.ends_at).toLocaleString(),entriesCount:Number(g.entries_count??0),hasEntered:Boolean(g.has_entered),winner:g.winner_user_id,status:g.status})),
      polls:(payload?.polls??[]).map((p:any)=>({id:p.id,question:p.question,author:"VIP Member",options:(p.options??[]).map((o:any)=>({id:o.id,text:o.text,votes:Number(o.votes??0)})),userVotedOptionId:p.user_voted_option_id,totalVotes:(p.options??[]).reduce((a:number,o:any)=>a+Number(o.votes??0),0),createdAt:new Date(p.created_at).toLocaleString()})),
      notes:signedNotes.map((n:any)=>({id:n.id,author:"VIP Member",type:n.kind,title:n.title,duration:`${Number(n.duration_seconds??0)}s`,createdAt:new Date(n.created_at).toLocaleString(),caption:n.caption||undefined,mediaUrl:n.media_url,likes:Number(n.likes??0),hasLiked:Boolean(n.has_liked)})),
    });
  };

  const handleToggleRsvp = (eventId: string) => { void (async()=>{ const {error}=await (supabase as any).rpc("vip_lounge_toggle_rsvp",{p_event_id:eventId}); if(error){toast.error(error.message);return;} await refresh(); })(); };

  const handleSubmitEvent = (e: React.FormEvent) => { e.preventDefault(); if(!eventForm.title.trim()||!eventForm.dateTime){toast.error("Add an event title and date/time");return;} void (async()=>{ const {error}=await (supabase as any).rpc("vip_lounge_create_event",{p_title:eventForm.title,p_category:eventForm.category,p_starts_at:new Date(eventForm.dateTime).toISOString(),p_location:eventForm.location,p_description:eventForm.description}); if(error){toast.error(error.message);return;} toast.success("🎉 Event published to the VIP Lounge!"); setHostEventModal(false); setEventForm({title:"",category:"Campus Mixer",dateTime:"",location:"VIP Rooftop Lounge",description:""}); await refresh(); })(); };

  const handleJoinGiveaway = (id: string) => { void (async()=>{const {error}=await (supabase as any).rpc("vip_lounge_enter_giveaway",{p_giveaway_id:id}); if(error){toast.error(error.message);return;} toast.success("🎁 Entry confirmed!"); await refresh();})(); };

  const handleSubmitGiveaway = (e: React.FormEvent) => { e.preventDefault(); if(!giveawayForm.title.trim()||!giveawayForm.prize.trim()){toast.error("Please fill in the prize details");return;} const hours=Math.max(1,Number.parseInt(giveawayForm.endsIn)||24); void (async()=>{const {error}=await (supabase as any).rpc("vip_lounge_create_giveaway",{p_title:giveawayForm.title,p_prize:giveawayForm.prize,p_bc_amount:Number(giveawayForm.bcAmount)||0,p_ends_at:new Date(Date.now()+hours*3600000).toISOString()}); if(error){toast.error(error.message);return;} toast.success("🎁 VIP Giveaway is now live!"); setCreateGiveawayModal(false); setGiveawayForm({title:"",prize:"",bcAmount:250,endsIn:"24"}); await refresh();})(); };

  const handleVotePoll = (pollId: string, optionId: string) => { void (async()=>{const {error}=await (supabase as any).rpc("vip_lounge_vote_poll",{p_poll_id:pollId,p_option_id:optionId}); if(error){toast.error(error.message);return;} toast.success("Vote recorded in VIP Poll!"); await refresh();})(); };

  const handleSubmitPoll = (e: React.FormEvent) => { e.preventDefault(); const options=[pollForm.option1,pollForm.option2,pollForm.option3].map(x=>x.trim()).filter(Boolean); if(!pollForm.question.trim()||options.length<2){toast.error("Please provide a question and at least 2 options");return;} void (async()=>{const {error}=await (supabase as any).rpc("vip_lounge_create_poll",{p_question:pollForm.question,p_options:options}); if(error){toast.error(error.message);return;} toast.success("📊 VIP Poll published!"); setCreatePollModal(false); setPollForm({question:"",option1:"",option2:"",option3:""}); await refresh();})(); };

  const stopRecorder = () => { recorderRef.current?.stop(); streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null; };
  const toggleRecording = async () => {
    if(isRecording){ stopRecorder(); setIsRecording(false); return; }
    try {
      const stream=await navigator.mediaDevices.getUserMedia(noteKind==="video"?{audio:true,video:true}:{audio:true});
      streamRef.current=stream; const preferred=noteKind==="video"?"video/webm;codecs=vp8,opus":"audio/webm"; const mime=MediaRecorder.isTypeSupported(preferred)?preferred:"";
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined); recorderRef.current=recorder; chunksRef.current=[]; setRecordingMime(recorder.mimeType);
      recorder.ondataavailable=e=>{if(e.data.size) chunksRef.current.push(e.data);}; recorder.start(); setIsRecording(true);
    } catch { toast.error("Camera/microphone permission is required to record a VIP drop"); }
  };

  const handleSubmitNote = () => { if(!mediaForm.title.trim()){toast.error("Please add a title for your note");return;} if(!chunksRef.current.length){toast.error("Record the note before dropping it");return;} const blob=new Blob(chunksRef.current,{type:recordingMime||undefined}); void (async()=>{ const {data:{user}}=await supabase.auth.getUser(); if(!user){toast.error("Sign in required");return;} const ext=noteKind==="video"?"webm":"webm"; const path=`${user.id}/${crypto.randomUUID()}.${ext}`; const {error:uploadError}=await (supabase as any).storage.from("vip-lounge-media").upload(path,blob,{contentType:recordingMime||blob.type||"application/octet-stream",upsert:false}); if(uploadError){toast.error(uploadError.message);return;} const {error}=await (supabase as any).rpc("vip_lounge_create_note",{p_kind:noteKind,p_title:mediaForm.title,p_caption:mediaForm.caption,p_media_path:path,p_duration_seconds:Math.max(1,recordSeconds)}); if(error){await (supabase as any).storage.from("vip-lounge-media").remove([path]);toast.error(error.message);return;} toast.success(noteKind==="voice"?"🎙️ Voice note dropped into VIP Lounge!":"📹 Video note dropped into VIP Lounge!"); setRecordNoteModal(false); setIsRecording(false); setRecordSeconds(0); setMediaForm({title:"",caption:""}); chunksRef.current=[]; await refresh(); })(); };

  const handleToggleLike = (id: string) => { void (async()=>{const {error}=await (supabase as any).rpc("vip_lounge_toggle_note_like",{p_note_id:id}); if(error){toast.error(error.message);return;} await refresh();})(); };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-amber-400/60 bg-gradient-to-b from-card via-background to-amber-950/15 p-0 shadow-[0_0_50px_rgba(245,158,11,0.25)]">
          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-amber-400/30 bg-background/95 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-amber-400/60 bg-gradient-to-br from-amber-500/30 to-yellow-500/20 text-xl shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-foreground">VIP Lounge</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                      <Sparkles className="size-3" /> VERIFIED SPACE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Private creator hub • Events, giveaways, polls & media drops
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Hub
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-4 flex gap-1 rounded-xl bg-secondary/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => setActiveTab("events")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === "events"
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 border border-amber-400/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="size-3.5" /> Events ({data.events.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("giveaways")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === "giveaways"
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 border border-amber-400/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Gift className="size-3.5" /> Giveaways ({data.giveaways.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("polls")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === "polls"
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 border border-amber-400/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="size-3.5" /> Polls ({data.polls.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === "notes"
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 border border-amber-400/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mic className="size-3.5" /> Drops ({data.notes.length})
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-4">
            {/* TAB 1: HOST EVENTS */}
            {activeTab === "events" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Exclusive VIP Events</h3>
                    <p className="text-xs text-muted-foreground">
                      Host private mixers, AMAs, and campus gatherings
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setHostEventModal(true)}
                    className="gap-1.5 border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-semibold"
                  >
                    <Plus className="size-3.5" /> Host Event
                  </Button>
                </div>

                <div className="space-y-3">
                  {data.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-amber-400/30 bg-card p-4 shadow-sm transition-all hover:border-amber-400/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                            {event.category}
                          </span>
                          <h4 className="mt-1.5 font-display text-base font-bold text-foreground">
                            {event.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.description}
                          </p>
                        </div>
                        <span className="shrink-0 flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                          <Users className="size-3 text-amber-500" /> {event.rsvps} attending
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-amber-500" /> {event.dateTime}
                          </span>
                          <span>•</span>
                          <span>Hosted by {event.host}</span>
                        </div>

                        <Button
                          size="sm"
                          variant={event.hasRsvp ? "secondary" : "default"}
                          onClick={() => handleToggleRsvp(event.id)}
                          className={
                            event.hasRsvp
                              ? "gap-1.5 text-emerald-500 border border-emerald-500/30"
                              : "gap-1.5 bg-amber-500 text-neutral-950 font-semibold"
                          }
                        >
                          {event.hasRsvp ? (
                            <>
                              <Check className="size-3.5" /> Going
                            </>
                          ) : (
                            "RSVP VIP Pass"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: RUN GIVEAWAYS */}
            {activeTab === "giveaways" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">VIP Giveaways & Drops</h3>
                    <p className="text-xs text-muted-foreground">
                      Drop Black Coins or win verified rewards
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCreateGiveawayModal(true)}
                    className="gap-1.5 border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-semibold"
                  >
                    <Plus className="size-3.5" /> Run Giveaway
                  </Button>
                </div>

                <div className="space-y-3">
                  {data.giveaways.map((gw) => (
                    <div
                      key={gw.id}
                      className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-card to-amber-950/10 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-amber-400/50 bg-amber-500/20 text-2xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                            🎁
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display text-base font-bold text-foreground">
                                {gw.title}
                              </h4>
                            </div>
                            <p className="text-xs font-semibold text-amber-500 mt-0.5">
                              Prize: {gw.prize} ({gw.bcAmount} BC)
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Hosted by {gw.host}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="border-amber-400/40 text-amber-500 text-[10px]"
                        >
                          {gw.endsIn}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/60">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="size-3.5 text-amber-500" />
                          {gw.entriesCount} VIP participants
                        </span>

                        <Button
                          size="sm"
                          disabled={gw.hasEntered}
                          onClick={() => handleJoinGiveaway(gw.id)}
                          className={
                            gw.hasEntered
                              ? "bg-secondary text-muted-foreground"
                              : "bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold"
                          }
                        >
                          {gw.hasEntered ? "✓ Entry Confirmed" : "Enter Giveaway"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: POLL QUESTIONS */}
            {activeTab === "polls" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">VIP Community Polls</h3>
                    <p className="text-xs text-muted-foreground">
                      Shape decisions and vote anonymously
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCreatePollModal(true)}
                    className="gap-1.5 border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-semibold"
                  >
                    <Plus className="size-3.5" /> Post Poll
                  </Button>
                </div>

                <div className="space-y-4">
                  {data.polls.map((poll) => (
                    <div
                      key={poll.id}
                      className="rounded-2xl border border-amber-400/30 bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          {poll.question}
                        </h4>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {poll.createdAt}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">By {poll.author}</p>

                      {/* Options */}
                      <div className="mt-3 space-y-2">
                        {poll.options.map((opt) => {
                          const pct =
                            poll.totalVotes > 0
                              ? Math.round((opt.votes / poll.totalVotes) * 100)
                              : 0;
                          const isSelected = poll.userVotedOptionId === opt.id;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleVotePoll(poll.id, opt.id)}
                              className={`relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition-all ${
                                isSelected
                                  ? "border-amber-400 bg-amber-500/15"
                                  : "border-border bg-secondary/40 hover:bg-secondary/80"
                              }`}
                            >
                              {/* Background vote bar */}
                              <div
                                className="absolute inset-y-0 left-0 bg-amber-500/20 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative z-10 flex items-center justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5 text-foreground">
                                  {isSelected && (
                                    <Check className="size-3.5 text-amber-500 font-bold" />
                                  )}
                                  {opt.text}
                                </span>
                                <span className="text-muted-foreground font-semibold">
                                  {pct}% ({opt.votes})
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 text-right text-[11px] text-muted-foreground">
                        Total votes: {poll.totalVotes}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: VOICE & VIDEO NOTES */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">VIP Voice & Video Drops</h3>
                    <p className="text-xs text-muted-foreground">
                      Drop quick confidential notes & insider thoughts
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNoteKind("voice");
                        setRecordNoteModal(true);
                      }}
                      className="gap-1 border-amber-400/40 text-amber-500 hover:bg-amber-500/10"
                    >
                      <Mic className="size-3.5" /> Drop Voice
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setNoteKind("video");
                        setRecordNoteModal(true);
                      }}
                      className="gap-1 border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-semibold"
                    >
                      <Video className="size-3.5" /> Drop Video
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {data.notes.map((note) => {
                    const isPlaying = playingNoteId === note.id;

                    return (
                      <div
                        key={note.id}
                        className="rounded-2xl border border-amber-400/30 bg-card p-3.5 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 place-items-center rounded-lg bg-amber-500/15 text-amber-500">
                              {note.type === "voice" ? (
                                <Mic className="size-4" />
                              ) : (
                                <Video className="size-4" />
                              )}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-foreground leading-tight">
                                {note.author}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                {note.createdAt}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-amber-400/30 text-[10px] text-amber-500"
                          >
                            {note.duration}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-foreground">{note.title}</h4>
                          {note.caption && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {note.caption}
                            </p>
                          )}
                        </div>

                        {/* Real uploaded media player */}
                        {note.type === "voice" ? (
                          <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                            {note.mediaUrl ? <audio controls src={note.mediaUrl} className="w-full" /> : null}
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-xl border border-border bg-neutral-900">
                            {note.mediaUrl ? <video controls playsInline src={note.mediaUrl} className="aspect-video w-full" /> : null}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(note.id)}
                            className={`flex items-center gap-1 transition-colors ${
                              note.hasLiked
                                ? "text-amber-500 font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <ThumbsUp className="size-3.5" /> {note.likes}
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            VIP Exclusive drop
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: HOST EVENT */}
      <Dialog open={hostEventModal} onOpenChange={setHostEventModal}>
        <DialogContent className="max-w-md border-amber-400/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Calendar className="size-5 text-amber-500" /> Host VIP Campus Event
            </DialogTitle>
            <DialogDescription>
              Schedule an exclusive event visible only to verified VIP members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEvent} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Event Title</label>
              <Input
                placeholder="e.g. VIP Sunset Rooftop Mixer"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Category</label>
                <Input
                  placeholder="e.g. Social, Masterclass"
                  value={eventForm.category}
                  onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={eventForm.dateTime}
                  onChange={(e) => setEventForm({ ...eventForm, dateTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Location / Space</label>
              <Input
                placeholder="e.g. Quad Sky Lounge"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Event Details</label>
              <Textarea
                placeholder="What can attendees expect?"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold"
            >
              Publish VIP Event
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CREATE GIVEAWAY */}
      <Dialog open={createGiveawayModal} onOpenChange={setCreateGiveawayModal}>
        <DialogContent className="max-w-md border-amber-400/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Gift className="size-5 text-amber-500" /> Run VIP Giveaway
            </DialogTitle>
            <DialogDescription>
              Launch an exclusive giveaway for VIP circle members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitGiveaway} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Giveaway Title</label>
              <Input
                placeholder="e.g. 500 BC Friday Drop"
                value={giveawayForm.title}
                onChange={(e) => setGiveawayForm({ ...giveawayForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Prize Description</label>
              <Input
                placeholder="e.g. 500 Black Coins + 2 Skip Passes"
                value={giveawayForm.prize}
                onChange={(e) => setGiveawayForm({ ...giveawayForm, prize: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground">BC Value Equivalent</label>
                <Input
                  type="number"
                  value={giveawayForm.bcAmount}
                  onChange={(e) =>
                    setGiveawayForm({ ...giveawayForm, bcAmount: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Ends In</label>
                <Input
                  placeholder="Hours" type="number" min="1"
                  value={giveawayForm.endsIn}
                  onChange={(e) => setGiveawayForm({ ...giveawayForm, endsIn: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold"
            >
              Launch VIP Giveaway
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CREATE POLL */}
      <Dialog open={createPollModal} onOpenChange={setCreatePollModal}>
        <DialogContent className="max-w-md border-amber-400/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <BarChart3 className="size-5 text-amber-500" /> Post VIP Poll Question
            </DialogTitle>
            <DialogDescription>
              Poll the VIP community with verified anonymous voting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPoll} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Question</label>
              <Textarea
                placeholder="e.g. Which DJ should we invite for the final gala?"
                value={pollForm.question}
                onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Option 1</label>
              <Input
                placeholder="Option 1"
                value={pollForm.option1}
                onChange={(e) => setPollForm({ ...pollForm, option1: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Option 2</label>
              <Input
                placeholder="Option 2"
                value={pollForm.option2}
                onChange={(e) => setPollForm({ ...pollForm, option2: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Option 3 (Optional)</label>
              <Input
                placeholder="Option 3"
                value={pollForm.option3}
                onChange={(e) => setPollForm({ ...pollForm, option3: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold"
            >
              Post Poll
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: RECORD NOTE */}
      <Dialog open={recordNoteModal} onOpenChange={setRecordNoteModal}>
        <DialogContent className="max-w-md border-amber-400/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {noteKind === "voice" ? (
                <Mic className="size-5 text-amber-500" />
              ) : (
                <Video className="size-5 text-amber-500" />
              )}
              Drop {noteKind === "voice" ? "Voice Note" : "Video Note"}
            </DialogTitle>
            <DialogDescription>
              Broadcast authentic {noteKind} memo exclusively to the VIP Lounge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Note Title / Topic</label>
              <Input
                placeholder="e.g. Quick thoughts on tonight's event..."
                value={mediaForm.title}
                onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Optional Caption</label>
              <Input
                placeholder="Add a quick note..."
                value={mediaForm.caption}
                onChange={(e) => setMediaForm({ ...mediaForm, caption: e.target.value })}
              />
            </div>

            {/* Real browser recording; media is uploaded to the private Supabase VIP bucket. */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-400/50 bg-amber-500/5 p-6 text-center">
              <button
                type="button"
                onClick={toggleRecording}
                className={`grid size-16 place-items-center rounded-full transition-all shadow-lg ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-amber-500 text-neutral-950 hover:scale-105"
                }`}
              >
                {noteKind === "voice" ? <Mic className="size-7" /> : <Video className="size-7" />}
              </button>

              <div className="mt-3">
                <p className="text-xs font-bold text-foreground">
                  {isRecording ? "Recording in progress..." : "Tap to record"}
                </p>
                <p className="text-xs text-amber-500 font-mono mt-0.5">
                  00:{String(recordSeconds).padStart(2, "0")}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmitNote}
              disabled={isRecording}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold"
            >
              Drop Note to VIP Lounge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
