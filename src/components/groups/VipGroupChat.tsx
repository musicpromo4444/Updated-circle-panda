import { useEffect, useRef, useState } from "react";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupComposer, type OutgoingGroupMedia } from "@/components/groups/GroupComposer";
import { GroupMediaMessage, type GroupMediaItem } from "@/components/groups/GroupMediaMessage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VipMessage = GroupMediaItem & { mediaPath?: string };

export function VipGroupChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<VipMessage[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  const mapRow = async (row: any): Promise<VipMessage> => {
    let mediaUrl: string | undefined;
    if (row.media_path) {
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
      mediaPath: row.media_path ?? undefined,
      mediaUrl,
    };
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any).from("cp_vip_group_messages")
        .select("id,user_id,body,created_at,message_type,media_path,mime_type,duration_seconds")
        .order("created_at", { ascending: true }).limit(1000);
      if (error) {
        toast.error(error.message ?? "VIP group could not be loaded");
        return;
      }
      const rows = await Promise.all((data ?? []).map(mapRow));
      if (!cancelled) setMessages(rows);
    })();

    const channel = supabase.channel("vip-group:messages").on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "cp_vip_group_messages" },
      (payload: any) => {
        void mapRow(payload.new).then((msg) => {
          if (!cancelled) setMessages((current) => current.some((m) => m.id === msg.id) ? current : [...current, msg]);
        });
      },
    ).subscribe();

    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [open]);

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  const sendText = async (body: string) => {
    const { data, error } = await (supabase as any).rpc("send_vip_group_message_secure", { p_body: body });
    if (error) {
      toast.error(error.message ?? "VIP message could not be sent");
      return;
    }
    setMessages((current) => [...current, {
      id: data.id, author: "You (VIP Panda)", body, at: new Date(data.created_at).getTime(), mine: true, messageType: "text",
    }]);
  };

  const sendMedia = async ({ type, file, durationSeconds }: OutgoingGroupMedia) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      toast.error("Sign in to send media");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? (type === "image" ? "jpg" : type === "video" ? "mp4" : "webm");
    const path = `vip/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await (supabase as any).storage.from("circle-panda-group-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      toast.error(uploadError.message ?? "Media upload failed");
      return;
    }
    const { data, error } = await (supabase as any).rpc("send_vip_group_media_secure", {
      p_message_type: type, p_media_path: path, p_mime_type: file.type, p_duration_seconds: durationSeconds ?? null, p_body: "",
    });
    if (error) {
      await (supabase as any).storage.from("circle-panda-group-media").remove([path]);
      toast.error(error.message ?? "VIP media could not be sent");
      return;
    }
    const { data: signed } = await (supabase as any).storage.from("circle-panda-group-media").createSignedUrl(path, 3600);
    setMessages((current) => [...current, {
      id: data.id, author: "You (VIP Panda)", body: "", at: new Date(data.created_at).getTime(), mine: true,
      messageType: type, mediaPath: path, mediaUrl: signed?.signedUrl,
    }]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-400/30 bg-background/95 px-3 py-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close VIP group"><X className="size-5" /></Button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-400/60 bg-amber-500/15 text-amber-400 shadow-[0_0_18px_rgba(245,158,11,.3)]"><Crown className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-display font-bold">VIP Group</p><p className="text-[11px] text-amber-400/80">Private VIP community · full-screen chat</p></div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto bg-secondary/10 px-3 py-4 sm:px-5">
        <div className="mx-auto max-w-4xl space-y-3">
          {messages.map((message) => <div key={message.id} className={message.mine ? "text-right" : ""}><p className="px-2 text-[11px] text-amber-400/70">{message.author}</p><GroupMediaMessage message={message} /></div>)}
          <div ref={bottom} />
        </div>
      </main>
      <footer className="shrink-0 border-t border-amber-400/20 bg-background px-2 py-2 sm:px-3"><div className="mx-auto max-w-4xl"><GroupComposer placeholder="Message the VIP group…" onSendText={sendText} onSendMedia={sendMedia} /></div></footer>
    </div>
  );
}
