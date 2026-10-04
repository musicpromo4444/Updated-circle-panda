import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Users, Settings, Pencil, LogOut, Lock, Reply, Smile, Paperclip, Image as ImageIcon, Video, Mic, X, Play, Pause, Square, Flag, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, type GroupChat } from "@/lib/store";
import { RewardedAdModal } from "@/components/RewardedAdModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendMessageRequest } from "@/lib/messageRequests";
import heic2any from "heic2any";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Group Room — Circle Panda" },
      {
        name: "description",
        content: "A full-screen anonymous group room that stays open after 3 members join.",
      },
      { property: "og:title", content: "Group Room — Circle Panda" },
      {
        property: "og:description",
        content: "Chat anonymously in a full-screen group room.",
      },
    ],
  }),
  component: GroupRoom,
});

function GroupRoom() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const navigate = useNavigate();
  const {
    leaveGroup,
    updateGroupInfo,
    updateGroupSettings,
  } = useStore();
  const [adOpen, setAdOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const [showActivation, setShowActivation] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [reactionOpen, setReactionOpen] = useState<string | null>(null);
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null);
  const activationShown = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editPolicy, setEditPolicy] = useState<"admins" | "admins_members">("admins");
  const [sendMessages, setSendMessages] = useState(true);
  const [approveMembers, setApproveMembers] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [remoteGroup, setRemoteGroup] = useState<GroupChat | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{url:string; type:"image"|"video"|"audio"; name:string} | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingStopped, setRecordingStopped] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingElapsedBeforePauseRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);
  const [viewedMediaIds, setViewedMediaIds] = useState<Set<string>>(new Set());
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  const group = remoteGroup;

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: summaries, error: summariesError }, { data: messages, error: messagesError }, { data: settingsRow, error: settingsError }] = await Promise.all([
        (supabase as any).rpc("get_group_summaries", { p_country:"", p_state_province:"", p_city:"", p_area:"" }),
        (supabase as any).from("cp_group_messages").select("id,group_id,body,created_at,user_id,message_type,media_path,mime_type,duration_seconds,view_once").eq("group_id", groupId).order("created_at", { ascending: true }),
        (supabase as any).from("group_settings").select("edit_group_info,send_messages,approve_new_members").eq("group_id", groupId).maybeSingle(),
      ]);
      if (summariesError) { toast.error(summariesError.message ?? "Could not load the group"); return; }
      if (messagesError) { toast.error(messagesError.message ?? "Could not load group messages"); }
      if (settingsError) { toast.error(settingsError.message ?? "Could not load group settings"); }
      const row = (summaries ?? []).find((g:any) => g.id === groupId);
      if (!active || !row) return;
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const fresh: GroupChat = {
        id:row.id,name:row.name,topic:row.topic,ownerId:row.owner_id,memberRole:row.member_role,
        editGroupInfo:settingsRow?.edit_group_info === "admins_members" ? "admins_members" : "admins",sendMessages:settingsRow?.send_messages !== false,approveNewMembers:Boolean(settingsRow?.approve_new_members),joinPending:Boolean(row.join_pending),
        members:Number(row.member_count ?? 0),openedAt:row.activated_at?new Date(row.activated_at).getTime():null,expiresAt:row.expires_at ?? null,
        latitude:null,longitude:null,country:row.country ?? "",stateProvince:row.state_province ?? "",city:row.city ?? "",area:row.area ?? "",
    messages:(messages ?? []).map((m:any)=>({id:m.id,author:m.user_id===uid?"You (anonymous)":"Anonymous Panda",body:m.body,at:new Date(m.created_at).getTime(),mine:m.user_id===uid,message_type:m.message_type,media_path:m.media_path,mime_type:m.mime_type,duration_seconds:m.duration_seconds,view_once:m.view_once})),
      };
      if (!fresh.memberRole) {
        toast.error("You are not a member of this group. Join again to open the room.");
        void navigate({ to: "/groups" });
        return;
      }
      setRemoteGroup(fresh);
    })();
    return () => { active = false; };
  }, [groupId, navigate]);
  const expired = !!group?.expiresAt && new Date(group.expiresAt).getTime() <= Date.now();
  const live = !!group && group.openedAt !== null;

  const signedMediaUrl = async (path?: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("group-media").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  const maybeOpenGroupRewardAd = async () => {
    if (!group) return;
    const { data, error } = await (supabase as any).rpc("should_show_group_reward_ad", { p_group_id: group.id });
    if (error) return;
    if (data === true) {
      const { error: markError } = await (supabase as any).rpc("mark_group_reward_ad_shown", { p_group_id: group.id });
      if (!markError) setAdOpen(true);
    }
  };

  const messageMember = async (userId: string) => {
    setMemberMenuOpen(null);
    try {
      const result = await sendMessageRequest(userId, "");
      toast.success("Message request sent 💌", { description: "It is now in Messages while you wait for acceptance." });
      void navigate({ to: "/messages", search: { request: result.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start messaging");
    }
  };

  const reportMember = async (userId: string) => {
    setMemberMenuOpen(null);
    if (!group) return;
    const confirmed = window.confirm("Report this anonymous member?");
    if (!confirmed) return;
    const { error } = await (supabase as any).rpc("report_group_user_secure", {
      p_group_id: group.id,
      p_target_user_id: userId,
      p_reason: "Reported from group chat",
      p_details: null,
    });
    if (error) {
      toast.error(error.message ?? "Report could not be sent");
      return;
    }
    toast.success("Report sent");
  };

  const addReaction = async (messageId: string, emoji: string) => {
    const { error } = await (supabase as any).rpc("toggle_group_message_reaction", {
      p_message_id: messageId,
      p_reaction: emoji,
    });
    if (error) {
      toast.error(error.message ?? "Reaction could not be added");
      return;
    }
    setReactionOpen(null);
    const { data: reactions } = await (supabase as any)
      .from("cp_group_message_reactions")
      .select("message_id,user_id,reaction")
      .eq("message_id", messageId);
    setChatMessages((items) =>
      items.map((item) => item.id === messageId ? { ...item, reactions: reactions ?? [] } : item)
    );
  };

  const uploadMedia = async (file: File, messageType: "image" | "video" | "audio", durationSeconds?: number) => {
    if (!group) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) {
      toast.error("Please sign in again before sending media.");
      return;
    }

    let uploadFile = file;
    if (messageType === "image" && /(^image\\/(heic|heif)$)|\\.(heic|heif)$/i.test(file.type || file.name)) {
      toast.info("Converting HEIC photo to a compatible image…");
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        uploadFile = new File([blob], file.name.replace(/\\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
      } catch {
        toast.error("This HEIC photo could not be converted. Please choose another photo.");
        return;
      }
    }

    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${group.id}/${crypto.randomUUID()}-${safeName}`;
    toast.info(messageType === "image" ? "Uploading photo…" : messageType === "video" ? "Uploading video…" : "Sending voice note…");

    const { error: uploadError } = await supabase.storage
      .from("group-media")
      .upload(path, uploadFile, { contentType: uploadFile.type || "application/octet-stream", upsert: false });

    if (uploadError) {
      toast.error(uploadError.message ?? "Media upload failed");
      return;
    }

    const { data, error } = await (supabase as any).rpc("send_group_media_secure", {
      p_group_id: group.id,
      p_media_path: path,
      p_message_type: messageType,
      p_mime_type: uploadFile.type || null,
      p_duration_seconds: durationSeconds ?? null,
      // Photos/videos are view-once; voice notes are normal reusable messages.
      p_view_once: messageType !== "audio",
      p_body: "",
    });

    if (error) {
      await supabase.storage.from("group-media").remove([path]);
      const message = error.message ?? "Media could not be sent";
      if (/insufficient\s*bc|not enough|balance/i.test(message)) {
        window.dispatchEvent(new CustomEvent("circle-panda-insufficient-bc", { detail: { required: 1, reason: "Group media message" } }));
      } else {
        toast.error(message);
      }
      return;
    }

    const mediaUrl = await signedMediaUrl(path);
    const created = {
      id: data.id,
      group_id: group.id,
      body: "",
      created_at: data.created_at,
      user_id: uid,
      author: "You (anonymous)",
      mine: true,
      message_type: messageType,
      media_path: path,
      media_url: mediaUrl,
      mime_type: uploadFile.type,
      duration_seconds: durationSeconds ?? null,
      view_once: messageType !== "audio",
      reactions: [],
      currentUserId: uid,
    };
    setChatMessages((items) => items.some((x) => x.id === created.id) ? items : [...items, created]);
    setMediaMenuOpen(false);
    toast.success(messageType === "image" ? "Photo sent" : messageType === "video" ? "Video sent" : "Voice note sent");
    void maybeOpenGroupRewardAd();
  };

  const handleMediaPick = async (file?: File) => {
    if (!file) return;
    const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
    if (!type) {
      toast.error("Please choose an image or video");
      return;
    }
    setMediaMenuOpen(false);
    await uploadMedia(file, type);
  };

  const clearVoiceDraft = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recorderRef.current = null;
    setRecording(false);
    setRecordingPaused(false);
    setRecordingStopped(false);
    setVoiceBlob(null);
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreviewUrl(null);
    setRecordingSeconds(0);
    recordingStartedAtRef.current = null;
    recordingElapsedBeforePauseRef.current = 0;
  };

  const startVoiceRecording = async () => {
    if (recording || voiceBlob) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice recording is not supported on this device");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      discardRecordingRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size) recordChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          clearVoiceDraft();
          return;
        }
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setVoiceBlob(blob);
        if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
        setVoicePreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
        setRecordingPaused(false);
        setRecordingStopped(true);
        recorderRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      recordingElapsedBeforePauseRef.current = 0;
      setRecordingSeconds(0);
      setRecording(true);
      setRecordingPaused(false);
      setRecordingStopped(false);
      setMediaMenuOpen(false);

      recordingTimerRef.current = window.setInterval(() => {
        if (recordingStartedAtRef.current !== null) {
          setRecordingSeconds(recordingElapsedBeforePauseRef.current + Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
        }
      }, 250);
    } catch {
      toast.error("Microphone permission is required for voice notes");
    }
  };

  const pauseOrResumeVoiceRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      if (voicePreviewUrl && recordingStopped) {
        const audio = new Audio(voicePreviewUrl);
        void audio.play();
      }
      return;
    }
    if (recorder.state === "recording") {
      recorder.pause();
      recordingElapsedBeforePauseRef.current = recordingSeconds;
      recordingStartedAtRef.current = null;
      setRecordingPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      recordingStartedAtRef.current = Date.now();
      setRecordingPaused(false);
    }
  };

  const stopVoiceRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recordingElapsedBeforePauseRef.current = recordingSeconds;
    }
    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    discardRecordingRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      clearVoiceDraft();
    }
  };

  const sendVoiceRecording = async () => {
    if (!voiceBlob) return;
    const duration = recordingSeconds;
    const file = new File([voiceBlob], `voice-${Date.now()}.webm`, { type: voiceBlob.type || "audio/webm" });
    await uploadMedia(file, "audio", duration);
    clearVoiceDraft();
  };

  const openViewOnceMedia = async (m: any) => {
    if (!m.media_path) return;

    // Voice notes are reusable; do not consume the view-once claim for them.
    let url = await signedMediaUrl(m.media_path);
    if (!url) {
      toast.error("Media is unavailable. The file may have expired or is not accessible to this group member.");
      return;
    }

    // Browsers do not natively display HEIC/HEIF. Convert the private file
    // to a browser-safe JPEG before consuming the one-time claim.
    const isHeic = m.message_type === "image" && /(^image\\/(heic|heif)$)|\\.(heic|heif)$/i.test(m.mime_type || m.media_path || "");
    if (isHeic) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("HEIC download failed");
        const source = await response.blob();
        const converted = await heic2any({ blob: source, toType: "image/jpeg", quality: 0.9 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        if (url === m.media_url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
      } catch {
        toast.error("This HEIC photo could not be displayed on this device.");
        return;
      }
    }

    if (m.view_once !== false) {
      // IMPORTANT: verify that the file can actually be read before consuming
      // the one-time claim. Otherwise a failed signed URL/browser load could
      // permanently burn the message for the recipient.
      try {\n        const probe = await fetch(url, { method: "HEAD" });\n        if (!probe.ok) {\n          toast.error("This media is currently unavailable. Please try again.");\n          return;\n        }\n      } catch {\n        toast.error("This media could not be reached. Please try again.");\n        return;\n      }\n\n      const { data: allowed, error } = await (supabase as any).rpc("claim_group_media_view_once", { p_message_id: m.id });
      if (error) {
        toast.error(error.message ?? "This media could not be opened");
        return;
      }
      if (allowed !== true) {
        setViewedMediaIds((old) => new Set(old).add(m.id));
        toast.info("This view-once media has already been opened.");
        return;
      }
    }

    setViewedMediaIds((old) => new Set(old).add(m.id));
    setMediaPreview({
      url,
      type: m.message_type === "image" ? "image" : m.message_type === "video" ? "video" : "audio",
      name: m.view_once === false ? (m.message_type === "audio" ? "Voice note" : "Media") : "View once",
    });
  };


  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    };
  }, [voicePreviewUrl]);

  useEffect(() => {
    if (!group) return;
    if (!group.memberRole) {
      toast.error("You are not a member of this group. Join again to open the room.");
      void navigate({ to: "/groups" });
    }
  }, [group, navigate]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: rows, error }, { data: reactions }] = await Promise.all([
        (supabase as any).from("cp_group_messages").select("id,group_id,body,created_at,user_id,message_type,reply_to_id,media_path,mime_type,duration_seconds,view_once").eq("group_id", groupId).order("created_at", { ascending: true }).limit(1000),
        (supabase as any).from("cp_group_message_reactions").select("message_id,user_id,reaction"),
      ]);
      if (error) { toast.error(error.message ?? "Could not load group messages"); return; }
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const reactionMap = new Map<string, any[]>();
      (reactions ?? []).forEach((r:any) => reactionMap.set(r.message_id, [...(reactionMap.get(r.message_id) ?? []), r]));
      if (!cancelled) { const mapped = await Promise.all((rows ?? []).map(async (m:any) => ({ ...m, author:m.user_id===uid?"You (anonymous)":"Anonymous Panda", mine:m.user_id===uid, media_url:await signedMediaUrl(m.media_path), reactions:reactionMap.get(m.id) ?? [], currentUserId:uid }))); setChatMessages(mapped); }
    };
    void load();
    const channel=supabase.channel(`group:${groupId}:whatsapp`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"cp_group_messages",filter:`group_id=eq.${groupId}`},(payload:any)=>{
        void (async()=>{ const uid=(await supabase.auth.getUser()).data.user?.id; const m=payload.new; const mediaUrl=await signedMediaUrl(m.media_path); setChatMessages(x=>x.some(v=>v.id===m.id)?x:[...x,{...m,author:m.user_id===uid?"You (anonymous)":"Anonymous Panda",mine:m.user_id===uid,media_url:mediaUrl,reactions:[],currentUserId:uid}]); })();
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"cp_group_message_reactions"},()=>void load())
      .subscribe();
    return()=>{cancelled=true;void supabase.removeChannel(channel);};
  },[groupId,live]);

  useEffect(() => {
    if (!group) return;
    setEditName(group.name);
    setEditTopic(group.topic);
    setEditPolicy(group.editGroupInfo ?? "admins");
    setSendMessages(group.sendMessages ?? true);
    setApproveMembers(group.approveNewMembers ?? false);
  }, [group?.id, group?.name, group?.topic, group?.editGroupInfo, group?.sendMessages, group?.approveNewMembers]);

  useEffect(() => {
    if (!group || !["owner", "admin"].includes(group.memberRole ?? "")) { setJoinRequests([]); return; }
    void (supabase as any).from("group_join_requests").select("id,user_id,created_at,status").eq("group_id", group.id).eq("status", "pending").order("created_at", { ascending: true }).then(({ data, error }: any) => {
      if (error) { toast.error(error.message ?? "Could not load pending join requests"); return; }
      setJoinRequests(data ?? []);
    });
  }, [group?.id, group?.memberRole]);

  useEffect(() => {
    if (!live || activationShown.current) return;
    activationShown.current = true;
    setShowActivation(true);
    const timer = window.setTimeout(() => setShowActivation(false), 4000);
    return () => window.clearTimeout(timer);
  }, [live]);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl">
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1 px-2">
          <Link to="/groups">
            <ChevronLeft className="size-4" /> Back
          </Link>
        </Button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-base">
          🎍
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display font-semibold">{group?.name ?? "Room not found"}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <Users className="size-3" /> {group?.members ?? 0} anonymous members
          </p>
        </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Group settings"
        onClick={() => setSettingsOpen((v) => !v)}
      >
        <Settings className="size-5" />
      </Button>
      </header>



      {settingsOpen && group ? (
        <div className="absolute inset-x-0 top-[65px] z-40 mx-auto max-w-lg rounded-b-2xl border border-border/70 bg-background/98 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-display font-bold">Group settings</p>
              <p className="text-[11px] text-muted-foreground">
                {group.memberRole === "owner" ? "Owner" : group.memberRole === "admin" ? "Admin" : "Member"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}>Close</Button>
          </div>

          <div className="space-y-3">
            {(group.memberRole === "owner" || group.memberRole === "admin") ? (
              <>
                <label className="block text-xs font-medium">
                  Group name
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm" />
                </label>
                <label className="block text-xs font-medium">
                  Topic
                  <textarea value={editTopic} onChange={(e) => setEditTopic(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs font-medium">
                  Who can edit group info
                  <select value={editPolicy} onChange={(e) => setEditPolicy(e.target.value as "admins" | "admins_members")} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm">
                    <option value="admins">Admins only</option>
                    <option value="admins_members">All members</option>
                  </select>
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={sendMessages} onChange={(e) => setSendMessages(e.target.checked)} /> Members can send messages</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={approveMembers} onChange={(e) => setApproveMembers(e.target.checked)} /> Approve new members</label>
                </div>
                {joinRequests.length > 0 ? (
                  <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                    <p className="text-xs font-semibold">Pending join requests <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{joinRequests.length}</span></p>
                    <div className="mt-2 space-y-2">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
                          <span className="flex-1 text-xs text-muted-foreground">Anonymous Panda · {new Date(request.created_at).toLocaleString()}</span>
                          <Button type="button" size="sm" onClick={() => void (supabase as any).rpc("review_group_join_request", { p_request_id: request.id, p_approve: true }).then(({ error }: any) => { if (error) throw error; setJoinRequests((items) => items.filter((x) => x.id !== request.id)); toast.success("Member approved"); }).catch((e: any) => toast.error(e?.message ?? "Could not approve request"))}>Approve</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void (supabase as any).rpc("review_group_join_request", { p_request_id: request.id, p_approve: false }).then(({ error }: any) => { if (error) throw error; setJoinRequests((items) => items.filter((x) => x.id !== request.id)); toast.success("Request declined"); }).catch((e: any) => toast.error(e?.message ?? "Could not decline request"))}>Decline</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Button type="button" className="w-full gap-1.5" onClick={() => {
                    updateGroupInfo(group.id, editName.trim(), editTopic.trim());
                    updateGroupSettings(group.id, editPolicy, sendMessages, approveMembers);
                    setRemoteGroup((current) => current ? { ...current, name: editName.trim(), topic: editTopic.trim(), editGroupInfo: editPolicy, sendMessages, approveNewMembers: approveMembers } : current);
                    setSettingsOpen(false);
                  }}>
                  <Pencil className="size-3.5" /> Save changes
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Group name</p>
                  <p className="text-sm font-semibold">{group.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Topic</p>
                  <p className="text-sm font-semibold">{group.topic || "No topic set"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Who can edit group info</p>
                  <p className="text-sm font-semibold">{group.editGroupInfo === "admins_members" ? "All members" : "Admins only"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Who can send messages</p>
                  <p className="text-sm font-semibold">{group.sendMessages === false ? "Admins only" : "All members"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">New member approval</p>
                  <p className="text-sm font-semibold">{group.approveNewMembers ? "Required" : "Not required"}</p>
                </div>
                {group.editGroupInfo === "admins_members" ? (
                  <div className="border-t border-border/70 pt-3">
                    <p className="mb-2 text-xs font-semibold">Edit group info</p>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mb-2 h-10 w-full rounded-xl border bg-background px-3 text-sm" />
                    <textarea value={editTopic} onChange={(e) => setEditTopic(e.target.value)} rows={2} className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                    <Button type="button" size="sm" className="mt-2 w-full" onClick={() => { updateGroupInfo(group.id, editName.trim(), editTopic.trim()); setSettingsOpen(false); }}>Save info</Button>
                  </div>
                ) : null}
                <div className="border-t border-border/70 pt-3">
                  <Button type="button" variant="ghost" className="w-full justify-start text-destructive" onClick={() => setLeaveConfirmOpen(true)}>
                    <LogOut className="mr-2 size-4" /> Leave group
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {leaveConfirmOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-destructive/10 text-2xl">🚪</div>
            <p className="font-display text-lg font-bold">Are you sure you want to exit this group?</p>
            <p className="mt-2 text-xs text-muted-foreground">You will leave the group and must join again before you can enter or send messages.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => setLeaveConfirmOpen(false)}>No</Button>
              <Button type="button" variant="destructive" onClick={async () => {
                const left = await leaveGroup(group?.id ?? "");
                setLeaveConfirmOpen(false);
                setSettingsOpen(false);
                if (left) {
                  setRemoteGroup(null);
                  void navigate({ to: "/groups" });
                }
              }}>Yes</Button>
            </div>
          </div>
        </div>
      ) : null}

      {showActivation ? (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/40 backdrop-blur-[2px]" aria-live="polite">
          <div className="animate-in zoom-in-75 rounded-3xl border border-primary/40 bg-card/95 px-7 py-6 text-center shadow-2xl duration-500">
            <div className="mx-auto mb-2 grid size-20 place-items-center rounded-full bg-primary/15 text-5xl">🐼</div>
            <p className="font-display text-xl font-bold">Welcome to the group!</p>
            <p className="mt-1 text-sm text-muted-foreground">Feel free to chat and enjoy the conversation.</p>
          </div>
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto bg-secondary/10 px-4 py-4">
        {!group ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            This room doesn't exist.
          </p>
        ) : expired || group.openedAt === null ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Lock className="mx-auto mb-2 size-6" />
            {expired
              ? "This chat locked when the 24-hour timer hit zero."
              : "This room hasn't been opened yet."}
          </div>
        ) : (
          chatMessages.map((m) => (
            <div key={m.id} className={m.mine ? "text-right" : ""}>
              {m.reply_to_id ? <button type="button" onClick={()=>{const target=chatMessages.find(x=>x.id===m.reply_to_id); if(target) document.getElementById(`group-msg-${target.id}`)?.scrollIntoView({behavior:"smooth"});}} className="mb-1 inline-block max-w-[85%] rounded-lg border-l-2 border-primary bg-background/60 px-2 py-1 text-left text-[10px] text-muted-foreground">↩ {chatMessages.find(x=>x.id===m.reply_to_id)?.body?.slice(0,80) ?? "Reply"}</button> : null}
              <div id={`group-msg-${m.id}`} className="relative">
                <p className={`text-[11px] text-muted-foreground ${m.mine ? "text-right" : ""}`}>{m.author}</p>
                <div className={`mt-0.5 flex items-end gap-1.5 ${m.mine ? "justify-end" : "justify-start"}`}>
                  {!m.mine ? (
                    <div className="relative shrink-0">
                      <button type="button" className="grid size-9 place-items-center rounded-full border border-border/70 bg-card text-xl shadow-sm" onClick={()=>setMemberMenuOpen(memberMenuOpen===m.id?null:m.id)} aria-label="Open anonymous member menu">🐼</button>
                      {memberMenuOpen===m.id ? <div className="absolute left-0 top-10 z-[60] w-44 rounded-2xl border border-border bg-card p-1.5 shadow-2xl">
                        <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary" onClick={()=>void messageMember(m.user_id)}><MessageCircle className="size-4"/> Message</button>
                        <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary" onClick={()=>void navigate({to:"/secret/$userId",params:{userId:m.user_id}})}><Eye className="size-4"/> View secret</button>
                        <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10" onClick={()=>void reportMember(m.user_id)}><Flag className="size-4"/> Report</button>
                      </div> : null}
                    </div>
                  ) : null}
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-primary text-primary-foreground" : "bg-card"}`}>{m.message_type && m.media_path ? (m.view_once !== false && viewedMediaIds.has(m.id) ? <div className="flex items-center gap-2 px-1 py-1 text-xs opacity-70">✓ Opened view-once {m.message_type}</div> : <button type="button" onClick={()=>void openViewOnceMedia(m)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left"><span className="grid size-10 place-items-center rounded-full bg-background/25">{m.message_type==="image" ? <ImageIcon className="size-5"/> : m.message_type==="video" ? <Video className="size-5"/> : <Mic className="size-5"/>}</span><span><span className="block font-medium">View once</span><span className="block text-[11px] opacity-70">{m.view_once === false ? (m.message_type==="image" ? "Photo" : m.message_type==="video" ? "Video" : "Voice note") : (m.message_type==="image" ? "View once photo" : m.message_type==="video" ? "View once video" : "Voice note")}</span></span></button>) : <span className="whitespace-pre-wrap">{m.body}</span>}</div>
                  {m.mine ? null : null}
                </div>
                <div className={`mt-1 flex items-center gap-1 ${m.mine ? "justify-end" : ""}`}>
                  <Button type="button" variant="ghost" size="icon" className="size-7" onClick={()=>setReplyTo(m)} aria-label="Reply"><Reply className="size-3.5"/></Button>
                  {(() => {
                    const myReaction = (m.reactions ?? []).find((r:any) => r.user_id === (m.currentUserId ?? ""));
                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`size-7 text-base ${myReaction ? "opacity-100" : "text-muted-foreground"}`}
                        onClick={()=>setReactionOpen(reactionOpen===m.id?null:m.id)}
                        aria-label={myReaction ? `Change reaction from ${myReaction.reaction}` : "React"}
                      >
                        {myReaction?.reaction ?? <Smile className="size-3.5"/>}
                      </Button>
                    );
                  })()}
                </div>
                {reactionOpen===m.id ? <div className="mt-1 flex gap-1 rounded-2xl border bg-background p-1 shadow-lg">
                  {["❤️","😂","👍","😮","😢","🔥"].map(emoji=><button key={emoji} type="button" className="grid size-8 place-items-center rounded-full text-lg hover:bg-secondary" onClick={()=>void addReaction(m.id,emoji)}>{emoji}</button>)}
                </div> : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      {live && group?.sendMessages !== false ? (
        <>
        {replyTo ? <div className="border-t border-border bg-secondary/30 px-3 py-2 text-xs"><div className="flex items-center justify-between"><span className="text-muted-foreground">Replying to {replyTo.author}</span><Button type="button" variant="ghost" size="sm" onClick={()=>setReplyTo(null)}>Cancel</Button></div><p className="truncate">{replyTo.body}</p></div> : null}
        {voiceBlob || recording ? (
          <div className="flex items-center gap-2 rounded-[28px] border border-border bg-card px-2 py-2 shadow-sm">
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 rounded-full" onClick={cancelVoiceRecording} aria-label="Cancel voice recording">
              <X className="size-5" />
            </Button>
            <div className="min-w-0 flex-1 px-1">
              <div className="flex h-10 items-center gap-[2px] overflow-hidden">
                {Array.from({length:38}).map((_,i)=><span key={i} className={`w-[3px] rounded-full bg-muted-foreground transition-all ${recording && !recordingPaused ? "animate-pulse" : ""}`} style={{height:`${7 + ((i * 17 + recordingSeconds * 5) % 28)}px`}} />)}
              </div>
            </div>
            {voicePreviewUrl && recordingStopped ? <audio src={voicePreviewUrl} controls={false} className="hidden" /> : null}
            <Button type="button" variant="secondary" size="icon" className="size-11 shrink-0 rounded-full" onClick={stopVoiceRecording} disabled={!recording || recordingStopped} aria-label="Stop voice recording">
              <Square className="size-4 fill-current" />
            </Button>
            <Button type="button" size="icon" className="size-11 shrink-0 rounded-full bg-blue-500 text-white hover:bg-blue-500/90" onClick={()=>void sendVoiceRecording()} disabled={!voiceBlob} aria-label="Send voice recording">
              <Send className="size-4" />
            </Button>
          </div>
        ) : (
        <form
          className="relative flex gap-2 border-t border-border bg-background px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            void (async () => {
              const body = draft.trim();
              const { data, error } = await (supabase as any).rpc("send_group_message_secure", {
                p_group_id: group.id,
                p_body: body,
                p_reply_to_id: replyTo?.id ?? null,
              });
              if (error) {
                toast.error(error.message ?? "Message could not be sent");
                return;
              }
              const userId = (await supabase.auth.getUser()).data.user?.id;
              setChatMessages((x) => [...x, {
                id:data.id, group_id:group.id, body, created_at:data.created_at, user_id:userId,
                author:"You (anonymous)", mine:true, reply_to_id:replyTo?.id ?? null, reactions:[], currentUserId:userId,
              }]);
              setReplyTo(null);
              setDraft("");
              void maybeOpenGroupRewardAd();
            })();
          }}
        >
          {mediaMenuOpen ? (
            <div className="absolute bottom-full left-3 mb-2 flex gap-2 rounded-2xl border bg-card p-2 shadow-xl">
              <button type="button" className="grid size-11 place-items-center rounded-xl hover:bg-secondary" onClick={() => { if (mediaInputRef.current) { mediaInputRef.current.accept = "image/*"; mediaInputRef.current.click(); } }} aria-label="Photo">
                <ImageIcon className="size-5" />
              </button>
              <button type="button" className="grid size-11 place-items-center rounded-xl hover:bg-secondary" onClick={() => { if (mediaInputRef.current) { mediaInputRef.current.accept = "video/*"; mediaInputRef.current.click(); } }} aria-label="Video">
                <Video className="size-5" />
              </button>
              <button type="button" className="grid size-11 place-items-center rounded-xl hover:bg-secondary" onClick={() => void startVoiceRecording()} aria-label="Voice note">
                <Mic className="size-5" />
              </button>
            </div>
          ) : null}
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { void handleMediaPick(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setMediaMenuOpen((v) => !v)} aria-label="Add media">
            <Paperclip className="size-5" />
          </Button>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the room…" maxLength={2000} />
          <Button type="submit" className="shrink-0"><Send className="size-4" /></Button>
        </form>
        )}
        </>
      ) : live ? (
        <div className="border-t border-border bg-background px-3 py-3 text-center text-xs text-muted-foreground">
          Only group admins can send messages right now.
        </div>
      ) : null}

      {mediaPreview ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4" onClick={()=>setMediaPreview(null)}><div className="relative max-h-[90vh] max-w-3xl" onClick={e=>e.stopPropagation()}><Button type="button" variant="secondary" size="icon" className="absolute -right-2 -top-2 z-10 rounded-full" onClick={()=>setMediaPreview(null)}><X className="size-4"/></Button>{mediaPreview.type==="image" ? <img src={mediaPreview.url} alt={mediaPreview.name} className="max-h-[85vh] max-w-full rounded-2xl object-contain"/> : mediaPreview.type==="video" ? <video src={mediaPreview.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-2xl"/> : <audio src={mediaPreview.url} controls autoPlay className="w-[min(90vw,420px)]"/>}</div></div> : null}
      <RewardedAdModal open={adOpen} groupId={groupId} onClose={() => setAdOpen(false)} />

    </div>
  );
}
