import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Armchair,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
  Disc,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveAdCreative, useLiveEngagementConfig } from "@/components/ads/adInventoryStorage";
import { openAdExternalUrl } from "@/components/ads/platformAdBridge";
import { useStore } from "@/lib/store";

export interface EngagementFeaturesModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal 2: Engagement Features
 * Triggers sequentially after Modal 1 is closed or claimed.
 * Dynamically synchronized with the Admin Panel:
 * - Switches between Internal Manual Trivia and External Partner API Surveys (TapResearch/Pollfish)
 * - Toggles features (Free Spins, Hot Seat, Crush Swiping)
 * - Showcases active sponsor creative targeted for Modal 2
 */
export function EngagementFeaturesModal({ open, onClose }: EngagementFeaturesModalProps) {
  const navigate = useNavigate();
  const { addCoins } = useStore();

  // Live admin configurations
  const engagementConfig = useLiveEngagementConfig();
  const activeModal2Ad = useActiveAdCreative("popup_2_engagement");

  const externalSurvey = engagementConfig.externalSurvey;
  const isExternalSurveyMode = Boolean(externalSurvey?.enabled);

  // Interactive internal mini-quiz states
  const [activeQuiz, setActiveQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);

  // Interactive external survey iframe/flow simulator state
  const [activeSurveyOverlay, setActiveSurveyOverlay] = useState(false);
  const [surveyStep, setSurveyStep] = useState<"intro" | "questions" | "done">("intro");

  const handleAction = (route: string, label: string) => {
    onClose();
    void navigate({ to: route });
    toast.info(`Heading to ${label}`);
  };

  // Handle Internal Manual Quiz Answer
  const handleQuizSubmit = () => {
    if (selectedOption === null || quizAnswered) return;
    const correctIndex = engagementConfig.quizCorrectIndex ?? 1;
    const reward = engagementConfig.quizRewardBc || 15;
    const correct = selectedOption === correctIndex;
    setQuizAnswered(true);
    setIsQuizCorrect(correct);

    if (correct) {
      addCoins(reward, "Daily Community Trivia Reward");
      toast.success("Correct answer! 🎉", {
        description: `+${reward} BC added to your balance.`,
      });
    } else {
      toast.error("Not quite! Better luck on tomorrow's question.");
    }
  };

  // Handle External Survey Wall Launch
  const handleStartSurvey = () => {
    if (!externalSurvey) return;

    if (externalSurvey.integrationMode === "external_redirect") {
      openAdExternalUrl(externalSurvey.endpointUrl, externalSurvey.providerName);
      toast.info(`Launching ${externalSurvey.providerName}...`);
      return;
    }

    // Otherwise show inline interactive survey modal
    setActiveSurveyOverlay(true);
    setSurveyStep("intro");
  };

  const handleCompleteSurvey = () => {
    const reward = externalSurvey?.rewardBc || 35;
    addCoins(reward, `${externalSurvey?.providerName || "Partner"} Survey Reward`);
    setSurveyStep("done");
    toast.success(`Survey completed! 🎉`, {
      description: `+${reward} BC verified and credited to your wallet.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : null)}>
      <DialogContent
        className="max-h-[92vh] w-[92vw] max-w-md overflow-y-auto rounded-3xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-lg"
        style={{
          width: "clamp(320px, 92vw, 480px)",
        }}
      >
        {/* MODAL HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent px-5 pb-3 pt-6 text-center sm:px-6">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/20 text-2xl shadow-inner">
            <Compass className="size-6 text-primary" />
          </div>

          <DialogHeader className="space-y-1">
            <div className="mx-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Sparkles className="size-3" /> Explore &amp; Earn More
            </div>
            <DialogTitle className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              What&apos;s Buzzing on Panda
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Boost your wallet and connect with the campus community with these interactive
              features:
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* MODAL 2 SPONSOR BANNER (IF CONFIGURED IN ADMIN INVENTORY) */}
        {activeModal2Ad ? (
          <div className="mx-5 my-1 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-secondary/60 to-secondary/30 p-3 shadow-xs sm:mx-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {activeModal2Ad.imageUrl ? (
                  <img
                    src={activeModal2Ad.imageUrl}
                    alt={activeModal2Ad.sponsor}
                    referrerPolicy="no-referrer"
                    className="size-10 rounded-xl object-cover border border-border/60 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80";
                    }}
                  />
                ) : (
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary font-bold text-base shrink-0">
                    ★
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.2 font-bold uppercase text-[9px] text-foreground">
                      Partner
                    </span>
                    <span className="font-semibold text-foreground truncate">
                      {activeModal2Ad.sponsor}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">
                    {activeModal2Ad.headline}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() =>
                  openAdExternalUrl(activeModal2Ad.destinationUrl, activeModal2Ad.sponsor)
                }
                className="h-8 shrink-0 rounded-xl bg-primary px-2.5 text-xs font-semibold text-primary-foreground"
              >
                <span>{activeModal2Ad.callToAction || "View"}</span>
                <ExternalLink className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* MAIN BODY: FEATURE ACTIVITY CARDS */}
        <div className="space-y-3 px-5 py-4 sm:px-6">
          {/* 1. FREE SPINS FEATURE (CONTROLLED BY ADMIN SWITCH) */}
          {engagementConfig.freeSpinsActive ? (
            <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-secondary/30 p-3.5 transition-all hover:border-primary/50 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-2xl">
                    🎡
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-foreground">
                        Lucky Spin Wheel
                      </span>
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 uppercase">
                        Free Daily
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Spin for instant BC, 7-Day VIP passes, and Weekly Mega Jackpot tickets.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAction("/sweepstakes", "Lucky Spin Wheel")}
                  className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
                >
                  <span>Spin</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* 2. DYNAMIC QUIZ & SURVEY FEATURE (SWITCHABLE: EXTERNAL PARTNER VS INTERNAL MANUAL TRIVIA) */}
          {engagementConfig.dailyQuizzesActive ? (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-secondary/30 p-3.5 transition-all hover:border-primary/50 hover:bg-secondary/50">
              {/* EXTERNAL PARTNER SURVEY WALL MODE */}
              {isExternalSurveyMode && externalSurvey ? (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-2xl">
                        🌐
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-foreground">
                            {externalSurvey.providerName || "Campus Survey Wall"}
                          </span>
                          <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 uppercase">
                            +{externalSurvey.rewardBc} BC
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          Take a 2-minute partner research survey on campus lifestyle &amp; tech to
                          earn instant coins.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartSurvey}
                      className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-purple-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 active:scale-95"
                    >
                      <span>Earn {externalSurvey.rewardBc} BC</span>
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                    <span>Topic: {externalSurvey.surveyTopicFilter || "Campus Lifestyle"}</span>
                    <span>Guaranteed: +{externalSurvey.screenoutRewardBc || 5} BC</span>
                  </div>
                </div>
              ) : (
                /* INTERNAL MANUAL TRIVIA QUESTION MODE */
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-2xl">
                        🧠
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-foreground">
                            Daily Campus Trivia
                          </span>
                          <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 uppercase">
                            +{engagementConfig.quizRewardBc || 15} BC
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          Answer today&apos;s trivia question to test your wits and win coins.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={activeQuiz ? "secondary" : "default"}
                      onClick={() => setActiveQuiz((prev) => !prev)}
                      className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold shadow-sm active:scale-95"
                    >
                      <span>{activeQuiz ? "Hide" : "Play"}</span>
                      <ChevronRight
                        className={`size-3.5 transition-transform ${activeQuiz ? "rotate-90" : ""}`}
                      />
                    </Button>
                  </div>

                  {/* EXPANDABLE MINI QUIZ ACCORDION */}
                  {activeQuiz ? (
                    <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-left">
                      <p className="text-xs font-semibold text-foreground">
                        Today&apos;s Question: {engagementConfig.quizQuestion}
                      </p>

                      <div className="mt-2 space-y-1.5">
                        {engagementConfig.quizOptions.map((option, idx) => {
                          const isSelected = selectedOption === idx;
                          const isCorrect = idx === engagementConfig.quizCorrectIndex;
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={quizAnswered}
                              onClick={() => setSelectedOption(idx)}
                              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${
                                isSelected
                                  ? quizAnswered
                                    ? isCorrect
                                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                                      : "border-red-500 bg-red-500/20 text-red-300"
                                    : "border-primary bg-primary/20 text-foreground font-semibold"
                                  : quizAnswered && isCorrect
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span>{option}</span>
                              {quizAnswered && isCorrect ? (
                                <CheckCircle2 className="size-3.5 text-emerald-400" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {!quizAnswered ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={selectedOption === null}
                          onClick={handleQuizSubmit}
                          className="mt-2.5 h-8 w-full rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700"
                        >
                          Submit Answer (+{engagementConfig.quizRewardBc || 15} BC)
                        </Button>
                      ) : (
                        <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                          {isQuizCorrect
                            ? "🎉 Reward claimed! Check your wallet."
                            : "Better luck next time!"}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {/* 3. HOT SEAT ACTIVITY (CONTROLLED BY ADMIN SWITCH) */}
          {engagementConfig.hotSeatActive ? (
            <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-secondary/30 p-3.5 transition-all hover:border-orange-500/50 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-500/20 text-2xl">
                    🔥
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-foreground">
                        The Hot Seat
                      </span>
                      <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-500 uppercase">
                        Live
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Sit on the fire chair, answer burning questions, or grill friends anonymously.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("/hot-seat", "The Hot Seat")}
                  className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold shadow-sm transition-colors hover:border-orange-500/50 active:scale-95"
                >
                  <span>Enter</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* 4. CRUSH SWIPES (CONTROLLED BY ADMIN SWITCH) */}
          {engagementConfig.crushSwipesActive ? (
            <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-secondary/30 p-3.5 transition-all hover:border-pink-500/50 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-pink-500/20 text-2xl">
                    💘
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-foreground">
                        WCW &amp; MCM Swipes
                      </span>
                      <span className="rounded bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-bold text-pink-500 uppercase">
                        Vote
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Swipe through the week&apos;s campus crushes and cast your vote in 1 click.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("/crush", "Crush Swiping")}
                  className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold shadow-sm transition-colors hover:border-pink-500/50 active:scale-95"
                >
                  <span>Swipe</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* BOTTOM ACTION */}
        <div className="border-t border-border/60 bg-muted/20 p-4 text-center">
          <Button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-98"
          >
            Continue to App
          </Button>
        </div>
      </DialogContent>

      {/* IN-APP IFRAME / OVERLAY SURVEY WALL SIMULATOR */}
      {activeSurveyOverlay && externalSurvey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setActiveSurveyOverlay(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              <Globe className="size-5 text-purple-400" />
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {externalSurvey.providerName}
                </h3>
                <p className="text-xs text-muted-foreground">Partner Survey Task Gateway</p>
              </div>
            </div>

            {surveyStep === "intro" ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-foreground">Survey Instructions:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Topic: {externalSurvey.surveyTopicFilter || "Campus Student Lifestyle"}</li>
                    <li>Estimated Duration: 1-2 Minutes</li>
                    <li>Reward: +{externalSurvey.rewardBc} BC instant wallet payout</li>
                  </ul>
                </div>

                <Button
                  type="button"
                  onClick={() => setSurveyStep("questions")}
                  className="w-full h-10 rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <Play className="mr-1.5 size-3.5" /> Start 2-Minute Survey
                </Button>
              </div>
            ) : null}

            {surveyStep === "questions" ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question 1 of 2</span>
                  <span className="text-purple-400 font-semibold">TapResearch</span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Which campus activity or app do you use most for meeting other university
                  students?
                </p>

                <div className="space-y-1.5">
                  {[
                    "Circle Panda Campus Socials",
                    "Department WhatsApp Study Groups",
                    "Campus Student Union Events",
                    "Sports & Gaming Tournaments",
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={handleCompleteSurvey}
                      className="w-full text-left rounded-xl border border-border/70 bg-secondary/20 p-2.5 text-xs hover:border-purple-500 hover:bg-purple-500/10 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {surveyStep === "done" ? (
              <div className="py-4 text-center space-y-3">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-500 text-2xl font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-display text-base font-bold text-foreground">
                    Survey Completed!
                  </p>
                  <p className="text-xs text-emerald-500 font-bold">
                    +{externalSurvey.rewardBc} BC credited to your Circle Panda wallet.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setActiveSurveyOverlay(false)}
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground"
                >
                  Awesome, Close Window
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
