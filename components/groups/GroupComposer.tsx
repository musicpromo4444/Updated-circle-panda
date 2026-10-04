import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Mic, Send, Square, Video, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type OutgoingGroupMedia = {
  type: "image" | "video" | "audio";
  file: File;
  durationSeconds?: number;
};

export function GroupComposer({
  disabled,
  placeholder = "Message…",
  onSendText,
  onSendMedia,
}: {
  disabled?: boolean;
  placeholder?: string;
  onSendText: (body: string) => Promise<void> | void;
  onSendMedia: (media: OutgoingGroupMedia) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<OutgoingGroupMedia | null>(null);
  const timerRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cancelRecording = () => {
    clearTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
    setPendingVoice(null);
  };

  const stopRecording = () => {
    clearTimer();
    setRecording(false);
    recorderRef.current?.stop();
  };

  const startRecording = async () => {
    if (disabled || recording || pendingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("Voice recording is not supported on this device/browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"].find(x => MediaRecorder.isTypeSupported(x));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) {
          const ext = recorder.mimeType.includes("mp4") ? "m4a" : recorder.mimeType.includes("mpeg") ? "mp3" : "webm";
          setPendingVoice({ type: "audio", file: new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }), durationSeconds: seconds });
        }
        chunksRef.current = [];
        recorderRef.current = null;
        setSeconds(0);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      toast.error("Microphone permission is required for voice notes.");
    }
  };

  const sendVoice = async () => {
    if (!pendingVoice || disabled) return;
    const voice = pendingVoice;
    setPendingVoice(null);
    await onSendMedia(voice);
  };

  const pick = async (file: File | undefined, type: "image" | "video") => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Media must be 25 MB or smaller.");
      return;
    }
    await onSendMedia({ type, file });
  };

  if (recording || pendingVoice) {
    return (
      <div className="flex items-center gap-2 rounded-[28px] border border-border bg-card px-2.5 py-2 shadow-sm">
        <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={cancelRecording} aria-label="Cancel voice recording">
          {pendingVoice ? <Trash2 className="size-5 text-destructive" /> : <X className="size-5" />}
        </Button>
        <div className="min-w-0 flex-1 px-1">
          <div className="flex items-center gap-2">
          </div>
          <div className="flex h-10 items-center gap-[2px] overflow-hidden">
            {Array.from({length: 38}).map((_,i)=><span key={i} className={`w-[3px] rounded-full transition-all ${recording ? "bg-muted-foreground" : "bg-muted-foreground/70"}`} style={{height:`${recording ? 7 + ((i * 17 + seconds * 5) % 28) : 7 + ((i * 13) % 24)}px`}} />)}
          </div>
        </div>
        {recording ? (
          <Button type="button" variant="secondary" size="icon" className="size-11 shrink-0 rounded-full" onClick={stopRecording} aria-label="Stop recording">
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button type="button" size="icon" className="size-11 shrink-0 rounded-full" onClick={() => void sendVoice()} aria-label="Send voice message">
            <Send className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void (async () => { const text = draft.trim(); if (!text || disabled) return; setDraft(""); await onSendText(text); })(); }} className="flex items-end gap-2">
      <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={e => { void pick(e.target.files?.[0], "image"); e.currentTarget.value = ""; }} />
      <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={e => { void pick(e.target.files?.[0], "video"); e.currentTarget.value = ""; }} />
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => imageInput.current?.click()} title="Photo"><ImageIcon className="size-5" /></Button>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => videoInput.current?.click()} title="Video"><Video className="size-5" /></Button>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => void startRecording()} title="Voice note"><Mic className="size-5" /></Button>
      </div>
      <Input value={draft} onChange={e => setDraft(e.target.value)} disabled={disabled} placeholder={placeholder} maxLength={2000} className="min-w-0 flex-1 rounded-2xl" />
      <Button type="submit" size="icon" disabled={disabled || !draft.trim()} className="shrink-0 rounded-full"><Send className="size-4" /></Button>
    </form>
  );
}
