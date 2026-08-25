"use client";

import { useSessionProfileColor, findPresetByHex } from "@/lib/profile-color";
import { User } from "lucide-react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  username?: string;
  size?: AvatarSize;
  showGlow?: boolean;
  overrideColor?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { box: string; font: string; icon: string }> = {
  xs: { box: "w-6 h-6", font: "text-xs", icon: "h-3 w-3" },
  sm: { box: "w-8 h-8", font: "text-sm", icon: "h-4 w-4" },
  md: { box: "w-10 h-10", font: "text-base", icon: "h-5 w-5" },
  lg: { box: "w-14 h-14", font: "text-xl", icon: "h-7 w-7" },
  xl: { box: "w-20 h-20", font: "text-3xl", icon: "h-10 w-10" },
};

function getSecondaryColor(hex: string): string {
  // Simple darkening of hex for custom gradient secondary color
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - 40);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
  const b = Math.max(0, (num & 0x0000ff) - 40);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function UserAvatar({
  username,
  size = "md",
  showGlow = false,
  overrideColor,
  className = "",
}: UserAvatarProps) {
  const { color: sessionColor } = useSessionProfileColor();
  const activeColor = overrideColor || sessionColor;
  const preset = findPresetByHex(activeColor);

  const initial = username?.trim() ? username.trim()[0].toUpperCase() : null;
  const { box, font, icon } = sizeClasses[size];

  const secondaryColor = preset ? preset.secondaryHex : getSecondaryColor(activeColor);
  const glowStyle = showGlow
    ? { boxShadow: `0 0 20px ${preset ? preset.glowColor : activeColor + "66"}` }
    : {};

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-bold text-white shadow-md transition-all duration-300 select-none ${box} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${activeColor}, ${secondaryColor})`,
        ...glowStyle,
      }}
      title={`Perfil: ${username || "Usuário"}`}
    >
      {initial ? (
        <span className={`${font} drop-shadow-sm font-semibold`}>{initial}</span>
      ) : (
        <User className={`${icon} drop-shadow-sm`} />
      )}
    </div>
  );
}
