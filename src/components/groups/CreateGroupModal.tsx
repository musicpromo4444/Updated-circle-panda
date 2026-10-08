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
  const [about, setAbout] = useState("");
  const [limitations, setLimitations] = useState("");
  const [countryRestriction, setCountryRestriction] = useState("");

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
    if (!about.trim()) {
      toast.error("Please say what this circle is about");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.is_anonymous) {
      onOpenChange(false);
      requestLogin("create a group");
      return;
    }

    const group = await createGroup(name.trim(), about.trim(), limitations.trim(), countryRestriction.trim());
    if (!group) return;



    setName("");
    setAbout("");
    setLimitations("");
    setCountryRestriction("");
    onOpenChange(false);

    void group;
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
                Create a circle and start chatting.
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

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">What is this circle about?</label>
            <Textarea rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="What should people talk about here?" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Limitations</label>
            <Textarea rows={2} value={limitations} onChange={(e) => setLimitations(e.target.value)} placeholder="Rules or limits for this group (optional)" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Country restriction</label>
            <Input value={countryRestriction} onChange={(e) => setCountryRestriction(e.target.value)} placeholder="Leave empty for everyone" />
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
