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
  const defaultStart = () => { const d = new Date(Date.now() + 3*86400000); d.setMinutes(0,0,0); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
  const [date, setDate] = useState(defaultStart);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [place, setPlace] = useState("");
  const [cost, setCost] = useState(0);
  const [blurb, setBlurb] = useState("");
  const [details, setDetails] = useState("");
  const [reachScope, setReachScope] = useState<"worldwide" | "country" | "state" | "city" | "area">("worldwide");
  const [reachCountry, setReachCountry] = useState("");
  const [reachState, setReachState] = useState("");
  const [reachCity, setReachCity] = useState("");
  const [reachArea, setReachArea] = useState("");

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
      time: `${durationMinutes} minutes`,
      place: place.trim() || "Location to be announced",
      cost: Number(cost) || 0,
      blurb: blurb.trim(),
      details: details.trim() || blurb.trim(),
      reachScope,
      reachCountry: reachCountry.trim(),
      reachState: reachState.trim(),
      reachCity: reachCity.trim(),
      reachArea: reachArea.trim(),
      durationMinutes,
    });

    toast.message("Publishing event…", {
      description: `"${title.trim()}" is being added to the events board.`,
    });

    // Reset form
    setTitle("");
    setBlurb("");
    setDetails("");
    setDurationMinutes(120);
    setPlace("");
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
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Duration</label>
              <Input type="number" min={15} max={10080} value={durationMinutes} onChange={(e) => setDurationMinutes(Math.max(15, Number(e.target.value) || 120))} placeholder="120" />
            </div>
          </div>

          {/* Event Reach */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground">Event Reach</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(["worldwide","country","state","city","area"] as const).map((scope) => (
                <button key={scope} type="button" onClick={() => setReachScope(scope)} className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize ${reachScope === scope ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/60 text-muted-foreground"}`}>{scope}</button>
              ))}
            </div>
            {reachScope !== "worldwide" ? <div className="grid gap-2 sm:grid-cols-2">
              {reachScope !== "area" ? <Input value={reachCountry} onChange={(e) => setReachCountry(e.target.value)} placeholder="Country" /> : null}
              {(reachScope === "state" || reachScope === "city" || reachScope === "area") ? <Input value={reachState} onChange={(e) => setReachState(e.target.value)} placeholder="State / Province" /> : null}
              {(reachScope === "city" || reachScope === "area") ? <Input value={reachCity} onChange={(e) => setReachCity(e.target.value)} placeholder="City" /> : null}
              {reachScope === "area" ? <Input value={reachArea} onChange={(e) => setReachArea(e.target.value)} placeholder="Area / Neighborhood" /> : null}
            </div> : null}
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
