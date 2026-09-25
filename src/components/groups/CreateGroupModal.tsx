import { useState } from "react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a group name");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please add a topic or purpose");
      return;
    }

    const group = createGroup(name.trim(), topic.trim());

    toast.success("🎉 Group Created!", {
      description: `"${name.trim()}" is now live with 24-hour anonymous timer.`,
    });

    setName("");
    setTopic("");
    onOpenChange(false);

    void navigate({ to: "/groups/$groupId", params: { groupId: group.id } });
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
              <DialogTitle className="font-display text-xl font-bold">Create Group</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Anonymous group chat. Rooms lock 24 hours after being opened.
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
              Every message stays anonymous. When the 24-hour countdown reaches zero, the room
              securely locks.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-1.5 font-bold">
              <Sparkles className="size-4" />
              Create & Open Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
