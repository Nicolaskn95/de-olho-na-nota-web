"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  QrCode,
  Receipt,
  Package,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { useSessionProfileColor } from "@/lib/profile-color";

type BottomNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

export function BottomNav() {
  const pathname = usePathname();
  const { color, preset } = useSessionProfileColor();

  const primaryColor = color || "#047857";
  const secondaryColor = preset ? preset.secondaryHex : primaryColor;

  const items: BottomNavItem[] = useMemo(
    () => [
      { href: "/", label: "Escanear", icon: QrCode },
      { href: "/notasfiscais", label: "Notas", icon: Receipt },
      { href: "/produtos", label: "Produtos", icon: Package },
      { href: "/financeiro", label: "Financeiro", icon: TrendingUp },
      { href: "/lista-compras", label: "Lista", icon: ClipboardList },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <nav
      aria-label="Navegação inferior"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] select-none transition-colors"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))",
      }}
    >
      <div className="max-w-lg mx-auto px-2 pt-1.5 flex items-center justify-around">
        {items.map((item) => {
          const active = isActive(item.href);
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 group active:scale-95 ${
                active
                  ? "font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
              }`}
            >
              {/* Active top line / pill indicator */}
              {active && (
                <span
                  className="absolute -top-1.5 w-8 h-1 rounded-full transition-all duration-300"
                  style={{
                    background: `linear-gradient(90deg, ${secondaryColor}, ${primaryColor})`,
                    boxShadow: `0 2px 8px ${primaryColor}66`,
                  }}
                />
              )}

              {/* Icon container with subtle active background */}
              <div
                className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
                  active ? "scale-105" : "group-hover:scale-105"
                }`}
                style={
                  active
                    ? {
                        backgroundColor: `${primaryColor}18`,
                      }
                    : undefined
                }
              >
                <IconComponent
                  className="w-5 h-5 transition-transform duration-200"
                  style={active ? { color: primaryColor } : undefined}
                />
              </div>

              {/* Label */}
              <span
                className="text-[11px] tracking-tight mt-0.5 leading-tight transition-colors duration-200"
                style={active ? { color: primaryColor } : undefined}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
