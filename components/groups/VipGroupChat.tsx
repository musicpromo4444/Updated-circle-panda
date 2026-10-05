import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Crown, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupComposer, type OutgoingGroupMedia } from "@/components/groups/GroupComposer";
import { GroupMediaMessage, type GroupMediaItem } from "@/components/groups/GroupMediaMessage";
import { VipGroupCallOverlay } from "@/components/groups/VipGroupCallOverlay";
import { VipGroupSponsorGift } from "@/components/groups/VipGroupSponsorGift";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VipMessage = GroupMediaItem & { mediaPath?: string; viewOnce?: boolean };

export function VipGroupChat({ open, onOpenChange, groupId }: { open: boolean; onOpenChange: (open: boolean) => void; groupId: string }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<VipMessage[]>([]);
  const [callConfig, setCallConfig] = useState<{ voice_enabled: boolean; video_enabled: boolean } | null>(null);
  const [activeCall, setActiveCall] = useState<"voice" | "video" | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const mapRow = async (row: any): Promise<VipMessage> => {
    let mediaUrl: string | undefined;
    if (row.media_path && !row.view_once) {
      const { data } = await (supabase as any).storage.from("circle-panda-group-media").createSignedUrl(row.media_path, 3600);
      mediaUrl = data?.signedUrl;
    }
    const uid = (await supabase.auth.getUser()).data.user?.id;
    return {
      id: row.id,
      author: row.user_id === uid ? "You (VIP Panda)" : "VIP Panda",
      body: row.body ?? "",
      at: new Date(row.created_at).getTime(),
      mine: row.user_id === uid,
      messageType: row.message_type ?? "text",
      mediaPath: row.media_path,
      mediaUrl,
      viewOnce: Boolean(row.view_once),
    };
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_vip_group_messages", { p_group_id: groupId });
      if (error) {
        toast.error(error.message ?? "VIP group could not be loaded");
        return;
      }
      const rows = await Promise.all((data ?? []).map(mapRow));
      if (!cancelled) setMessages(rows);
    })();

    const channel = supabase
      .channel("vip-group:messages:" + groupId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_vip_group_messages", filter: "group_id=eq." + groupId }, (payload: any) => {
        void mapRow(payload.new).then(msg => {
          if (!cancelled) setMessages(current => current.some(m => m.id === msg.id) ? current : [...current, msg]);
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [open, groupId]);

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data, error } = await (supabase as any).rpc("get_vip_group_call_runtime", { p_group_id: groupId });
      if (error) {
        console.warn("VIP call schedule unavailable", error);
        return;
      }
      setCallConfig(data?.show ? {
        voice_enabled: Boolean(data.voice_enabled),
        video_enabled: Boolean(data.video_enabled),
      } : null);
    })();
  }, [open, groupId]);

  const sendText = async (body: string) => {
    const { data, error } = await (supabase as any).rpc("send_vip_group_message_secure", { p_group_id: groupId, p_body: body });
    if (error) {
      toast.error(error.message ?? "VIP message could not be sent");
      return;
    }
    setMessages(current => [...current, {
      id: data.id,
      author: "You (VIP Panda)",
      body,
      at: new Date(data.created_at).getTime(),
      mine: true,
      messageType: "text",
    }]);
  };

  const sendMedia = async ({ type, file, durationSeconds }: OutgoingGroupMedia) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      toast.error("Sign in to send media");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || (type === "image" ? "jpg" : type === "video" ? "mp4" : "webm");
    const path = `vip/${user.id}/${groupId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await (supabase as any).storage.from("circle-panda-group-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      toast.error(uploadError.message ?? "Media upload failed");
      return;
    }
    const { data, error } = await (supabase as any).rpc("send_vip_group_media_secure", {
      p_group_id: groupId,
      p_message_type: type,
      p_media_path: path,
      p_mime_type: file.type,
      p_duration_seconds: durationSeconds ?? null,
      p_view_once: type !== "audio" ? true : false,
      p_body: "",
    });
    if (error) {
      await (supabase as any).storage.from("circle-panda-group-media").remove([path]);
      toast.error(error.message ?? "VIP media could not be sent");
      return;
    }
    const { data: signed } = await (supabase as any).storage.from("circle-panda-group-media").createSignedUrl(path, 3600);
    setMessages(current => [...current, {
      id: data.id,
      author: "You (VIP Panda)",
      body: "",
      at: new Date(data.created_at).getTime(),
      mine: true,
      messageType: type,
      mediaPath: path,
      mediaUrl: type === "audio" ? signed?.signedUrl : undefined,
      viewOnce: type !== "audio",
    }]);
  };

  if (!open) return null;

  return <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-background">
    <header className="flex shrink-0 items-center gap-3 border-b border-amber-400/30 bg-background/95 px-3 py-3 backdrop-blur-xl">
      <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" onClick={() => { onOpenChange(false); void navigate({ to: "/groups" }); }}><ChevronLeft className="size-4"/>Back</Button>
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-400/60 bg-amber-500/15 text-amber-400 shadow-[0_0_18px_rgba(245,158,11,.3)]"><Crown className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-display font-bold">VIP Group</p><p className="text-[11px] text-amber-400/80">Private VIP community · free full-screen chat</p></div>
      {callConfig?.voice_enabled ? <Button variant="ghost" size="icon" title="Voice call" onClick={() => setActiveCall("voice")}><Phone className="size-5 text-amber-400" /></Button> : null}
      {callConfig?.video_enabled ? <Button variant="ghost" size="icon" title="Video call" onClick={() => setActiveCall("video")}><Video className="size-5 text-amber-400" /></Button> : null}
    </header>

    <main className="min-h-0 flex-1 overflow-y-auto bg-secondary/10 px-3 py-4 sm:px-5">
      <div className="mx-auto max-w-4xl space-y-3">
        {messages.map(m => <div key={m.id} className={m.mine ? "text-right" : ""}><p className="px-2 text-[11px] text-amber-400/70">{m.author}</p><GroupMediaMessage message={m} viewOnce={Boolean(m.viewOnce)} onViewOnceOpen={async()=>{ if(!m.mediaPath) return null; const {data:allowed,error}=await (supabase as any).rpc("claim_vip_group_media_view_once",{p_message_id:m.id}); if(error){toast.error(error.message ?? "This media could not be opened");return null;} if(allowed!==true){toast.info("This view-once media has already been opened.");return null;} const {data,error:signError}=await (supabase as any).storage.from("circle-panda-group-media").createSignedUrl(m.mediaPath,60); if(signError||!data?.signedUrl){toast.error(signError?.message ?? "Media unavailable");return null;} return data.signedUrl;}} /></div>)}
        <div ref={bottom} />
      </div>
    </main>

    <footer className="shrink-0 border-t border-amber-400/20 bg-background px-2 py-2 sm:px-3">
      <div className="mx-auto max-w-4xl"><GroupComposer placeholder="Message the VIP group…" onSendText={sendText} onSendMedia={sendMedia} allowViewOnce={true} /></div>
    </footer>
    <VipGroupSponsorGift groupId={groupId} />{activeCall ? <VipGroupCallOverlay type={activeCall} groupId={groupId} onClose={() => setActiveCall(null)} /> : null}
  </div>;
}
