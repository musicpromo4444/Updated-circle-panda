import React from "react";
import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "header" | "pill" | "segment";
  className?: string;
}

export function ThemeToggle({ variant = "header", className }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();

  if (variant === "segment") {
    return (
      <div
        id="theme-toggle-segment"
        className={cn(
          "grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-secondary/70 p-1.5 text-xs font-semibold backdrop-blur-md",
          className,
        )}
      >
        <button
          type="button"
          id="theme-opt-dark"
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 px-3 transition-all cursor-pointer select-none",
            isDark
              ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          )}
        >
          <Moon className="size-4 text-emerald-400" />
          <span>Dark Aesthetic</span>
        </button>

        <button
          type="button"
          id="theme-opt-light"
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 px-3 transition-all cursor-pointer select-none",
            !isDark
              ? "bg-card text-foreground shadow-sm font-bold border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          )}
        >
          <Sun className="size-4 text-amber-500" />
          <span>High-Contrast Light</span>
        </button>
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        id="theme-toggle-pill"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to High-Contrast Light mode" : "Switch to Dark mode"}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border bg-secondary/80 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-secondary active:scale-95 cursor-pointer backdrop-blur-md shadow-xs",
          className,
        )}
      >
        {isDark ? (
          <>
            <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45 duration-300" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="size-4 text-emerald-500 transition-transform hover:-rotate-12 duration-300" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  // Header icon button (matches the size-9 round header icons)
  return (
    <button
      type="button"
      id="global-theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to High-Contrast Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to High-Contrast Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-sm transition-all duration-200 hover:border-primary/60 hover:bg-secondary/90 active:scale-95 cursor-pointer shadow-xs",
        isDark
          ? "text-muted-foreground hover:text-amber-400"
          : "text-amber-600 hover:text-amber-500 bg-amber-50/50 border-amber-500/25",
        className,
      )}
    >
      <span className="sr-only">
        {isDark ? "Switch to High-Contrast Light Mode" : "Switch to Dark Mode"}
      </span>

      {isDark ? (
        <Sun className="size-4.5 text-amber-300 transition-all duration-300 hover:rotate-90 hover:scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
      ) : (
        <Moon className="size-4.5 text-indigo-700 transition-all duration-300 hover:-rotate-12 hover:scale-110 drop-shadow-[0_0_6px_rgba(79,70,229,0.3)]" />
      )}
    </button>
  );
}
