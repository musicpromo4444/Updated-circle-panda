import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  Coins,
  Download,
  Flame,
  Globe,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminAdjustBalanceModal } from "./AdminAdjustBalanceModal";
import { type AdminUser, type UserPlatform, type UserStatus } from "./adminTypes";

interface AdminUserManagementProps {
  users: AdminUser[];
  onAdjustCoins: (userId: string, amount: number, reason: string) => void;
  onToggleBan: (userId: string) => void;
  onResetStreak: (userId: string) => void;
  onExportCSV: () => void;
}

export function AdminUserManagement({
  users,
  onAdjustCoins,
  onToggleBan,
  onResetStreak,
  onExportCSV,
}: AdminUserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | UserPlatform>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [streakOnly, setStreakOnly] = useState(false);

  // Selected user for balance adjustment dialog
  const [selectedUserForAdjustment, setSelectedUserForAdjustment] = useState<AdminUser | null>(
    null,
  );

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlatform = platformFilter === "all" || u.platform === platformFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    const matchesStreak = !streakOnly || u.streak >= 3;

    return matchesSearch && matchesPlatform && matchesStatus && matchesStreak;
  });

  return (
    <section className="space-y-4">
      {/* SECTION HEADER & EXPORT */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            User &amp; Economy Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor real-time coin balances, login streaks, registration platforms, and security
            status.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          className="flex min-h-[38px] items-center gap-1.5 self-start rounded-xl text-xs font-semibold sm:self-auto"
        >
          <Download className="size-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* SEARCH INPUT */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* PLATFORM FILTER */}
            <div className="flex items-center rounded-xl border border-border bg-secondary/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPlatformFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  platformFilter === "all"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Platforms
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter("android_webview")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  platformFilter === "android_webview"
                    ? "bg-card text-emerald-500 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="size-3 text-emerald-500" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter("web_browser")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  platformFilter === "web_browser"
                    ? "bg-card text-blue-500 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="size-3 text-blue-500" />
                <span>Web</span>
              </button>
            </div>

            {/* STATUS FILTER */}
            <div className="flex items-center rounded-xl border border-border bg-secondary/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === "active"
                    ? "bg-card text-emerald-500 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("banned")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === "banned"
                    ? "bg-card text-destructive shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Banned
              </button>
            </div>

            {/* 3+ DAY STREAK TOGGLE */}
            <button
              type="button"
              onClick={() => setStreakOnly((prev) => !prev)}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors ${
                streakOnly
                  ? "border-orange-500 bg-orange-500/15 text-orange-500"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="size-3 fill-orange-500 text-orange-500" />
              <span>3+ Day Streaks ({users.filter((u) => u.streak >= 3).length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Showing <strong>{filteredUsers.length}</strong> of {users.length} registered accounts
          </span>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-primary hover:underline"
            >
              Clear search
            </button>
          ) : null}
        </div>
      </div>

      {/* USER TABLE (DESKTOP & TABLET VIEW) */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">BC Balance</th>
                <th className="px-4 py-3">Login Streak</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No users matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/30">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-lg">
                          {user.avatar}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{user.username}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {user.email || `ID: ${user.id}`} · Rep: {user.reputation}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3">
                      {user.platform === "android_webview" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                          <Smartphone className="size-3" /> Android App
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-500">
                          <Globe className="size-3" /> Web Browser
                        </span>
                      )}
                    </td>

                    {/* BC Balance */}
                    <td className="px-4 py-3">
                      <span className="font-display text-sm font-bold text-[var(--coin)]">
                        🪙 {user.coins.toLocaleString()} BC
                      </span>
                    </td>

                    {/* Login Streak */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            user.streak >= 3
                              ? "bg-orange-500/15 text-orange-500 shadow-xs"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          <Flame
                            className={`size-3 ${user.streak >= 3 ? "fill-orange-500" : ""}`}
                          />
                          <span>Day {user.streak}</span>
                        </span>
                        {user.streak >= 3 ? (
                          <span className="rounded bg-orange-500/20 px-1 text-[9px] font-bold text-orange-400">
                            50 BC Tier
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {user.status === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                          <CheckCircle2 className="size-2.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                          <Ban className="size-2.5" /> Banned
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUserForAdjustment(user)}
                          className="h-8 rounded-lg border-amber-500/30 px-2.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/10"
                        >
                          <Coins className="mr-1 size-3" />
                          <span>Adjust BC</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onResetStreak(user.id)}
                          className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Reset Streak to Day 1"
                        >
                          <RefreshCw className="size-3" />
                        </Button>

                        <Button
                          type="button"
                          variant={user.status === "active" ? "ghost" : "outline"}
                          size="sm"
                          onClick={() => onToggleBan(user.id)}
                          className={`h-8 rounded-lg px-2 text-xs font-semibold ${
                            user.status === "active"
                              ? "text-destructive hover:bg-destructive/10"
                              : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                          }`}
                        >
                          {user.status === "active" ? (
                            <UserX className="size-3.5" />
                          ) : (
                            <UserCheck className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE ADAPTIVE CARDS (UNDER 768px) */}
      <div className="space-y-3 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No users matching current filters.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-2xl">
                    {user.avatar}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{user.username}</p>
                    <p className="text-[11px] text-muted-foreground">{user.email || user.id}</p>
                  </div>
                </div>

                {user.status === "active" ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                    ACTIVE
                  </span>
                ) : (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    BANNED
                  </span>
                )}
              </div>

              {/* STATS STRIP */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground">Platform</span>
                  <p className="mt-0.5 font-medium flex items-center justify-center gap-1 text-[11px]">
                    {user.platform === "android_webview" ? (
                      <>
                        <Smartphone className="size-3 text-emerald-500" /> Android
                      </>
                    ) : (
                      <>
                        <Globe className="size-3 text-blue-500" /> Web
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Balance</span>
                  <p className="mt-0.5 font-display font-bold text-[var(--coin)]">
                    🪙 {user.coins} BC
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Streak</span>
                  <p className="mt-0.5 font-semibold flex items-center justify-center gap-0.5">
                    <Flame className="size-3 fill-orange-500 text-orange-500" /> Day {user.streak}
                  </p>
                </div>
              </div>

              {/* ACTIONS ROW (TOUCH READY) */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUserForAdjustment(user)}
                  className="flex-1 min-h-[40px] rounded-xl border-amber-500/30 text-xs font-semibold text-amber-500"
                >
                  <Coins className="mr-1 size-3.5" /> Adjust BC
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onResetStreak(user.id)}
                  className="min-h-[40px] px-3 rounded-xl text-xs text-muted-foreground"
                  title="Reset Streak"
                >
                  <RefreshCw className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant={user.status === "active" ? "destructive" : "default"}
                  size="sm"
                  onClick={() => onToggleBan(user.id)}
                  className="min-h-[40px] px-3 rounded-xl text-xs font-semibold"
                >
                  {user.status === "active" ? "Ban" : "Unban"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADJUST BALANCE MODAL */}
      <AdminAdjustBalanceModal
        user={selectedUserForAdjustment}
        open={Boolean(selectedUserForAdjustment)}
        onClose={() => setSelectedUserForAdjustment(null)}
        onConfirm={onAdjustCoins}
      />
    </section>
  );
}
