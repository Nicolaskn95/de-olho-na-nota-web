"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Palette, Settings, User } from "lucide-react";
import { clearSession, getAuthUser } from "@/lib/auth-api";
import { UserAvatar } from "@/components/UserAvatar";
import { useSessionProfileColor } from "@/lib/profile-color";

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = getAuthUser();
  const username = user?.username ?? "Usuário";
  const { color, preset } = useSessionProfileColor();

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
        className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 p-1 hover:bg-white/20 transition-all transform hover:scale-105 active:scale-95"
      >
        <UserAvatar username={username} size="sm" showGlow />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 min-w-[240px] w-72 rounded-2xl border border-white/30 bg-green-950/85 px-0 py-0 backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3.5 border-b border-white/15 bg-white/5 flex items-center gap-3">
            <UserAvatar username={username} size="md" showGlow />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/70">
                  Usuário
                </p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                  style={{
                    backgroundColor: `${color}25`,
                    borderColor: `${color}66`,
                    color: color,
                  }}
                >
                  Sessão
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate mt-0.5">
                {username}
              </p>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-white/95 hover:bg-white/15 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-white/70 group-hover:text-white" />
                <span>Meu Perfil</span>
              </div>
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: color }}
                title={`Cor ativa: ${preset ? preset.name : color}`}
              />
            </Link>

            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/95 hover:bg-white/15 transition-colors group"
            >
              <Palette className="h-4 w-4 text-white/70 group-hover:text-white" />
              <span>Cor do Perfil</span>
            </Link>

            <Link
              href="/configuracoes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/95 hover:bg-white/15 transition-colors group"
            >
              <Settings className="h-4 w-4 text-white/70 group-hover:text-white" />
              <span>Configurações</span>
            </Link>

            <div className="my-1 border-t border-white/10" />

            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors group"
            >
              <LogOut className="h-4 w-4 text-red-300 group-hover:text-red-200" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


