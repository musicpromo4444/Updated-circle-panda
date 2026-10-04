import { useEffect, useRef, useState } from "react";
import { Crown, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupComposer, type OutgoingGroupMedia } from "@/components/groups/GroupComposer";
import { GroupMediaMessage, type GroupMediaItem } from "@/components/groups/GroupMediaMessage";
import { VipPrivateCall } from "@/components/messages/VipPrivateCall";
import { VipGroupSponsorGift } from "@/components/groups/VipGroupSponsorGift";
import { supabase } from "@/integrations/supabase/client";
import heic2any from "heic2any";
import { toast } from "sonner";

type VipMessage = GroupMediaItem & { mediaPath?: string };

export function VipGroupChat({
  open,
  groupId,
  onOpenChange,
}: {
  open: boolean;
  groupId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<VipMessage[]>([]);
  const [callId, setCallId] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const mapRow = async (row: any): Promise<VipMessage> => {
    let mediaUrl: string | undefined;
    if (row.media_path) {
      const { data } = await supabase.storage
        .from("circle-panda-group-media")
        .createSignedUrl(row.media_path, 3600);
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
      mediaPath: row.media_path ?? undefined,
      mediaUrl,
    };
  };

  useEffect(() => {
    if (!open || !groupId) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await (supabase as any).rpc("get_vip_group_messages", {
        p_group_id: groupId,
      });
      if (error) {
        toast.error(error.message ?? "VIP group could not be loaded");
        return;
      }
      const rows = await Promise.all((data ?? []).map(mapRow));
      if (!cancelled) setMessages(rows);
    })();

    const channel = supabase
      .channel(`vip-group:${groupId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cp_vip_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) => {
          void mapRow(payload.new).then((msg) => {
            if (!cancelled) {
              setMessages((items) => items.some((m) => m.id === msg.id) ? items : [...items, msg]);
            }
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [open, groupId]);

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  const startVideoMatch = async () => {
    if (matching || callId) return;
    setMatching(true);
    const { data, error } = await (supabase as any).rpc("request_vip_group_video_match");
    if (error) {
      setMatching(false);
      toast.error(error.message ?? "Could not start video matching");
      return;
    }
    if (data?.status === "matched" && data.call_id) {
      setMatching(false);
      setCallId(data.call_id);
      return;
    }
    toast.info("Looking for another VIP Panda…");
    const deadline = Date.now() + 120000;
    const poll = window.setInterval(async () => {
      if (Date.now() >= deadline) {
        window.clearInterval(poll);
        setMatching(false);
        toast.info("No match found yet. Try again when another VIP Panda is available.");
        return;
      }
      const { data: next, error: nextError } = await (supabase as any).rpc("request_vip_group_video_match");
      if (nextError) return;
      if (next?.status === "matched" && next.call_id) {
        window.clearInterval(poll);
        setMatching(false);
        setCallId(next.call_id);
      }
    }, 3000);
  };

  const sendText = async (body: string) => {
    const { data, error } = await (supabase as any).rpc("send_vip_group_message_secure", {
      p_group_id: groupId,
      p_body: body,
    });
    if (error) {
      toast.error(error.message ?? "VIP message could not be sent");
      return;
    }
    setMessages((items) => [
      ...items,
      {
        id: data.id,
        author: "You (VIP Panda)",
        body,
        at: new Date(data.created_at).getTime(),
        mine: true,
        messageType: "text",
      },
    ]);
  };

  const sendMedia = async ({ type, file, durationSeconds }: OutgoingGroupMedia) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      toast.error("Sign in to send media");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Media must be 25 MB or smaller.");
      return;
    }

    let uploadFile = file;
    if (type === "image" && /(^image\/(heic|heif)$)|\.(heic|heif)$/i.test(file.type || file.name)) {
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        uploadFile = new File(
          [blob],
          file.name.replace(/\.(heic|heif)$/i, ".jpg"),
          { type: "image/jpeg" },
        );
      } catch {
        toast.error("This HEIC photo could not be converted.");
        return;
      }
    }

    const ext = uploadFile.name.split(".").pop()?.toLowerCase() ?? (type === "image" ? "jpg" : type === "video" ? "mp4" : "webm");
    const path = `vip/${user.id}/${groupId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("circle-panda-group-media")
      .upload(path, uploadFile, {
        contentType: uploadFile.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      toast.error(uploadError.message ?? "Media upload failed");
      return;
    }

    const { data, error } = await (supabase as any).rpc("send_vip_group_media_secure", {
      p_group_id: groupId,
      p_message_type: type,
      p_media_path: path,
      p_mime_type: uploadFile.type || null,
      p_duration_seconds: durationSeconds ?? null,
      p_body: "",
    });

    if (error) {
      await supabase.storage.from("circle-panda-group-media").remove([path]);
      toast.error(error.message ?? "VIP media could not be sent");
      return;
    }

    const { data: signed } = await supabase.storage
      .from("circle-panda-group-media")
      .createSignedUrl(path, 3600);

    setMessages((items) => [
      ...items,
      {
        id: data.id,
        author: "You (VIP Panda)",
        body: "",
        at: new Date(data.created_at).getTime(),
        mine: true,
        messageType: type,
        mediaPath: path,
        mediaUrl: signed?.signedUrl,
      },
    ]);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-background">
        <header className="flex shrink-0 items-center gap-3 border-b border-amber-400/30 bg-background/95 px-3 py-3 backdrop-blur-xl">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close VIP group">
            <X className="size-5" />
          </Button>
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-400/60 bg-amber-500/15 text-amber-400">
            <Crown className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold">VIP Group</p>
            <p className="text-[11px] text-amber-400/80">Private VIP community · full-screen chat</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={matching}
            onClick={() => void startVideoMatch()}
            className="gap-1.5 border-amber-400/40 text-amber-300"
          >
            <Video className="size-4" />
            {matching ? "Matching…" : "Video call"}
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-secondary/10 px-3 py-4 sm:px-5">
          <div className="mx-auto max-w-4xl space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={m.mine ? "text-right" : ""}>
                <p className="px-2 text-[11px] text-amber-400/70">{m.author}</p>
                <GroupMediaMessage message={m} viewOnce={false} />
              </div>
            ))}
            <div ref={bottom} />
          </div>
        </main>

        <footer className="shrink-0 border-t border-amber-400/20 bg-background px-2 py-2 sm:px-3">
          <div className="mx-auto max-w-4xl">
            <GroupComposer placeholder="Message the VIP group…" onSendText={sendText} onSendMedia={sendMedia} />
          </div>
        </footer>

        <VipGroupSponsorGift groupId={groupId} />
      </div>
      <VipPrivateCall callId={callId} onClose={() => setCallId(null)} />
    </>
  );
}
