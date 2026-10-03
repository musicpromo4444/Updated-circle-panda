import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { CrushKind } from "@/lib/store";

interface SubmitCrushPhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind?: CrushKind;
  onSubmitted?: (kind: CrushKind) => void;
}

const MAX_FILE_SIZE = 6 * 1024 * 1024;

export function SubmitCrushPhotoModal({ open, onOpenChange, defaultKind = "wcw", onSubmitted }: SubmitCrushPhotoModalProps) {
  const [kind, setKind] = useState<CrushKind>(defaultKind);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    void (async () => {
      const { data } = await (supabase as any).rpc("get_my_profile_gender");
      if (data === "male" || data === "female") {
        setGender(data);
        setKind(data === "male" ? "mcm" : "wcw");
      }
    })();
  }, [open, defaultKind]);

  const choose = (next: File | null) => {
    if (!next) return;
    if (!next.type.startsWith("image/") && !next.type.startsWith("video/")) {
      toast.error("Only photos and videos are allowed.");
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      toast.error("Please keep the upload under 6MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const saveGender = async (next: "male" | "female") => {
    const { data, error } = await (supabase as any).rpc("set_profile_gender_secure", { p_gender: next });
    if (error) return toast.error(error.message ?? "Gender could not be saved");
    setGender(data === "male" ? "male" : "female");
    setKind(data === "male" ? "mcm" : "wcw");
  };

  const submit = async () => {
    if (!file) return toast.error("Choose a photo or video first.");
    if (!gender) return toast.error("Choose your account gender first.");
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid || auth.user?.is_anonymous) throw new Error("Please sign in before uploading your WCW/MCM entry.");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = uid + "/" + crypto.randomUUID() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from("circle-panda-crush").upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("circle-panda-crush").getPublicUrl(path).data.publicUrl;
      const { error } = await (supabase as any).rpc("submit_crush_media_secure", {
        p_media_url: publicUrl,
        p_media_type: file.type.startsWith("video/") ? "video" : "image",
        p_caption: caption.trim(),
        p_emoji: "🐼",
      });
      if (error) throw error;

      const actualKind: CrushKind = gender === "male" ? "mcm" : "wcw";
      toast.success(actualKind === "mcm" ? "Man Crush Monday entry uploaded." : "Woman Crush Wednesday entry uploaded.");
      onSubmitted?.(actualKind);
      clear();
      setCaption("");
      onOpenChange(false);
      window.dispatchEvent(new Event("circle-panda-crush-refresh"));
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) clear(); onOpenChange(value); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-display text-xl">Post to MCM / WCW</DialogTitle>
        <DialogDescription>Your profile gender decides the weekly category automatically.</DialogDescription>

        {!gender ? (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Choose your account gender</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void saveGender("female")}>Female · WCW</Button>
              <Button variant="outline" onClick={() => void saveGender("male")}>Male · MCM</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-secondary/60 px-3 py-2 text-xs font-semibold">
              Posting destination: {kind === "mcm" ? "Man Crush Monday" : "Woman Crush Wednesday"}
            </div>

            <input ref={inputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => choose(e.target.files?.[0] ?? null)} disabled={saving} />

            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-black">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} controls playsInline className="max-h-80 w-full object-contain" />
                ) : (
                  <img src={preview} alt="WCW/MCM upload preview" className="max-h-80 w-full object-contain" />
                )}
                <button type="button" onClick={clear} disabled={saving} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => inputRef.current?.click()} disabled={saving} className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-secondary/30 text-center">
                <Upload className="size-7 text-primary" />
                <span className="mt-2 text-sm font-bold">Choose photo or video</span>
                <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, GIF or video · max 6MB</span>
              </button>
            )}

            {file ? <p className="truncate text-center text-[11px] text-muted-foreground">{file.name}</p> : null}

            <div>
              <Label htmlFor="crush-caption">Caption (optional)</Label>
              <Textarea id="crush-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} placeholder="Add a short caption..." className="mt-1.5" disabled={saving} />
            </div>

            <Button disabled={saving || !file} className="w-full" onClick={() => void submit()}>
              {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Uploading…</> : <><Camera className="mr-2 size-4" /> Publish to {kind.toUpperCase()}</>}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
