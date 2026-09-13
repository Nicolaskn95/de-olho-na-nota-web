"use client";

import React from "react";
import { useSessionProfileColor } from "@/lib/profile-color";
import { usePageBackground } from "@/lib/page-background";

export function SessionThemeProvider({ children }: { children: React.ReactNode }) {
  useSessionProfileColor();
  const { currentPattern } = usePageBackground();

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={currentPattern.style}
    >
      {children}
    </div>
  );
}
