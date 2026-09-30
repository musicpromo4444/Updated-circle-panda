import { createFileRoute } from "@tanstack/react-router";
import { AdminCampaignReports } from "@/components/admin/AdminCampaignReports";
export const Route = createFileRoute("/admin-campaign-reports")({ component: AdminCampaignReports });
