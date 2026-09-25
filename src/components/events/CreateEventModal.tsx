import { useState } from "react";
import { CalendarPlus, Sparkles } from "lucide-react";
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

const EVENT_TAGS = [
  "Meetup",
  "Nightlife",
  "Gaming",
  "Music & Vinyl",
  "Study & Chill",
  "Foodie",
  "Arts",
];

export function CreateEventModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createEvent } = useStore();

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Meetup");
  const [date, setDate] = useState("This Saturday");
  const [time, setTime] = useState("8:00 PM");
  const [place, setPlace] = useState("The Secret Grove, Lekki");
  const [cost, setCost] = useState(0);
  const [blurb, setBlurb] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide an event title");
      return;
    }
    if (!blurb.trim()) {
      toast.error("Please add a short summary blurb");
      return;
    }

    createEvent({
      title: title.trim(),
      tag,
      date: date.trim() || "Upcoming",
      time: time.trim() || "TBD",
      place: place.trim() || "Secret Location",
      cost: Number(cost) || 0,
      blurb: blurb.trim(),
      details: details.trim() || blurb.trim(),
    });

    toast.success("🎉 Event Created!", {
      description: `"${title.trim()}" is now published on the events board.`,
    });

    // Reset form
    setTitle("");
    setBlurb("");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <CalendarPlus className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">Create an Event</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Host an anonymous meetup, party, or casual gathering for the circle.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Event Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blind Vinyl Roulette & Matcha"
              required
            />
          </div>

          {/* Category Tag */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Category Tag
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    tag === t
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "border border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date</label>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. This Saturday"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Time</label>
              <Input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 8:30 PM"
                required
              />
            </div>
          </div>

          {/* Location & Entry Fee */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Location / Venue
              </label>
              <Input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. The Rooftop Grove, Victoria Island"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Fee (BC)
              </label>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                placeholder="0 = Free"
              />
            </div>
          </div>

          {/* Short Blurb */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Short Blurb (shown on card)
            </label>
            <Input
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="e.g. Bring your favorite vinyl record. Masks encouraged, name tags banned."
              required
            />
          </div>

          {/* Full Details */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              What to Expect / Details
            </label>
            <Textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Give attendees instructions, guidelines, what to bring, and meetup etiquette..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-1.5 font-bold">
              <Sparkles className="size-4" />
              Publish Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
