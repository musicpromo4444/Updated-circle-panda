import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Coins,
  DollarSign,
  Flame,
  Globe,
  Radio,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { type AdminUser, type AdPerformanceMetrics } from "./adminTypes";

interface AdminOverviewStatsProps {
  users: AdminUser[];
  adMetrics: AdPerformanceMetrics;
}

export function AdminOverviewStats({ users, adMetrics }: AdminOverviewStatsProps) {
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("7d");

  // Multiplier mock for time periods
  const mult = timeRange === "today" ? 0.2 : timeRange === "7d" ? 1 : 3.8;

  const totalUsersCount = 24850;
  const webUsersCount = Math.round(totalUsersCount * 0.42);
  const androidUsersCount = totalUsersCount - webUsersCount;

  const activeStreaksCount = Math.round(6420 * mult);
  const milestoneStreaksCount = Math.round(1840 * mult);

  const totalCoinsInCirculation = 1482900;
  const dailyCoinsAwarded = Math.round(64200 * mult);

  const totalRevenue = adMetrics.revenueWeb + adMetrics.revenueAndroid;
  const totalImpressions = adMetrics.impressionsWeb + adMetrics.impressionsAndroid;

  return (
    <section className="space-y-4">
      {/* HEADER BAR: TITLE + TIME SELECTOR + SYSTEM STATUS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 items-center justify-center rounded-full bg-emerald-500">
              <span className="size-2 animate-ping rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Live Telemetry &amp; Bridge Active
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Android WebView v2.4 + Web
            </span>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Overview &amp; Ecosystem Health
          </h2>
        </div>

        {/* TIME PERIOD TABS */}
        <div className="flex items-center self-start rounded-xl border border-border bg-secondary/60 p-1 text-xs sm:self-auto">
          {(
            [
              { id: "today", label: "Today" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeRange(t.id)}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                timeRange === t.id
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 PRIMARY STATS CARDS */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* CARD 1: TOTAL REGISTERED USERS */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            <div className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-blue-500">
              <Users className="size-4.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {totalUsersCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                <TrendingUp className="mr-0.5 size-3" />
                +12.8%
              </span>
            </div>

            {/* Web vs Android Split */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-2.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Smartphone className="size-3.5 text-emerald-500" />
                <span>Android:</span>
                <strong className="text-foreground">58%</strong>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="size-3.5 text-blue-500" />
                <span>Web:</span>
                <strong className="text-foreground">42%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ACTIVE DAILY STREAKS */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-orange-500/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Streaks</span>
            <div className="grid size-9 place-items-center rounded-xl bg-orange-500/15 text-orange-500">
              <Flame className="size-4.5 fill-orange-500" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {activeStreaksCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                <TrendingUp className="mr-0.5 size-3" />
                +9.4%
              </span>
            </div>

            {/* Streak Milestone breakdown */}
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
              <span>3+ Day Milestone:</span>
              <span className="font-bold text-orange-500">
                {milestoneStreaksCount.toLocaleString()} users (50 BC)
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL BC IN CIRCULATION */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-amber-500/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total BC in Circulation
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
              <Coins className="size-4.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-[var(--coin)] sm:text-3xl">
                {(totalCoinsInCirculation / 1000).toFixed(1)}k BC
              </span>
              <span className="text-xs font-medium text-muted-foreground">Circulating</span>
            </div>

            {/* Faucet volume info */}
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
              <span>Daily Faucet/Burn:</span>
              <span className="font-bold text-emerald-500">
                +{dailyCoinsAwarded.toLocaleString()} BC
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: AD REVENUE & IMPRESSIONS */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ad Revenue (Est.)</span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <DollarSign className="size-4.5" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                ${(totalRevenue * mult).toFixed(2)}
              </span>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                <ArrowUpRight className="mr-0.5 size-3" />
                +16.2%
              </span>
            </div>

            {/* Impressions summary */}
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
              <span>Impressions:</span>
              <span className="font-bold text-foreground">
                {Math.round(totalImpressions * mult).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WEB VS ANDROID SPLIT METRICS BANNER */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-secondary/30 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">
              Cross-Platform Telemetry: Web vs. Android WebView
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Monetization &amp; Engagement comparison
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Web Impressions */}
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="size-3.5 text-blue-500" />
              <span>Web Browser</span>
            </div>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {Math.round(adMetrics.impressionsWeb * mult).toLocaleString()} impr.
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>CTR: {adMetrics.ctrWeb}%</span>
              <span>Fill: {adMetrics.fillRateWeb}%</span>
            </div>
          </div>

          {/* Android Impressions */}
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Smartphone className="size-3.5 text-emerald-500" />
              <span>Android WebView</span>
            </div>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {Math.round(adMetrics.impressionsAndroid * mult).toLocaleString()} impr.
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>CTR: {adMetrics.ctrAndroid}%</span>
              <span>Fill: {adMetrics.fillRateAndroid}%</span>
            </div>
          </div>

          {/* Web eCPM & Revenue */}
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="size-3.5 text-blue-500" />
              <span>Web Revenue &amp; eCPM</span>
            </div>
            <p className="mt-1 font-display text-lg font-bold text-emerald-500">
              ${(adMetrics.revenueWeb * mult).toFixed(2)}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>eCPM: ${adMetrics.eCpmWeb}</span>
              <span className="text-emerald-500 font-medium">Verified</span>
            </div>
          </div>

          {/* Android eCPM & Revenue */}
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Smartphone className="size-3.5 text-emerald-500" />
              <span>Android Revenue &amp; eCPM</span>
            </div>
            <p className="mt-1 font-display text-lg font-bold text-emerald-500">
              ${(adMetrics.revenueAndroid * mult).toFixed(2)}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>eCPM: ${adMetrics.eCpmAndroid}</span>
              <span className="text-emerald-500 font-medium">+32% higher</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
