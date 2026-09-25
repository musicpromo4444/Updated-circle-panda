import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Megaphone,
  Percent,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  UploadCloud,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  type AdCreative,
  type AdPerformanceMetrics,
  type AdPlacementConfig,
  type AdPlacementTarget,
} from "./adminTypes";

interface AdminMonetizationControlProps {
  adConfig: AdPlacementConfig;
  adMetrics: AdPerformanceMetrics;
  onUpdateConfig: (partial: Partial<AdPlacementConfig>) => void;
  onTogglePartner: (partnerId: string) => void;
  onAddCreative?: (
    creative: Omit<AdCreative, "id" | "impressions" | "clicks" | "createdAt">,
  ) => void;
  onUpdateCreative?: (id: string, partial: Partial<AdCreative>) => void;
  onDeleteCreative?: (id: string) => void;
  onToggleCreativeStatus?: (id: string) => void;
}

const PLACEMENT_OPTIONS: { id: AdPlacementTarget; label: string; tag: string }[] = [
  {
    id: "popup_1_daily_login",
    label: "Popup 1 - Daily Login Banner",
    tag: "Modal 1 Top",
  },
  {
    id: "popup_2_engagement",
    label: "Popup 2 - Engagement Features",
    tag: "Modal 2 Sponsor",
  },
  {
    id: "main_feed_card",
    label: "Main Feed Card",
    tag: "In-Feed Stream",
  },
  {
    id: "speed_dating_interstitial",
    label: "Speed Dating Interstitial",
    tag: "Matching Event",
  },
];

const PRESET_IMAGE_TEMPLATES = [
  {
    label: "Campus Tech & 5G",
    url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
  },
  {
    label: "Student Fintech",
    url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
  },
  {
    label: "Campus Music & Audio",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
  },
  {
    label: "Study & Education",
    url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80",
  },
  {
    label: "Student Lifestyle & Party",
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
  },
];

export function AdminMonetizationControl({
  adConfig,
  adMetrics,
  onUpdateConfig,
  onTogglePartner,
  onAddCreative,
  onUpdateCreative,
  onDeleteCreative,
  onToggleCreativeStatus,
}: AdminMonetizationControlProps) {
  // Inventory form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Creative form fields
  const [sponsor, setSponsor] = useState("Chipper Cash Campus");
  const [headline, setHeadline] = useState("Free ₦1,000 Welcome Bonus on Student Signup");
  const [description, setDescription] = useState(
    "Send pocket money to roommates with 0% transfer fee and get virtual dollar debit cards.",
  );
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
  );
  const [destinationUrl, setDestinationUrl] = useState("https://chippercash.com");
  const [placement, setPlacement] = useState<AdPlacementTarget>("popup_1_daily_login");
  const [category, setCategory] = useState("Fintech / Student Banking");
  const [callToAction, setCallToAction] = useState("Claim ₦1,000");
  const [status, setStatus] = useState<"active" | "paused">("active");

  // Filters
  const [filterPlacement, setFilterPlacement] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const creatives = adConfig.creatives || [];

  const handleOpenNewForm = () => {
    setEditingId(null);
    setSponsor("");
    setHeadline("");
    setDescription("");
    setImageUrl(PRESET_IMAGE_TEMPLATES[0].url);
    setDestinationUrl("https://");
    setPlacement("popup_1_daily_login");
    setCategory("General / Sponsor");
    setCallToAction("Learn More");
    setStatus("active");
    setIsFormOpen(true);
  };

  const handleEditCreative = (creative: AdCreative) => {
    setEditingId(creative.id);
    setSponsor(creative.sponsor);
    setHeadline(creative.headline);
    setDescription(creative.description || "");
    setImageUrl(creative.imageUrl || "");
    setDestinationUrl(creative.destinationUrl);
    setPlacement(creative.placement);
    setCategory(creative.category);
    setCallToAction(creative.callToAction);
    setStatus(creative.status);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsor.trim() || !headline.trim() || !destinationUrl.trim()) {
      toast.error("Please fill in Sponsor, Headline, and Destination URL");
      return;
    }

    if (editingId) {
      if (onUpdateCreative) {
        onUpdateCreative(editingId, {
          sponsor: sponsor.trim(),
          headline: headline.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          destinationUrl: destinationUrl.trim(),
          placement,
          category: category.trim(),
          callToAction: callToAction.trim() || "Learn More",
          status,
        });
      }
    } else {
      if (onAddCreative) {
        onAddCreative({
          sponsor: sponsor.trim(),
          headline: headline.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          destinationUrl: destinationUrl.trim(),
          placement,
          category: category.trim(),
          callToAction: callToAction.trim() || "Learn More",
          status,
        });
      }
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  const filteredCreatives = creatives.filter((c) => {
    const matchesPlacement = filterPlacement === "all" || c.placement === filterPlacement;
    const matchesSearch =
      c.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlacement && matchesSearch;
  });

  return (
    <section className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Ad &amp; Monetization Control
        </h2>
        <p className="text-xs text-muted-foreground">
          Configure static banner placements, Android WebView intent bridges, and manage the live
          creative inventory serving Web &amp; Android applet components.
        </p>
      </div>

      {/* 2-COLUMN GRID: CONFIG SWITCHES VS PERFORMANCE GAUGES */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* COLUMN 1: PLACEMENT SWITCHES & INTERVALS */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Sliders className="size-4.5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              Placement &amp; Display Controls
            </h3>
          </div>

          <div className="space-y-4">
            {/* SWITCH 1: DAILY LOGIN POPUP STATIC BANNER */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    Daily Login Popup Banner Ad
                  </span>
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-500 uppercase">
                    Modal 1
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Displays a sleek static sponsor card at the top of the daily login reward dialog.
                  Safe for Web and Android WebViews.
                </p>
              </div>

              <Switch
                checked={adConfig.dailyLoginPopupBanner}
                onCheckedChange={(checked) => onUpdateConfig({ dailyLoginPopupBanner: checked })}
              />
            </div>

            {/* SWITCH 2: MAIN FEED STATIC BANNER */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    Main Feed Injected Banner
                  </span>
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.2 text-[9px] font-bold text-blue-500 uppercase">
                    Feed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Injects lightweight static ads into the main campus feed stream between post
                  cards.
                </p>
              </div>

              <Switch
                checked={adConfig.mainFeedBanner}
                onCheckedChange={(checked) => onUpdateConfig({ mainFeedBanner: checked })}
              />
            </div>

            {/* SLIDER: FEED BANNER FREQUENCY */}
            {adConfig.mainFeedBanner ? (
              <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Feed Ad Interval Frequency</span>
                  <span className="font-bold text-primary">
                    Every {adConfig.feedBannerInterval} items
                  </span>
                </div>
                <Slider
                  min={2}
                  max={8}
                  step={1}
                  value={[adConfig.feedBannerInterval]}
                  onValueChange={(val) => onUpdateConfig({ feedBannerInterval: val[0] || 4 })}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Aggressive (2 items)</span>
                  <span>Balanced (4 items)</span>
                  <span>Relaxed (8 items)</span>
                </div>
              </div>
            ) : null}

            {/* SWITCH 3: ANDROID WEBVIEW NATIVE BRIDGE */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    Android WebView Intent Bridge
                  </span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-500 uppercase">
                    Hybrid Bridge
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Opens sponsor destination URLs via native Android external browser intents to
                  avoid disrupting internal WebView SPA states.
                </p>
              </div>

              <Switch
                checked={adConfig.androidNativeBridgeEnabled}
                onCheckedChange={(checked) =>
                  onUpdateConfig({ androidNativeBridgeEnabled: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* COLUMN 2: CROSS-PLATFORM PERFORMANCE METRICS */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="size-4.5 text-amber-500" />
              <h3 className="font-display text-base font-bold text-foreground">
                Cross-Platform Ad Metrics
              </h3>
            </div>
            <span className="text-[11px] font-medium text-emerald-500">● 99.1% High Fill Rate</span>
          </div>

          {/* SIDE-BY-SIDE METRICS TABLE */}
          <div className="grid grid-cols-2 gap-3">
            {/* WEB METRICS */}
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-500">
                <Globe className="size-3.5" />
                <span>Web Browser</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Click-Through (CTR)</span>
                  <span className="font-bold text-foreground">{adMetrics.ctrWeb}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min(100, adMetrics.ctrWeb * 15)}%` }}
                  />
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Fill Rate</span>
                  <span className="font-bold text-emerald-500">{adMetrics.fillRateWeb}%</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">eCPM</span>
                  <span className="font-bold text-foreground">${adMetrics.eCpmWeb}</span>
                </div>

                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="text-muted-foreground">Revenue Est.</span>
                  <span className="font-bold text-emerald-500">
                    ${adMetrics.revenueWeb.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ANDROID METRICS */}
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                <Smartphone className="size-3.5" />
                <span>Android WebView</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Click-Through (CTR)</span>
                  <span className="font-bold text-foreground">{adMetrics.ctrAndroid}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, adMetrics.ctrAndroid * 15)}%` }}
                  />
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Fill Rate</span>
                  <span className="font-bold text-emerald-500">{adMetrics.fillRateAndroid}%</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">eCPM</span>
                  <span className="font-bold text-foreground">${adMetrics.eCpmAndroid}</span>
                </div>

                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="text-muted-foreground">Revenue Est.</span>
                  <span className="font-bold text-emerald-500">
                    ${adMetrics.revenueAndroid.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TELEMETRY NOTE */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1 font-semibold text-foreground">
              <Sparkles className="size-3.5 text-primary" /> Android In-App Advantage
            </p>
            <p className="mt-1 leading-relaxed">
              Android WebView impressions convert with <strong>+42% higher CTR</strong> due to
              mobile intent bridging and faster interstitial load times.
            </p>
          </div>
        </div>
      </div>

      {/* NEW MODULE: AD CREATIVE & PLACEMENT INVENTORY MANAGER */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        {/* INVENTORY HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4.5 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                Ad Creative &amp; Placement Inventory Manager
              </h3>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                {creatives.filter((c) => c.status === "active").length} Active / {creatives.length}{" "}
                Total
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Create and edit banner creatives, target specific modal/feed placements, and track
              live CTR. Changes dynamically update the user-facing app components immediately.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => (isFormOpen ? setIsFormOpen(false) : handleOpenNewForm())}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
          >
            {isFormOpen ? (
              <>
                <ChevronUp className="size-4" /> Close Form
              </>
            ) : (
              <>
                <Plus className="size-4" /> Add New Creative
              </>
            )}
          </Button>
        </div>

        {/* EDITABLE CREATIVE INVENTORY FORM (COLLAPSIBLE / EXPANDABLE) */}
        {isFormOpen ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2">
                <UploadCloud className="size-4 text-primary" />
                <h4 className="font-display text-sm font-bold text-foreground">
                  {editingId ? "Edit Ad Creative Campaign" : "Create New Ad Creative Asset"}
                </h4>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Target: {PLACEMENT_OPTIONS.find((p) => p.id === placement)?.label}
              </span>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 1. Placement Target Selector (Dropdown) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="creative-placement"
                    className="text-xs font-semibold text-foreground"
                  >
                    Placement Target Selector *
                  </Label>
                  <select
                    id="creative-placement"
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as AdPlacementTarget)}
                    className="flex h-9 w-full rounded-xl border border-border/80 bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:border-primary focus:outline-hidden"
                  >
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.tag})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Determines where this creative renders (Modal 1, Modal 2, or Campus Feed).
                  </p>
                </div>

                {/* 2. Sponsor Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="creative-sponsor"
                    className="text-xs font-semibold text-foreground"
                  >
                    Sponsor / Brand Name *
                  </Label>
                  <Input
                    id="creative-sponsor"
                    value={sponsor}
                    onChange={(e) => setSponsor(e.target.value)}
                    placeholder="e.g., MTN Pulse, Spotify, Chipper Cash"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* 3. Destination Target Link (Click-through URL) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="creative-dest-url"
                      className="text-xs font-semibold text-foreground"
                    >
                      Destination Target Link (Click-through URL) *
                    </Label>
                    {destinationUrl && destinationUrl !== "https://" ? (
                      <a
                        href={destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="size-2.5" />
                      </a>
                    ) : null}
                  </div>
                  <Input
                    id="creative-dest-url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://sponsor-website.com/campus-offer"
                    className="h-9 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    External link opened when users tap or click the banner ad.
                  </p>
                </div>

                {/* 4. Category / Tag */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="creative-category"
                    className="text-xs font-semibold text-foreground"
                  >
                    Category Tag
                  </Label>
                  <Input
                    id="creative-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Telecom, Student Banking, Music"
                    className="h-9 text-xs"
                  />
                </div>

                {/* 5. Banner Image URL / Asset Link */}
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="creative-image-url"
                      className="text-xs font-semibold text-foreground"
                    >
                      Banner Image URL / Asset Link
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Paste custom CDN link or pick a preset below
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="creative-image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or https://cdn.circlepanda.app/banner.jpg"
                      className="h-9 text-xs font-mono"
                    />
                    {imageUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        className="h-9 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>

                  {/* Preset quick image buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Image Presets:
                    </span>
                    {PRESET_IMAGE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => setImageUrl(tpl.url)}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          imageUrl === tpl.url
                            ? "border-primary bg-primary/20 text-primary font-semibold"
                            : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Headline & Copy */}
                <div className="md:col-span-2 space-y-1.5">
                  <Label
                    htmlFor="creative-headline"
                    className="text-xs font-semibold text-foreground"
                  >
                    Headline / Promotional Tagline *
                  </Label>
                  <Input
                    id="creative-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g., Get 5GB Night & Weekend Data for ₦500"
                    className="h-9 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="creative-desc" className="text-xs font-semibold text-foreground">
                    Ad Description / Secondary Copy
                  </Label>
                  <Input
                    id="creative-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Special student bundles on Circle Panda. Keep chatting uninterrupted."
                    className="h-9 text-xs"
                  />
                </div>

                {/* 7. Call To Action & Campaign Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="creative-cta" className="text-xs font-semibold text-foreground">
                      Call to Action Text
                    </Label>
                    <Input
                      id="creative-cta"
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      placeholder="e.g., Claim Offer, Get Bundle, Install"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Campaign Status</Label>
                    <div className="flex h-9 items-center justify-between rounded-xl border border-border/80 bg-background px-3">
                      <span className="text-xs font-semibold capitalize text-foreground">
                        {status}
                      </span>
                      <Switch
                        checked={status === "active"}
                        onCheckedChange={(checked) => setStatus(checked ? "active" : "paused")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="rounded-xl border border-border/70 bg-background/80 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Eye className="size-3.5" />
                  <span>
                    Live Rendering Preview (
                    {PLACEMENT_OPTIONS.find((p) => p.id === placement)?.label})
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/80 bg-card p-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={sponsor}
                          referrerPolicy="no-referrer"
                          className="size-12 rounded-lg object-cover border border-border/60 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                      ) : (
                        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary text-xl font-black">
                          {sponsor ? sponsor[0].toUpperCase() : "★"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.2 font-bold uppercase text-[9px] text-foreground">
                            Ad
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {sponsor || "Sponsor Name"}
                          </span>
                          <span>· {category || "Sponsored"}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-bold text-foreground line-clamp-1">
                          {headline || "Promotional headline appears here"}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {description || "Description body text renders here."}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        <span>{callToAction || "Action"}</span>
                        <ExternalLink className="ml-1 size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
                >
                  <Check className="mr-1 size-3.5" />
                  {editingId ? "Save Changes" : "Create & Deploy Creative"}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {/* SEARCH & PLACEMENT FILTER BAR */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterPlacement("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterPlacement === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              All Placements ({creatives.length})
            </button>
            {PLACEMENT_OPTIONS.map((opt) => {
              const count = creatives.filter((c) => c.placement === opt.id).length;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterPlacement(opt.id)}
                  className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    filterPlacement === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.tag} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sponsor or copy..."
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* INVENTORY TABLE / CARDS */}
        {filteredCreatives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2">
            <Megaphone className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No creatives match this filter</p>
            <p className="text-xs text-muted-foreground">
              Add a new creative or change your placement selection.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenNewForm}
              className="mt-2 text-xs"
            >
              <Plus className="mr-1 size-3.5" /> Add Creative
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredCreatives.map((creative) => {
              const ctr =
                creative.impressions > 0
                  ? ((creative.clicks / creative.impressions) * 100).toFixed(2)
                  : "0.00";
              const targetMeta = PLACEMENT_OPTIONS.find((p) => p.id === creative.placement);

              return (
                <div
                  key={creative.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    creative.status === "active"
                      ? "border-border/80 bg-card hover:border-primary/40 shadow-xs"
                      : "border-border/50 bg-muted/20 opacity-70"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top row: Placement badge & Status Switch */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {targetMeta?.tag || creative.placement}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {creative.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            creative.status === "active"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {creative.status}
                        </span>
                        <Switch
                          checked={creative.status === "active"}
                          onCheckedChange={() =>
                            onToggleCreativeStatus ? onToggleCreativeStatus(creative.id) : null
                          }
                          aria-label={`Toggle active state for ${creative.sponsor}`}
                        />
                      </div>
                    </div>

                    {/* Creative Card Body */}
                    <div className="flex items-start gap-3">
                      {creative.imageUrl ? (
                        <img
                          src={creative.imageUrl}
                          alt={creative.sponsor}
                          referrerPolicy="no-referrer"
                          className="size-14 rounded-xl object-cover border border-border/60 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                      ) : (
                        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-foreground text-xl font-bold">
                          {creative.sponsor[0]}
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <p className="font-display text-sm font-bold text-foreground truncate">
                          {creative.sponsor}
                        </p>
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {creative.headline}
                        </p>
                        {creative.description ? (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {creative.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Destination URL */}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="shrink-0 font-medium">URL:</span>
                      <a
                        href={creative.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                        title={creative.destinationUrl}
                      >
                        {creative.destinationUrl}
                      </a>
                    </div>
                  </div>

                  {/* Bottom Stats & Actions */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Impressions</span>
                        <span className="font-bold text-foreground">
                          {creative.impressions.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Clicks</span>
                        <span className="font-bold text-foreground">
                          {creative.clicks.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">CTR</span>
                        <span className="font-bold text-emerald-500">{ctr}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCreative(creative)}
                        className="h-7 rounded-lg px-2 text-[11px]"
                      >
                        Edit
                      </Button>

                      {onDeleteCreative ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteCreative(creative.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          title="Delete creative"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIVE SPONSOR PARTNERS LIST (SECONDARY LEGACY AD CHANNELS) */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Sponsor Network Syndication Partners
            </h3>
            <p className="text-xs text-muted-foreground">
              Direct campus brand contracts delivering dynamic fills across West African university
              hubs.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {adConfig.sponsorPartners.filter((p) => p.active).length} Active Networks
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {adConfig.sponsorPartners.map((partner) => (
            <div
              key={partner.id}
              className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                partner.active
                  ? "border-border/80 bg-secondary/30"
                  : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {partner.category}
                  </span>
                  <Switch
                    checked={partner.active}
                    onCheckedChange={() => onTogglePartner(partner.id)}
                  />
                </div>

                <p className="font-display text-sm font-bold text-foreground">{partner.name}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  &ldquo;{partner.headline}&rdquo;
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                <span className="text-muted-foreground">CTR: {partner.ctr}%</span>
                <span className="font-semibold text-foreground">
                  {partner.clicks.toLocaleString()} clicks
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
