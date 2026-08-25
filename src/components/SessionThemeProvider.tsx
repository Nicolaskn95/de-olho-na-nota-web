"use client";

import React from "react";
import { useSessionProfileColor } from "@/lib/profile-color";

export function SessionThemeProvider({ children }: { children: React.ReactNode }) {
  useSessionProfileColor();
  return <>{children}</>;
}
