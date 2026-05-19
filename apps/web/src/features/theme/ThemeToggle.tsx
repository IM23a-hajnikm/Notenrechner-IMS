"use client";

import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "notenrechner-theme";
const PREFERENCES: ThemePreference[] = ["system", "light", "dark"];
const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Hell",
  dark: "Dunkel",
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>(() => readStoredPreference());

  useEffect(() => {
    applyThemePreference(preference);
  }, [preference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (preference === "system") applyThemePreference("system");
    };

    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, [preference]);

  function cyclePreference() {
    const nextPreference = PREFERENCES[(PREFERENCES.indexOf(preference) + 1) % PREFERENCES.length] ?? "system";
    setPreference(nextPreference);

    if (nextPreference === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextPreference);
    }

    applyThemePreference(nextPreference);
  }

  const label = LABELS[preference];

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={`Theme wechseln, aktuell ${label}`}
      className={`rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-black/30 ${className}`}
      suppressHydrationWarning
    >
      Theme: {label}
    </button>
  );
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyThemePreference(preference: ThemePreference) {
  const resolvedTheme = resolveTheme(preference);
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
