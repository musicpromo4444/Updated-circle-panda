import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Coins,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Radio,
  RotateCcw,
  Shield,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminEngagementManager,
  AdminMonetizationControl,
  AdminOverviewStats,
  AdminPricingManager,
  AdminUserManagement,
  AdminRoute,
  MASTER_ADMIN_EMAIL,
  useAdminStore,
} from "@/components/admin";
import { useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — Circle Panda" },
      {
        name: "description",
        content:
          "Admin control panel for Circle Panda cross-platform social & speed-dating ecosystem.",
      },
      { property: "og:title", content: "Admin Console — Circle Panda" },
      {
        property: "og:description",
        content:
          "Manage users, coin economies, pricing tiers, ad placements, and engagement features.",
      },
    ],
  }),
  component: function ProtectedAdminDashboard() {
    return (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    );
  },
});

type AdminTab = "overview" | "users" | "pricing" | "monetization" | "engagement" | "audit";

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const { user, logout } = useCurrentUser();

  const {
    users,
    adConfig,
    adMetrics,
    engagementConfig,
    logs,
    adjustUserCoins,
    toggleUserBan,
    resetUserStreak,
    updateAdConfig,
    addCreative,
    updateCreative,
    deleteCreative,
    toggleCreativeStatus,
    toggleSponsorPartner,
    updateEngagementConfig,
    updateExternalSurveyConfig,
    exportUsersCSV,
    resetToDefaultData,
  } = useAdminStore();

  const TABS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { id: "overview", label: "Overview & Analytics", icon: LayoutDashboard },
      { id: "users", label: `Users & Economy (${users.length})`, icon: Users },
      { id: "pricing", label: "Coin Store & VIP Pricing", icon: Coins },
      { id: "monetization", label: "Ad & Monetization", icon: Megaphone },
      { id: "engagement", label: "Engagement & Events", icon: Sparkles },
      { id: "audit", label: "Audit Logs", icon: History },
    ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* TOP ADMIN BAR */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* BRAND AND SYSTEM STATUS */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/40 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Return to Main App"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Back to App</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-black shadow-sm">
                <Shield className="size-4.5" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                    Circle Panda
                  </span>
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                    Admin
                  </span>
                </div>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  Cross-Platform Dashboard · Web &amp; Android WebView
                </p>
              </div>
            </div>
          </div>

          {/* TELEMETRY PILL & QUICK ACTIONS */}
          <div className="flex items-center gap-2">
            {/* MASTER ADMIN BADGE */}
            <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Shield className="size-3 text-primary" />
              <span className="font-semibold">Master Admin:</span>
              <span className="font-mono text-xs opacity-90 hidden sm:inline">
                {user?.email || MASTER_ADMIN_EMAIL}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetToDefaultData}
              className="h-8 rounded-xl border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Reset state to initial mock data"
            >
              <RotateCcw className="size-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Reset Data</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="h-8 rounded-xl border border-destructive/20 bg-destructive/10 px-2.5 text-xs text-destructive hover:bg-destructive/20 hover:text-destructive active:scale-95"
              title="Log out of Master Admin"
            >
              <LogOut className="size-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* NAVIGATION TABS SCROLLER */}
        <div className="border-t border-border/60 bg-muted/20">
          <div className="mx-auto flex w-full max-w-7xl overflow-x-auto px-4 py-1.5 scrollbar-none sm:px-6">
            <div className="flex items-center gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    activeTab === id
                      ? "bg-card text-primary shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className={`size-3.5 ${activeTab === id ? "text-primary" : ""}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" ? (
          <AdminOverviewStats users={users} adMetrics={adMetrics} />
        ) : null}

        {/* TAB 2: USER & ECONOMY MANAGEMENT */}
        {activeTab === "users" ? (
          <AdminUserManagement
            users={users}
            onAdjustCoins={adjustUserCoins}
            onToggleBan={toggleUserBan}
            onResetStreak={resetUserStreak}
            onExportCSV={exportUsersCSV}
          />
        ) : null}

        {/* TAB 3: COIN STORE & VIP PRICING */}
        {activeTab === "pricing" ? <AdminPricingManager /> : null}

        {/* TAB 4: AD & MONETIZATION CONTROL */}
        {activeTab === "monetization" ? (
          <AdminMonetizationControl
            adConfig={adConfig}
            adMetrics={adMetrics}
            onUpdateConfig={updateAdConfig}
            onTogglePartner={toggleSponsorPartner}
            onAddCreative={addCreative}
            onUpdateCreative={updateCreative}
            onDeleteCreative={deleteCreative}
            onToggleCreativeStatus={toggleCreativeStatus}
          />
        ) : null}

        {/* TAB 4: ENGAGEMENT & EVENTS MANAGER */}
        {activeTab === "engagement" ? (
          <AdminEngagementManager
            engagementConfig={engagementConfig}
            onUpdateConfig={updateEngagementConfig}
            onUpdateExternalSurveyConfig={updateExternalSurveyConfig}
          />
        ) : null}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === "audit" ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Administrative Audit Logs
              </h2>
              <p className="text-xs text-muted-foreground">
                Tamper-evident logs of coin rebalances, user moderation, and economy parameter
                changes.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="divide-y divide-border/60">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-4 p-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          {log.adminAction}
                        </span>
                        {log.targetUser ? (
                          <span className="font-semibold text-foreground">
                            Target: @{log.targetUser}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">{log.details}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
