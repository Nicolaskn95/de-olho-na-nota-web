"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User, UserCircle2 } from "lucide-react";
import {
  clearSession,
  getAuthUser,
} from "@/lib/auth-api";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = getAuthUser();
  const username = user?.username ?? "Usuário";

  const onLogout = () => {
    clearSession();
    setOpen(false);
    router.replace("/login");
  };

  return (
    <div className="relative z-50">
      <button
        type="button"
        aria-label="Abrir perfil"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 p-2 hover:bg-white/20 transition-colors"
      >
        <UserCircle2 className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 min-w-[220px] w-64 rounded-2xl border border-white/30 bg-green-950/70 px-0 py-0 backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] z-50">
          <div className="px-4 py-3 border-b border-white/15">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">
              Dados do usuário
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{username}</p>
          </div>

          <div className="p-2">
            <Link
              href="/configuracoes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/95 hover:bg-white/15 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>

            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/95 hover:bg-white/15 transition-colors"
            >
              <User className="h-4 w-4" />
              Perfil
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/95 hover:bg-white/15 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

