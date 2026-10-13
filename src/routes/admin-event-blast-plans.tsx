import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { AdminEventBlastPlans } from "@/components/admin/AdminEventBlastPlans";

export const Route = createFileRoute("/admin-event-blast-plans")({
  component: function EventBlastPlansRoute() {
    return <AdminRoute><main className="min-h-screen bg-background p-4 text-foreground"><h1 className="mb-5 text-xl font-bold">Circle Panda — Event Blast Plans</h1><AdminEventBlastPlans /></main></AdminRoute>;
  },
});
