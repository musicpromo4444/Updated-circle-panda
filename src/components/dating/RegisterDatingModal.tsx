import { useState, useEffect } from "react";
import { Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type DatingProfile } from "@/lib/store";

const EMOJI_AVATARS = ["🐼", "🌙", "✨", "🍫", "🎋", "⛈️", "☀️", "🎨", "🦊", "🐯", "🐨", "🦁"];
const SUGGESTED_INTERESTS = [
  "Books",
  "Late walks",
  "Vinyl",
  "Matcha",
  "Gaming",
  "Memes",
  "Baking",
  "Photography",
  "Live music",
  "Coffee",
  "Night drives",
  "Art galleries",
];

export function RegisterDatingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { datingProfile, registerDatingProfile } = useStore();

  const [name, setName] = useState(datingProfile?.name ?? "Anonymous Panda");
  const [age, setAge] = useState<number>(datingProfile?.age ?? 24);
  const [emoji, setEmoji] = useState(datingProfile?.emoji ?? "🐼");
  const [vibe, setVibe] = useState(datingProfile?.vibe ?? "");
  const [location, setLocation] = useState(datingProfile?.location ?? "Lagos");
  const [bio, setBio] = useState(datingProfile?.bio ?? "");
  const [interests, setInterests] = useState<string[]>(
    datingProfile?.interests ?? ["Late walks", "Books", "Matcha"],
  );

  useEffect(() => {
    if (datingProfile) {
      setName(datingProfile.name);
      setAge(datingProfile.age);
      setEmoji(datingProfile.emoji);
      setVibe(datingProfile.vibe);
      setLocation(datingProfile.location);
      setBio(datingProfile.bio);
      setInterests(datingProfile.interests);
    }
  }, [datingProfile]);

  const toggleInterest = (tag: string) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide an anonymous nickname");
      return;
    }
    if (!bio.trim()) {
      toast.error("Please add a short bio");
      return;
    }

    registerDatingProfile({
      name: name.trim(),
      age: Number(age) || 24,
      emoji,
      vibe: vibe.trim() || "Mysterious panda · night owl",
      location: location.trim() || "Anonymous",
      bio: bio.trim(),
      interests: interests.length > 0 ? interests : ["Late walks", "Memes"],
    });

    toast.success("🎉 Registered for Dating!", {
      description: "Your anonymous dating profile is live in the grove.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--dating)_20%,transparent)] text-[var(--dating)]">
              <Heart className="size-5 fill-current" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">
                {datingProfile ? "Edit Dating Profile" : "Register for Dating"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Remain 100% anonymous. Chats initiated with you carry the DATING CHAT badge.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Avatar Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Choose Avatar Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_AVATARS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`grid size-10 place-items-center rounded-xl text-xl transition-all cursor-pointer ${
                    emoji === em
                      ? "bg-[var(--dating)] text-white scale-110 shadow-md ring-2 ring-[var(--dating)]/50"
                      : "bg-secondary/60 hover:bg-secondary text-foreground"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Age */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Anonymous Handle
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Starlight Panda"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Age</label>
              <Input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Vibe & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Vibe / Tagline
              </label>
              <Input
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="e.g. Night owl · matcha lover"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Neighborhood / Campus
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lekki / Yaba"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Bio (What makes you tick?)
            </label>
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share what you're into, your favorite 2am conversation topics, or your biggest pet peeve..."
              required
            />
          </div>

          {/* Interests */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Interests & Passions (tap to toggle)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_INTERESTS.map((item) => {
                const active = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--dating)] text-white shadow-sm"
                        : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-1.5 bg-[var(--dating)] text-[var(--dating-foreground)] hover:bg-[var(--dating)]/90 font-bold"
            >
              <Sparkles className="size-4" />
              {datingProfile ? "Save Profile" : "Complete Registration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
