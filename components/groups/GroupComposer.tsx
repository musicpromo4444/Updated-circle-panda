import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Mic, Paperclip, Send, Square, Video } from "lucide-react";
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
  const timerRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft("");
    await onSendText(text);
  };

  const pick = async (file: File | undefined, type: "image" | "video") => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Media must be 25 MB or smaller.");
      return;
    }
    await onSendMedia({ type, file });
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  };

  const startRecording = async () => {
    if (disabled || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("Voice recording is not supported on this device/browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((x) => MediaRecorder.isTypeSupported(x));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) {
          const ext = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
          await onSendMedia({ type: "audio", file: new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }), durationSeconds: seconds });
        }
        setSeconds(0);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone permission is required for voice notes.");
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex items-end gap-2">
      <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0], "image"); e.currentTarget.value = ""; }} />
      <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0], "video"); e.currentTarget.value = ""; }} />
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => imageInput.current?.click()} title="Photo"><ImageIcon className="size-5" /></Button>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => videoInput.current?.click()} title="Video"><Video className="size-5" /></Button>
        <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" disabled={disabled && !recording} onClick={recording ? stopRecording : () => void startRecording()} title={recording ? "Stop voice note" : "Voice note"}>
          {recording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
        </Button>
      </div>
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={disabled || recording} placeholder={recording ? `Recording 00:${String(seconds).padStart(2,"0")}…` : placeholder} maxLength={2000} className="min-w-0 flex-1 rounded-2xl" />
      <Button type="submit" size="icon" disabled={disabled || recording || !draft.trim()} className="shrink-0 rounded-full"><Send className="size-4" /></Button>
    </form>
  );
}
