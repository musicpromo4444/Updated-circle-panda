interface SweepstakeNavIconProps {
  className?: string;
  isActive?: boolean;
  theme?: "gold-orange" | "blue-purple";
}

export function SweepstakeNavIcon({
  className = "",
  isActive = false,
  theme = "gold-orange",
}: SweepstakeNavIconProps) {
  const isGold = theme === "gold-orange";

  return (
    <div
      className={`relative flex items-center justify-center select-none transition-transform duration-300 ${
        isActive ? "scale-110" : "group-hover:scale-105"
      } ${className}`}
    >
      {/* Outer subtle glowing halo aura */}
      <div
        className={`absolute inset-[-4px] rounded-full blur-md transition-opacity duration-500 pointer-events-none ${
          isGold
            ? "bg-gradient-to-tr from-amber-500/40 via-orange-500/50 to-red-500/40"
            : "bg-gradient-to-tr from-blue-500/40 via-indigo-500/50 to-purple-500/40"
        } ${isActive ? "opacity-100 animate-pulse" : "opacity-70 group-hover:opacity-100"}`}
      />

      {/* SVG Gift Box with Radiant Gradient & Ribbon Detail */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative size-6.5 sm:size-7 drop-shadow-[0_2px_8px_rgba(245,158,11,0.65)] ${
          isActive ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.9)]" : ""
        }`}
      >
        <defs>
          {/* Main Gift Box Body Gradient */}
          <linearGradient id="sweepBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            {isGold ? (
              <>
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="45%" stopColor="#F59E0B" />
                <stop offset="85%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#C2410C" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="50%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#A855F7" />
              </>
            )}
          </linearGradient>

          {/* Gift Box Lid Gradient */}
          <linearGradient id="sweepLidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            {isGold ? (
              <>
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="60%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#C084FC" />
              </>
            )}
          </linearGradient>

          {/* Ribbon Accent Gradient */}
          <linearGradient id="sweepRibbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            {isGold ? (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#FEF3C7" />
                <stop offset="100%" stopColor="#FDE68A" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E0E7FF" />
              </>
            )}
          </linearGradient>

          {/* Glowing Shadow filter */}
          <filter id="giftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="1.5"
              floodColor={isGold ? "#F97316" : "#8B5CF6"}
              floodOpacity="0.8"
            />
          </filter>
        </defs>

        {/* Gift Box Bottom Body */}
        <rect
          x="5"
          y="13"
          width="22"
          height="14"
          rx="2.5"
          fill="url(#sweepBoxGrad)"
          filter="url(#giftGlow)"
        />

        {/* Gift Box Lid */}
        <rect
          x="3.5"
          y="9"
          width="25"
          height="5.5"
          rx="2"
          fill="url(#sweepLidGrad)"
          stroke={isGold ? "#FFFBEB" : "#F5F3FF"}
          strokeWidth="0.75"
        />

        {/* Vertical Ribbon Center Stripe */}
        <rect x="13.75" y="9" width="4.5" height="18" rx="1" fill="url(#sweepRibbonGrad)" />

        {/* Horizontal Ribbon on Box Body */}
        <rect
          x="5"
          y="18.5"
          width="22"
          height="3"
          fill="url(#sweepRibbonGrad)"
          fillOpacity="0.85"
        />

        {/* Ribbon Bow Left Loop */}
        <path
          d="M16 9.5 C14 5, 8.5 4, 8.5 7.5 C8.5 10, 14 9.5, 16 9.5 Z"
          fill="url(#sweepRibbonGrad)"
          stroke={isGold ? "#F59E0B" : "#6366F1"}
          strokeWidth="0.6"
        />

        {/* Ribbon Bow Right Loop */}
        <path
          d="M16 9.5 C18 5, 23.5 4, 23.5 7.5 C23.5 10, 18 9.5, 16 9.5 Z"
          fill="url(#sweepRibbonGrad)"
          stroke={isGold ? "#F59E0B" : "#6366F1"}
          strokeWidth="0.6"
        />

        {/* Center Ribbon Knot Sparkle */}
        <circle cx="16" cy="9.5" r="2" fill="#FFFFFF" />
        <circle
          cx="16"
          cy="9.5"
          r="1"
          fill={isGold ? "#EA580C" : "#7C3AED"}
          className="animate-ping duration-1000"
        />
      </svg>
    </div>
  );
}
