import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Circle Panda" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_my_notifications", { p_limit: 100 });
    if (error) toast.error(error.message ?? "Notifications could not be loaded");
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let channel: any;
    void (async () => {
      await load();
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return;
      channel = (supabase as any)
        .channel(`circle-panda-notifications-page-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "cp_notifications", filter: `user_id=eq.${uid}` }, (payload: any) => {
          setItems((current) => [payload.new, ...current.filter((x) => x.id !== payload.new.id)].slice(0, 100));
        })
        .subscribe();
    })();
    return () => { if (channel) void (supabase as any).removeChannel(channel); };
  }, []);

  const markRead = async () => {
    const { error } = await (supabase as any).rpc("mark_notifications_read");
    if (error) { toast.error(error.message ?? "Could not mark notifications read"); return; }
    setItems((current) => current.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    toast.success("Notifications marked as read");
  };

  const markOneRead = async (id: string) => {
    const { error } = await (supabase as any).rpc("mark_notification_read", { p_notification_id: id });
    if (error) { toast.error(error.message ?? "Could not mark notification read"); return; }
    setItems((current) => current.map((x) => x.id === id ? { ...x, read_at: x.read_at ?? new Date().toISOString() } : x));
  };

  return (
    <AppShell title="Notifications" subtitle="Your Circle Panda activity and rewards.">
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void markRead()} className="gap-2">
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      </div>
      {loading ? (
        <div className="panda-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading notifications…</div>
      ) : items.length === 0 ? (
        <div className="panda-panel rounded-2xl p-10 text-center">
          <Bell className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-display font-semibold">You're all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">New rewards, winners, and group activity will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className={`panda-panel rounded-2xl p-4 ${item.read_at ? "opacity-75" : "border-primary/40"}`}>
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">🔔</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <time className="mt-2 block text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time>
                </div>
                {!item.read_at ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 rounded-full"
                    aria-label="Mark notification as read"
                    title="Mark as read"
                    onClick={() => void markOneRead(item.id)}
                  >
                    <Check className="size-4" />
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
