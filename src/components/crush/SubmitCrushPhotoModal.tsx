import { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, type CrushKind } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SubmitCrushPhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind?: CrushKind;
  onSubmitted?: (kind: CrushKind) => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AVATAR_EMOJIS = ["🐼", "🌸", "⚡", "🌙", "✨", "🔥", "👑", "💖", "🎋", "🍫"];

export function SubmitCrushPhotoModal({
  open,
  onOpenChange,
  defaultKind = "wcw",
  onSubmitted,
}: SubmitCrushPhotoModalProps) {
  const { nominees, submitCrushPhoto, datingProfile } = useStore();
  const { user } = useCurrentUser();

  const [kind, setKind] = useState<CrushKind>(defaultKind);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [emoji, setEmoji] = useState("🐼");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync default kind when modal opens
  useEffect(() => {
    if (open) {
      setKind(defaultKind);
    }
  }, [open, defaultKind]);

  // Pre-fill user information from profile / session
  useEffect(() => {
    if (open) {
      const defaultName =
        user?.name ||
        datingProfile?.name ||
        (user?.email ? user.email.split("@")[0] : "") ||
        "You (anonymous)";
      setName(defaultName);
      setBlurb(
        datingProfile?.vibe ||
          datingProfile?.bio ||
          (kind === "wcw" ? "Campus Queen candidate 👑" : "Campus King contender ⚡"),
      );
      setEmoji(datingProfile?.emoji || (kind === "wcw" ? "🌸" : "⚡"));
    }
  }, [open, user, datingProfile, kind]);

  // Check if user already has an active entry for this category
  const existingEntry = nominees.find(
    (n) =>
      n.kind === kind &&
      (n.mine ||
        (user?.email && n.userEmail && n.userEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user?.id && n.userId && n.userId === user.id)),
  );

  const handleFileSelection = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid file format", {
        description: "Please upload a JPEG, PNG, or WebP photo.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Photo is too large", {
        description: "Please select an image smaller than 5 MB.",
      });
      return;
    }

    setSelectedFile(file);

    // Read and create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setPreviewUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  /**
   * Resizes & compresses an image to an optimized Data URL via Canvas.
   * This guarantees fast, self-contained, reliable storage in localStorage.
   */
  const compressImage = async (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 1000;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use webp if supported, or fallback to jpeg with 0.85 quality
        try {
          const compressed = canvas.toDataURL("image/webp", 0.85);
          if (compressed.startsWith("data:image/webp")) {
            resolve(compressed);
            return;
          }
        } catch {
          // ignore
        }
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleSubmit = async () => {
    const finalPhoto = previewUrl || existingEntry?.avatarUrl;
    if (!finalPhoto) {
      toast.error("Photo required", {
        description: "Please select a photo of yourself to submit.",
      });
      return;
    }

    const trimmedName = name.trim() || user?.name || "You (anonymous)";
    const trimmedBlurb =
      blurb.trim() || (kind === "wcw" ? "Campus Queen candidate 👑" : "Campus King contender ⚡");

    setIsProcessing(true);

    try {
      let finalAvatarUrl = finalPhoto;

      // 1. Optimize photo via canvas compression
      if (previewUrl && previewUrl.startsWith("data:")) {
        finalAvatarUrl = await compressImage(previewUrl);
      }

      // 2. If Supabase storage is available and connected, attempt upload
      if (selectedFile && supabase?.storage) {
        try {
          const fileExt = selectedFile.name.split(".").pop() || "jpg";
          const fileName = `crush/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("crush-photos")
            .upload(fileName, selectedFile, { cacheControl: "3600", upsert: false });

          if (!uploadErr && uploadData?.path) {
            const { data: pubData } = supabase.storage
              .from("crush-photos")
              .getPublicUrl(uploadData.path);
            if (pubData?.publicUrl) {
              finalAvatarUrl = pubData.publicUrl;
            }
          }
        } catch {
          // Gracefully continue with canvas compressed data URL
        }
      }

      // 3. Save to application store & associate with profile
      submitCrushPhoto({
        name: trimmedName,
        kind,
        blurb: trimmedBlurb,
        emoji,
        avatarUrl: finalAvatarUrl,
        userId: user?.id,
        userEmail: user?.email,
      });

      // 4. Trigger callback to navigate / switch view to the submitted feed
      onSubmitted?.(kind);
      onOpenChange(false);

      // Reset local file selection
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch {
      toast.error("Submission failed", {
        description: "There was an error processing your photo. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] sm:max-w-md overflow-y-auto border-border/80 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Camera className="size-4" />
            </span>
            <DialogTitle className="font-display text-lg font-bold">
              Submit Your Photo to {kind === "wcw" ? "WCW" : "MCM"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Get featured in this week's campus voting feed. Weekly top votes receive the Spotlight
            crown and 100 BC.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Category Toggle: WCW or MCM */}
          <div>
            <Label className="text-xs font-semibold text-foreground">Select Category</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("wcw")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all",
                  kind === "wcw"
                    ? "border-[var(--dating)] bg-[var(--dating)]/15 text-foreground shadow-xs ring-1 ring-[var(--dating)]"
                    : "border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span>🌸</span>
                <div className="text-left">
                  <p className="leading-none">WCW</p>
                  <p className="text-[10px] font-normal text-muted-foreground">Women Crush Wed</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setKind("mcm")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all",
                  kind === "mcm"
                    ? "border-primary bg-primary/15 text-foreground shadow-xs ring-1 ring-primary"
                    : "border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span>⚡</span>
                <div className="text-left">
                  <p className="leading-none">MCM</p>
                  <p className="text-[10px] font-normal text-muted-foreground">Men Crush Mon</p>
                </div>
              </button>
            </div>
          </div>

          {/* User Account / Association Notice */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Connected Account:
            </span>
            <span className="truncate max-w-[180px] font-medium text-foreground">
              {user?.email || "Local Guest Profile"}
            </span>
          </div>

          {/* Existing Entry Warning (Duplicate Prevention) */}
          {existingEntry ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-500">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Active Entry Found</p>
                <p className="text-[11px] text-muted-foreground">
                  You already have a live entry in this week's {kind.toUpperCase()} feed (
                  {existingEntry.votes} votes). Submitting will update your photo and keep your vote
                  progress intact.
                </p>
              </div>
            </div>
          ) : null}

          {/* Photo Upload / Card Preview Area */}
          <div>
            <Label className="text-xs font-semibold text-foreground">
              Your Photo {previewUrl || existingEntry?.avatarUrl ? "(Preview)" : "*"}
            </Label>

            {previewUrl || existingEntry?.avatarUrl ? (
              <div className="mt-2 space-y-2">
                {/* Live Card Preview styled exactly like WCW/MCM feed */}
                <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 shadow-md">
                  <img
                    src={previewUrl || existingEntry?.avatarUrl}
                    alt="Submission Preview"
                    className="size-full object-cover"
                  />
                  {/* Category Pill Tag */}
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-md">
                    {kind.toUpperCase()}
                  </span>

                  {/* Name and Blurb Overlay */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-12">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{emoji}</span>
                      <h3 className="truncate font-display text-base font-bold text-white drop-shadow-sm">
                        {name.trim() || "You (anonymous)"}
                      </h3>
                    </div>
                    {blurb.trim() ? (
                      <p className="mt-0.5 truncate text-[11px] text-white/80">{blurb.trim()}</p>
                    ) : null}
                  </div>

                  {/* Remove / Change photo button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                    title="Remove photo"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw className="size-3.5" /> Choose Different Photo
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all",
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60",
                )}
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary shadow-xs">
                  <Upload className="size-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Click to upload photo or drag & drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WebP up to 5 MB</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <Sparkles className="size-3 text-primary" /> Portrait / selfie photos look best
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {/* Profile Name & Tagline */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs font-semibold text-foreground">Display Name / Handle</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. You (anonymous), Campus Star, etc."
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">
                One-line Tagline / Blurb
              </Label>
              <Input
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                placeholder="e.g. Loves late walks & good music"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>

            {/* Avatar Emoji Selector */}
            <div>
              <Label className="text-xs font-semibold text-foreground">Badge Emoji</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "grid size-8 place-items-center rounded-xl border text-sm transition-all",
                      emoji === e
                        ? "border-primary bg-primary/20 scale-105 shadow-xs"
                        : "border-border/60 bg-secondary/40 hover:bg-secondary",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              className="w-full h-11 rounded-2xl gap-2 font-semibold shadow-md active:scale-98"
              disabled={isProcessing || (!previewUrl && !existingEntry?.avatarUrl)}
              onClick={handleSubmit}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="size-4 animate-spin" /> Processing Photo...
                </>
              ) : existingEntry ? (
                <>
                  <Check className="size-4" /> Update My {kind.toUpperCase()} Photo
                </>
              ) : (
                <>
                  <Camera className="size-4" /> Confirm & Submit to {kind.toUpperCase()}
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              By submitting, your photo becomes visible to the Circle Panda community in the{" "}
              {kind.toUpperCase()} voting feed.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
