import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle,
  Coins,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Link,
  Lock,
  Play,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type EngagementConfig, type ExternalSurveyConfig } from "./adminTypes";

interface AdminEngagementManagerProps {
  engagementConfig: EngagementConfig;
  onUpdateConfig: (partial: Partial<EngagementConfig>) => void;
  onUpdateExternalSurveyConfig?: (partial: Partial<ExternalSurveyConfig>) => void;
}

const PARTNER_PRESETS: {
  provider: "pollfish" | "tapresearch" | "bitlabs" | "custom";
  name: string;
  defaultEndpoint: string;
  defaultKey: string;
  recommendedReward: number;
}[] = [
  {
    provider: "tapresearch",
    name: "TapResearch Campus Survey Wall",
    defaultEndpoint:
      "https://wall.tapresearch.com/surveys?user_id=cp_user_current&app_id=circle_panda",
    defaultKey: "tr_live_sec_8923a10",
    recommendedReward: 35,
  },
  {
    provider: "pollfish",
    name: "Pollfish Interactive Consumer Insights",
    defaultEndpoint:
      "https://wss.pollfish.com/v2/device/web/surveys?api_key=pol_campus_live&user_id=cp_user_current",
    defaultKey: "pol_app_991823",
    recommendedReward: 40,
  },
  {
    provider: "bitlabs",
    name: "BitLabs High-Yield Offerwall",
    defaultEndpoint: "https://web.bitlabs.ai/?token=bit_token_71829&uid=cp_user_current",
    defaultKey: "bit_token_71829",
    recommendedReward: 50,
  },
  {
    provider: "custom",
    name: "Custom Partner Survey / Quiz Endpoint",
    defaultEndpoint: "https://api.partner.com/surveys/v1/wall?app=circle_panda",
    defaultKey: "cust_token_secret",
    recommendedReward: 30,
  },
];

export function AdminEngagementManager({
  engagementConfig,
  onUpdateConfig,
  onUpdateExternalSurveyConfig,
}: AdminEngagementManagerProps) {
  // Local form state for bonus rewards
  const [standardReward, setStandardReward] = useState(engagementConfig.standardDailyReward);
  const [streakReward, setStreakReward] = useState(engagementConfig.streakMilestoneReward);
  const [milestoneDays, setMilestoneDays] = useState(engagementConfig.streakMilestoneDays);

  // Local form state for daily quiz editor
  const [quizQuestion, setQuizQuestion] = useState(engagementConfig.quizQuestion);
  const [quizOptions, setQuizOptions] = useState([...engagementConfig.quizOptions]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(engagementConfig.quizCorrectIndex);
  const [quizReward, setQuizReward] = useState(engagementConfig.quizRewardBc);

  // External survey form state
  const externalSurvey = engagementConfig.externalSurvey || {
    enabled: false,
    provider: "tapresearch",
    providerName: "TapResearch Campus Survey Wall",
    apiKey: "tr_live_sec_8923a10",
    endpointUrl: "https://wall.tapresearch.com/surveys?user_id=cp_user_current&app_id=circle_panda",
    integrationMode: "iframe_overlay",
    rewardBc: 35,
    screenoutRewardBc: 5,
    dailySurveyCap: 3,
    surveyTopicFilter: "Student Lifestyle, Campus Tech & Career",
  };

  const [surveyEnabled, setSurveyEnabled] = useState(externalSurvey.enabled);
  const [provider, setProvider] = useState(externalSurvey.provider);
  const [providerName, setProviderName] = useState(externalSurvey.providerName);
  const [apiKey, setApiKey] = useState(externalSurvey.apiKey);
  const [endpointUrl, setEndpointUrl] = useState(externalSurvey.endpointUrl);
  const [integrationMode, setIntegrationMode] = useState(externalSurvey.integrationMode);
  const [rewardBc, setRewardBc] = useState(externalSurvey.rewardBc);
  const [screenoutRewardBc, setScreenoutRewardBc] = useState(externalSurvey.screenoutRewardBc);
  const [dailySurveyCap, setDailySurveyCap] = useState(externalSurvey.dailySurveyCap);
  const [topicFilter, setTopicFilter] = useState(externalSurvey.surveyTopicFilter || "");

  // Survey test simulator state
  const [isTestSimulatorOpen, setIsTestSimulatorOpen] = useState(false);
  const [simulationStep, setSimulationStep] = useState<"ready" | "loading" | "survey" | "rewarded">(
    "ready",
  );

  const handleSaveBonus = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      standardDailyReward: standardReward,
      streakMilestoneReward: streakReward,
      streakMilestoneDays: milestoneDays,
    });
    toast.success("Daily Login Bonus parameters updated!");
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      quizQuestion,
      quizOptions,
      quizCorrectIndex,
      quizRewardBc: quizReward,
    });
    toast.success("Community Daily Quiz question updated!");
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...quizOptions];
    updated[index] = val;
    setQuizOptions(updated);
  };

  const handleApplyPreset = (preset: (typeof PARTNER_PRESETS)[0]) => {
    setProvider(preset.provider);
    setProviderName(preset.name);
    setEndpointUrl(preset.defaultEndpoint);
    setApiKey(preset.defaultKey);
    setRewardBc(preset.recommendedReward);
    toast.info(`Loaded preset configurations for ${preset.name}`);
  };

  const handleToggleSurveyMode = (checked: boolean) => {
    setSurveyEnabled(checked);
    if (onUpdateExternalSurveyConfig) {
      onUpdateExternalSurveyConfig({ enabled: checked });
    }
  };

  const handleSaveExternalSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpointUrl.trim()) {
      toast.error("Please enter a valid survey endpoint or redirect URL");
      return;
    }

    if (onUpdateExternalSurveyConfig) {
      onUpdateExternalSurveyConfig({
        enabled: surveyEnabled,
        provider,
        providerName: providerName.trim() || "Survey Partner",
        apiKey: apiKey.trim(),
        endpointUrl: endpointUrl.trim(),
        integrationMode,
        rewardBc,
        screenoutRewardBc,
        dailySurveyCap,
        surveyTopicFilter: topicFilter.trim(),
      });
    }
  };

  return (
    <section className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Engagement &amp; Events Manager
        </h2>
        <p className="text-xs text-muted-foreground">
          Calibrate login bonus reward economies, toggle interactive Popup 2 mini-features, and
          integrate external quiz and survey partner APIs.
        </p>
      </div>

      {/* MODULE 1 & 2: LOGIN BONUS CONFIG VS POPUP 2 SWITCHBOARD */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* MODULE 1: DAILY LOGIN BONUS CONFIGURATION */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="size-4.5 text-amber-500" />
              <h3 className="font-display text-base font-bold text-foreground">
                Daily Login Bonus Configuration
              </h3>
            </div>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase">
              Economy Core
            </span>
          </div>

          <form onSubmit={handleSaveBonus} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              These values directly update the user-facing Modal 1 bonus popup and streak engine.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Standard Reward Input */}
              <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/30 p-3">
                <Label htmlFor="standard-reward" className="text-xs font-semibold text-foreground">
                  Standard Daily Reward
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                  <Input
                    id="standard-reward"
                    type="number"
                    min={1}
                    max={100}
                    value={standardReward}
                    onChange={(e) => setStandardReward(parseInt(e.target.value, 10) || 10)}
                    className="pl-7 font-display font-bold text-foreground"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Awarded for regular Day 1 &amp; Day 2 logins (default: 10 BC).
                </p>
              </div>

              {/* Streak Milestone Reward Input */}
              <div className="space-y-1.5 rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="streak-reward"
                    className="flex items-center gap-1 text-xs font-semibold text-orange-500"
                  >
                    <Flame className="size-3.5 fill-orange-500" />
                    <span>Streak Milestone Reward</span>
                  </Label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                  <Input
                    id="streak-reward"
                    type="number"
                    min={10}
                    max={500}
                    value={streakReward}
                    onChange={(e) => setStreakReward(parseInt(e.target.value, 10) || 50)}
                    className="pl-7 font-display font-bold text-orange-500"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Awarded on consecutive streak milestone (default: 50 BC).
                </p>
              </div>
            </div>

            {/* Streak Milestone Threshold Days */}
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  Consecutive Days for Milestone
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Number of uninterrupted days required to unlock the mega bonus.
                </p>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min={2}
                  max={7}
                  value={milestoneDays}
                  onChange={(e) => setMilestoneDays(parseInt(e.target.value, 10) || 3)}
                  className="text-center font-display font-bold"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStandardReward(10);
                  setStreakReward(50);
                  setMilestoneDays(3);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1 size-3.5" /> Defaults
              </Button>

              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
              >
                <Save className="mr-1.5 size-4" /> Save Economy Parameters
              </Button>
            </div>
          </form>
        </div>

        {/* MODULE 2: POPUP 2 ENGAGEMENT CAROUSEL SWITCHBOARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">
                Modal 2 Feature Switchboard
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">App Open Sequence</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Activate or deactivate interactive modules shown in Modal 2 immediately after the daily
            reward is collected.
          </p>

          <div className="space-y-3">
            {/* SWITCH 1: FREE SPINS */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <span>🎰</span>
                  <span>Daily Free Lucky Spin Wheel</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Grants 1 free spin per day with jackpot payouts up to 100 BC.
                </p>
              </div>
              <Switch
                checked={engagementConfig.freeSpinsActive}
                onCheckedChange={(checked) => onUpdateConfig({ freeSpinsActive: checked })}
              />
            </div>

            {/* SWITCH 2: DAILY QUIZZES & TRIVIA */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <span>🧠</span>
                  <span>Daily Quizzes &amp; Community Trivia</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Rewards users for answering today&apos;s trivia or completing survey wall tasks.
                </p>
              </div>
              <Switch
                checked={engagementConfig.dailyQuizzesActive}
                onCheckedChange={(checked) => onUpdateConfig({ dailyQuizzesActive: checked })}
              />
            </div>

            {/* SWITCH 3: HOT SEAT SPEED DATING */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <span>⚡</span>
                  <span>Speed Dating Hot Seat Queue</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Direct entry into rapid 3-minute video/voice dating rounds.
                </p>
              </div>
              <Switch
                checked={engagementConfig.hotSeatActive}
                onCheckedChange={(checked) => onUpdateConfig({ hotSeatActive: checked })}
              />
            </div>

            {/* SWITCH 4: CAMPUS CRUSH SWIPER */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <span>💌</span>
                  <span>Secret Campus Crush Discovery</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Allows students to anonymously like campus profiles.
                </p>
              </div>
              <Switch
                checked={engagementConfig.crushSwipesActive}
                onCheckedChange={(checked) => onUpdateConfig({ crushSwipesActive: checked })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NEW MODULE: EXTERNAL QUIZ & SURVEY API INTEGRATIONS MODULE */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-5">
        {/* MODULE HEADER & MODE SWITCHER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="size-5 text-purple-400" />
              <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                External Quiz &amp; Survey API Integrations
              </h3>
              <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-400">
                Partner Offerwall
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Connect external monetized survey and trivia providers (Pollfish, TapResearch,
              BitLabs) or switch to internal manual trivia questions for Modal 2.
            </p>
          </div>

          {/* ENGINE TOGGLE BANNER */}
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-secondary/40 p-2.5 sm:px-4">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Active Quiz Engine
              </span>
              <span
                className={`text-xs font-bold ${surveyEnabled ? "text-purple-400" : "text-emerald-500"}`}
              >
                {surveyEnabled ? "External Partner API Wall" : "Internal Manual Trivia"}
              </span>
            </div>
            <Switch
              checked={surveyEnabled}
              onCheckedChange={handleToggleSurveyMode}
              aria-label="Toggle between internal trivia and external survey partner"
            />
          </div>
        </div>

        {/* ACTIVE ENGINE STATUS BANNER */}
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-xs transition-colors ${
            surveyEnabled
              ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {surveyEnabled ? (
              <Globe className="size-4.5 text-purple-400 mt-0.5 shrink-0" />
            ) : (
              <HelpCircle className="size-4.5 text-emerald-400 mt-0.5 shrink-0" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold text-foreground">
                {surveyEnabled
                  ? `External Partner API Mode Active: ${providerName}`
                  : "Internal Manual Trivia Mode Active"}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {surveyEnabled
                  ? `Modal 2 (Engagement Features) will launch the external survey wall (${integrationMode}) paying users ${rewardBc} BC per completed survey.`
                  : `Modal 2 will present the custom community trivia question below rewarding ${quizReward} BC for correct answers.`}
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setIsTestSimulatorOpen(true);
              setSimulationStep("ready");
            }}
            className="shrink-0 h-8 rounded-lg text-xs font-semibold"
          >
            <Play className="mr-1 size-3 text-purple-400" /> Test Launch
          </Button>
        </div>

        {/* PARTNER PRESET SELECTOR CHIPS */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            Quick Partner API Templates:
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PARTNER_PRESETS.map((pst) => (
              <button
                key={pst.provider}
                type="button"
                onClick={() => handleApplyPreset(pst)}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                  provider === pst.provider
                    ? "border-purple-500 bg-purple-500/15 shadow-xs"
                    : "border-border/70 bg-secondary/20 hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-display text-xs font-bold text-foreground capitalize">
                    {pst.provider}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500">
                    +{pst.recommendedReward} BC
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {pst.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* EXTERNAL API CONFIGURATION FORM */}
        <form onSubmit={handleSaveExternalSurvey} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 1. Partner Provider Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="survey-provider" className="text-xs font-semibold text-foreground">
                Integration Provider Platform
              </Label>
              <select
                id="survey-provider"
                value={provider}
                onChange={(e) => {
                  const val = e.target.value as "pollfish" | "tapresearch" | "bitlabs" | "custom";
                  setProvider(val);
                  const matched = PARTNER_PRESETS.find((p) => p.provider === val);
                  if (matched) {
                    setProviderName(matched.name);
                    setEndpointUrl(matched.defaultEndpoint);
                    setApiKey(matched.defaultKey);
                  }
                }}
                className="flex h-9 w-full rounded-xl border border-border/80 bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:border-purple-500 focus:outline-hidden"
              >
                <option value="tapresearch">TapResearch Campus Survey Wall</option>
                <option value="pollfish">Pollfish Interactive Consumer Insights</option>
                <option value="bitlabs">BitLabs High-Yield Offerwall</option>
                <option value="custom">Custom Partner API / Redirect Endpoint</option>
              </select>
            </div>

            {/* 2. Provider Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="provider-name" className="text-xs font-semibold text-foreground">
                Display Label in User UI *
              </Label>
              <Input
                id="provider-name"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., TapResearch Campus Survey Wall"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* 3. Partner API Key / App Secret Token */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="survey-api-key" className="text-xs font-semibold text-foreground">
                  Partner API Key / App Secret Token
                </Label>
                <span className="text-[10px] text-muted-foreground">Stored securely</span>
              </div>
              <div className="relative">
                <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="survey-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g., tr_live_sec_8923a10"
                  className="h-9 pl-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* 4. Integration Delivery Mode */}
            <div className="space-y-1.5">
              <Label htmlFor="survey-mode" className="text-xs font-semibold text-foreground">
                Survey Delivery Method
              </Label>
              <select
                id="survey-mode"
                value={integrationMode}
                onChange={(e) =>
                  setIntegrationMode(
                    e.target.value as "iframe_overlay" | "external_redirect" | "webview_intent",
                  )
                }
                className="flex h-9 w-full rounded-xl border border-border/80 bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:border-purple-500 focus:outline-hidden"
              >
                <option value="iframe_overlay">In-App Iframe Overlay (Recommended)</option>
                <option value="external_redirect">External Browser Redirect (Safest)</option>
                <option value="webview_intent">Android Native WebView Bridge Intent</option>
              </select>
            </div>

            {/* 5. External Endpoint URL or Redirect Link */}
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="survey-endpoint" className="text-xs font-semibold text-foreground">
                  Survey Wall Endpoint or Redirect Link *
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Macro tokens available: <code className="text-purple-400">{"{{USER_ID}}"}</code>,{" "}
                  <code className="text-purple-400">{"{{CAMPUS}}"}</code>
                </span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="survey-endpoint"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://wall.tapresearch.com/surveys?user_id={{USER_ID}}&app_id=circle_panda"
                    className="h-9 pl-8 text-xs font-mono"
                    required
                  />
                </div>
                {endpointUrl ? (
                  <a
                    href={endpointUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/50 px-3 text-xs font-medium hover:bg-secondary text-foreground"
                  >
                    <span>Test URL</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            </div>

            {/* 6. Parameters for Reward Payouts */}
            <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/20 p-3">
              <Label htmlFor="reward-bc" className="text-xs font-semibold text-foreground">
                Task Completion Reward Payout (BC) *
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                <Input
                  id="reward-bc"
                  type="number"
                  min={5}
                  max={200}
                  value={rewardBc}
                  onChange={(e) => setRewardBc(parseInt(e.target.value, 10) || 35)}
                  className="pl-7 font-display font-bold text-foreground"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Coins credited immediately upon webhook or iframe completion confirmation.
              </p>
            </div>

            {/* 7. Screenout / Disqualification Guarantee */}
            <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/20 p-3">
              <Label htmlFor="screenout-bc" className="text-xs font-semibold text-foreground">
                Screenout Consolation Reward (BC)
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                <Input
                  id="screenout-bc"
                  type="number"
                  min={0}
                  max={25}
                  value={screenoutRewardBc}
                  onChange={(e) => setScreenoutRewardBc(parseInt(e.target.value, 10) || 5)}
                  className="pl-7 font-display font-bold text-foreground"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Awarded even if survey disqualifies user to preserve engagement goodwill.
              </p>
            </div>

            {/* 8. Daily Cap & Topic Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="daily-cap" className="text-xs font-semibold text-foreground">
                Daily Survey Limit per User
              </Label>
              <Input
                id="daily-cap"
                type="number"
                min={1}
                max={15}
                value={dailySurveyCap}
                onChange={(e) => setDailySurveyCap(parseInt(e.target.value, 10) || 3)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topic-filter" className="text-xs font-semibold text-foreground">
                Survey Topic &amp; Category Filters
              </Label>
              <Input
                id="topic-filter"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                placeholder="Student Lifestyle, Campus Tech & Career"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Callback verification and fraud prevention active</span>
            </div>

            <Button
              type="submit"
              size="sm"
              className="rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
            >
              <Save className="mr-1.5 size-4" /> Save External API Integration
            </Button>
          </div>
        </form>
      </div>

      {/* MODULE 3: COMMUNITY MANUAL TRIVIA QUESTION & REWARD EDITOR */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-4.5 text-emerald-400" />
            <h3 className="font-display text-base font-bold text-foreground">
              Internal Manual Trivia Question Editor
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                !surveyEnabled
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {!surveyEnabled ? "● Serving in Modal 2" : "○ Standby Mode"}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          When external survey partner is disabled, users answer this question inside Modal 2 to
          earn coins.
        </p>

        <form onSubmit={handleSaveQuiz} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-3 space-y-1">
              <Label className="text-xs font-semibold text-foreground">Question Prompt</Label>
              <Input
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
                className="text-xs"
                placeholder="Type trivia question..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Reward Amount (BC)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">🪙</span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={quizReward}
                  onChange={(e) => setQuizReward(parseInt(e.target.value, 10) || 15)}
                  className="pl-7 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Multiple Choice Options (Select radio for correct answer)
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quizOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                    quizCorrectIndex === idx
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border/70 bg-secondary/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="correct-option"
                    checked={quizCorrectIndex === idx}
                    onChange={() => setQuizCorrectIndex(idx)}
                    className="size-4 accent-emerald-500"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="h-8 text-xs bg-transparent border-0 focus-visible:ring-1"
                  />
                  {quizCorrectIndex === idx ? (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-500 uppercase">
                      Correct
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            >
              <Save className="mr-1.5 size-4" /> Save Trivia Question
            </Button>
          </div>
        </form>
      </div>

      {/* MODULE 4: UPCOMING EVENT SCHEDULES */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4.5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              Event Schedules &amp; Campus Campaign Calendar
            </h3>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            3 Scheduled
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              id: "ev-1",
              title: "Friday Campus Speed Dating",
              schedule: "Every Friday at 8:00 PM WAT",
              tag: "Speed Dating",
              color: "text-[var(--dating)]",
              status: "Active",
            },
            {
              id: "ev-2",
              title: "Weekend Mega Jackpot Sweepstake",
              schedule: "Saturdays 10:00 PM WAT",
              tag: "Sweepstakes",
              color: "text-amber-500",
              status: "Active",
            },
            {
              id: "ev-3",
              title: "Wednesday WCW / MCM Spotlight Reveal",
              schedule: "Wednesdays 12:00 PM WAT",
              tag: "Crushes",
              color: "text-pink-500",
              status: "Active",
            },
          ].map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${ev.color}`}>
                  {ev.tag}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-500">
                  <CheckCircle className="size-2.5" /> {ev.status}
                </span>
              </div>
              <p className="font-display text-sm font-bold text-foreground">{ev.title}</p>
              <p className="text-xs text-muted-foreground">{ev.schedule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TEST SURVEY SIMULATOR MODAL (PREVIEW) */}
      {isTestSimulatorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setIsTestSimulatorOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              <Globe className="size-5 text-purple-400" />
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Survey Integration Live Test Simulator
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simulating user experience for {providerName}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Endpoint:</span>
                <span className="font-mono text-[11px] text-purple-400 truncate max-w-[280px]">
                  {endpointUrl}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Delivery Mode:</span>
                <span className="font-bold text-foreground capitalize">
                  {integrationMode.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Reward on Completion:</span>
                <span className="font-bold text-emerald-500">+{rewardBc} BC</span>
              </div>
            </div>

            {/* SIMULATION STATES */}
            {simulationStep === "ready" ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Click below to simulate a user launching this partner survey wall from Modal 2.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setSimulationStep("loading");
                    setTimeout(() => setSimulationStep("survey"), 800);
                  }}
                  className="rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <Play className="mr-1.5 size-4" /> Start Simulated Survey Session
                </Button>
              </div>
            ) : null}

            {simulationStep === "loading" ? (
              <div className="text-center py-8 space-y-2">
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                <p className="text-xs text-muted-foreground">Connecting to partner gateway...</p>
              </div>
            ) : null}

            {simulationStep === "survey" ? (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Simulated Partner Survey (Question 1 of 3)</span>
                  <span className="text-purple-400">TapResearch Demo</span>
                </div>
                <p className="text-xs text-foreground">
                  &ldquo;Which streaming platform do you use most frequently on campus?&rdquo;
                </p>
                <div className="space-y-1.5">
                  {["Spotify", "Apple Music", "Audiomack", "YouTube Music"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSimulationStep("rewarded")}
                      className="w-full text-left rounded-lg border border-border/70 bg-card p-2 text-xs hover:border-purple-500 hover:bg-purple-500/10 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {simulationStep === "rewarded" ? (
              <div className="text-center py-4 space-y-3">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-500 text-2xl">
                  ✓
                </div>
                <div className="space-y-1">
                  <p className="font-display text-base font-bold text-foreground">
                    Survey Completed Successfully!
                  </p>
                  <p className="text-xs text-emerald-500 font-bold">
                    Webhook callback verified: +{rewardBc} BC credited to user wallet
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsTestSimulatorOpen(false)}
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground"
                >
                  Done &amp; Close Simulator
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
