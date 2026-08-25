"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useSessionProfileColor } from "@/lib/profile-color";

type NavItem = {
  href: string;
  label: string;
};

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { color, preset } = useSessionProfileColor();

  const items: NavItem[] = useMemo(
    () => [
      { href: "/", label: "Escanear Cupom" },
      { href: "/notasfiscais", label: "Notas Fiscais" },
      { href: "/financeiro", label: "Financeiro" },
    ],
    []
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const secondaryColor = preset ? preset.secondaryHex : color;

  return (
    <nav
      className="text-white shadow-lg transition-all duration-300 relative z-40 border-b border-white/10"
      style={{
        background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 p-2 hover:bg-white/20 transition-colors md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-base font-bold tracking-wide text-white drop-shadow-sm group-hover:opacity-90 transition-opacity">
              De Olho na Nota
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-white/20 text-white font-semibold shadow-inner border border-white/30 backdrop-blur-sm"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <ProfileMenu />
      </div>

      {open ? (
        <div className="md:hidden border-t border-white/15 bg-black/10 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col gap-1.5">
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/20 text-white font-semibold border border-white/20"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
