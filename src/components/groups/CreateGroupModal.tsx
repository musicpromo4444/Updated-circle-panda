import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Sparkles } from "lucide-react";
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
import { useStore } from "@/lib/store";
import { requestLogin } from "@/components/auth/LoginRequiredDialog";
import { supabase } from "@/integrations/supabase/client";

export function CreateGroupModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createGroup } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user || data.user.is_anonymous) {
        onOpenChange(false);
        requestLogin("create a group");
      }
    });
    return () => { active = false; };
  }, [open, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a group name");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please add a topic or purpose");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) {
      onOpenChange(false);
      requestLogin("create a group");
      return;
    }

    const group = await createGroup(name.trim(), topic.trim(), country.trim(), "", city.trim(), area.trim());
    if (!group) return;



    setName("");
    setTopic("");
    setCountry("");
    setCity("");
    setArea("");
    onOpenChange(false);

    // Keep the new group on the Groups page as a compact card.\n    // The full WhatsApp-style room opens only when the user taps the card.\n    void group;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <MessagesSquare className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">Create Your Circle</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                A place for people to come together, sit in the circle, and talk. Rooms lock 24 hours after being opened.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Group Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3AM Epiphanies & Lo-Fi"
              required
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Country</label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Nigeria" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">City / Area</label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Port Harcourt" /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Neighbourhood / Area (optional)</label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. GRA" /></div>

          {/* Topic */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Topic / Purpose
            </label>
            <Textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should anonymous members talk about here? Set ground rules and discussion prompts..."
              required
            />
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">⏳ Ephemeral 24-Hour Rule</p>
            <p className="mt-0.5">
              The group is created as a locked card. When 3 members have joined, it opens into the full group chat.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-1.5 font-bold">
              <Sparkles className="size-4" />
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
