import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, CalendarPlus, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StandardBannerAd } from "@/components/ads/StandardBannerAd";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { useStore, type PandaEvent } from "@/lib/store";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Community Events — Circle Panda" },
      {
        name: "description",
        content:
          "Browse anonymous-friendly meetups, karaoke nights, and blind coffee roulette, then RSVP.",
      },
      { property: "og:title", content: "Community Events — Circle Panda" },
      { property: "og:description", content: "Meetups for people who prefer masks to name tags." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { events, toggleRsvp } = useStore();
  const [openEvent, setOpenEvent] = useState<PandaEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const current = openEvent ? (events.find((e) => e.id === openEvent.id) ?? null) : null;

  return (
    <AppShell title="Events" subtitle="Masks encouraged. Names optional.">
      {/* Primary CTA button immediately below subtitle description and above main content cards */}
      <div className="mb-5">
        <Button
          size="lg"
          onClick={() => setCreateOpen(true)}
          className="w-full gap-2.5 rounded-2xl py-6 text-sm sm:text-base font-bold shadow-lg shadow-primary/20 transition-all hover:opacity-95 active:scale-[0.99] cursor-pointer"
        >
          <CalendarPlus className="size-5" />
          Create an Event
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {events.map((e, idx) => (
          <div key={e.id} className="contents">
            <button
              type="button"
              onClick={() => setOpenEvent(e)}
              className="panda-panel rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {e.tag}
                </span>
                <span className="coin-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  {e.cost === 0 ? "Free" : `${e.cost} BC`}
                </span>
              </div>
              <h2 className="mt-3 font-display text-lg leading-tight font-semibold">{e.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{e.blurb}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> {e.date} · {e.time}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {e.place}
                </p>
              </div>
              {e.rsvp ? (
                <p className="mt-3 rounded-lg bg-primary/15 py-1.5 text-center text-xs font-semibold text-primary">
                  You're going 🐼
                </p>
              ) : null}
            </button>

            {/* Standard banner advertisement after every sequence of 5 items */}
            {(idx + 1) % 5 === 0 ? (
              <div className="my-1 sm:col-span-2">
                <StandardBannerAd index={Math.floor(idx / 5)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpenEvent(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {current ? (
            <>
              <DialogHeader>
                <span className="w-fit rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {current.tag}
                </span>
                <DialogTitle className="font-display text-2xl">{current.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-2 rounded-xl bg-secondary/40 p-3 text-sm">
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" /> {current.date}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {current.time}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" /> {current.place}
                </p>
                <p className="flex items-center gap-2">
                  🪙 {current.cost === 0 ? "Free entry" : `${current.cost} BC to hold a seat`}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">{current.details}</p>

              <Button
                className="w-full"
                variant={current.rsvp ? "secondary" : "default"}
                onClick={() => {
                  toggleRsvp(current.id);
                  toast[current.rsvp ? "message" : "success"](
                    current.rsvp ? "RSVP cancelled" : "You're on the list 🐼",
                    { description: `${current.title} · ${current.date} at ${current.time}` },
                  );
                }}
              >
                {current.rsvp ? "Cancel RSVP" : "RSVP anonymously"}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Event Creation Modal */}
      <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
