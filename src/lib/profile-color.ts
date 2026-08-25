"use client";

import { useEffect, useState } from "react";

export type ProfileColorPreset = {
  id: string;
  name: string;
  hex: string;
  secondaryHex: string;
  bgGradient: string;
  badgeStyle: string;
  glowColor: string;
};

export const COLOR_PRESETS: ProfileColorPreset[] = [
  {
    id: "emerald",
    name: "Verde Esmeralda",
    hex: "#10b981",
    secondaryHex: "#047857",
    bgGradient: "from-emerald-500 to-green-700",
    badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    glowColor: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: "purple",
    name: "Roxo Elétrico",
    hex: "#8b5cf6",
    secondaryHex: "#6d28d9",
    bgGradient: "from-purple-500 to-indigo-700",
    badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    glowColor: "rgba(139, 92, 246, 0.4)",
  },
  {
    id: "blue",
    name: "Azul Oceano",
    hex: "#3b82f6",
    secondaryHex: "#1d4ed8",
    bgGradient: "from-blue-500 to-cyan-700",
    badgeStyle: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    glowColor: "rgba(59, 130, 246, 0.4)",
  },
  {
    id: "amber",
    name: "Âmbar Pôr do Sol",
    hex: "#f59e0b",
    secondaryHex: "#b45309",
    bgGradient: "from-amber-500 to-orange-700",
    badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    glowColor: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "rose",
    name: "Carmim Rose",
    hex: "#f43f5e",
    secondaryHex: "#be123c",
    bgGradient: "from-rose-500 to-red-700",
    badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    glowColor: "rgba(244, 63, 94, 0.4)",
  },
  {
    id: "pink",
    name: "Rosa Neon",
    hex: "#ec4899",
    secondaryHex: "#be185d",
    bgGradient: "from-pink-500 to-purple-600",
    badgeStyle: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    glowColor: "rgba(236, 72, 153, 0.4)",
  },
  {
    id: "teal",
    name: "Ciano Teal",
    hex: "#14b8a6",
    secondaryHex: "#0f766e",
    bgGradient: "from-teal-400 to-cyan-700",
    badgeStyle: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    glowColor: "rgba(20, 184, 166, 0.4)",
  },
  {
    id: "dark",
    name: "Grafite Noturno",
    hex: "#4b5563",
    secondaryHex: "#111827",
    bgGradient: "from-gray-600 to-gray-900",
    badgeStyle: "bg-gray-500/20 text-gray-300 border-gray-500/40",
    glowColor: "rgba(75, 85, 99, 0.4)",
  },
];

export const DEFAULT_PROFILE_COLOR = COLOR_PRESETS[0];
const STORAGE_KEY = "session_profile_color";
const EVENT_NAME = "session-profile-color-changed";

export function getSessionProfileColor(): string {
  if (typeof window === "undefined") return DEFAULT_PROFILE_COLOR.hex;
  try {
    const saved =
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PROFILE_COLOR.hex;
}

export function setSessionProfileColor(hexColor: string): void {
  if (typeof window === "undefined") return;
  const cleanColor = hexColor.trim();
  try {
    sessionStorage.setItem(STORAGE_KEY, cleanColor);
    localStorage.setItem(STORAGE_KEY, cleanColor);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { color: cleanColor } })
  );
}

export function resetSessionProfileColor(): void {
  setSessionProfileColor(DEFAULT_PROFILE_COLOR.hex);
}

export function findPresetByHex(hex: string): ProfileColorPreset | null {
  const normalized = hex.toLowerCase();
  return (
    COLOR_PRESETS.find(
      (p) => p.hex.toLowerCase() === normalized
    ) || null
  );
}

export function useSessionProfileColor(): {
  color: string;
  setColor: (color: string) => void;
  resetColor: () => void;
  preset: ProfileColorPreset | null;
} {
  const [color, setColorState] = useState<string>(DEFAULT_PROFILE_COLOR.hex);

  useEffect(() => {
    setColorState(getSessionProfileColor());

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ color: string }>;
      if (customEvent.detail?.color) {
        setColorState(customEvent.detail.color);
      } else {
        setColorState(getSessionProfileColor());
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setColorState(e.newValue || DEFAULT_PROFILE_COLOR.hex);
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const setColor = (newColor: string) => {
    setSessionProfileColor(newColor);
    setColorState(newColor);
  };

  const resetColor = () => {
    resetSessionProfileColor();
    setColorState(DEFAULT_PROFILE_COLOR.hex);
  };

  const preset = findPresetByHex(color);

  return {
    color,
    setColor,
    resetColor,
    preset,
  };
}
