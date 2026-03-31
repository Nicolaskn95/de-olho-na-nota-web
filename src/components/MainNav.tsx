"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { ProfileMenu } from "@/components/ProfileMenu";

type NavItem = {
  href: string;
  label: string;
};

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = useMemo(
    () => [
      { href: "/", label: "Escanear Cupom" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/financeiro", label: "Financeiro" },
    ],
    [],
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <nav className="bg-green-800 text-white">
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

          <span className="text-sm font-semibold tracking-wide">
            De Olho na Nota
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "hover:text-green-200 transition-colors",
                isActive(item.href) ? "text-green-100 font-semibold" : "",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <ProfileMenu />
      </div>

      {open ? (
        <div className="md:hidden border-t border-white/15">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors",
                    isActive(item.href) ? "bg-white/10" : "",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

