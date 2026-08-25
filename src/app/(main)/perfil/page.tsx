"use client";

import { useEffect, useState } from "react";
import { getAccessToken, getAuthHeaders, getAuthUser } from "@/lib/auth-api";
import { UserAvatar } from "@/components/UserAvatar";
import {
  COLOR_PRESETS,
  DEFAULT_PROFILE_COLOR,
  useSessionProfileColor,
} from "@/lib/profile-color";
import { Check, Palette, RotateCcw, Sparkles } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function readErrorMessage(res: Response): Promise<string> {
  return res
    .json()
    .then((body) => {
      if (body?.message)
        return Array.isArray(body.message)
          ? body.message.join(", ")
          : String(body.message);
      return res.statusText || "Erro na requisição";
    })
    .catch(() => res.statusText || "Erro na requisição");
}

export default function PerfilPage() {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Hook da Cor de Perfil da Sessão
  const { color, setColor, resetColor, preset } = useSessionProfileColor();
  const [customHex, setCustomHex] = useState(color);
  const [colorFeedback, setColorFeedback] = useState<string | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    setUsername(user?.username ?? "");
  }, []);

  useEffect(() => {
    setCustomHex(color);
  }, [color]);

  const handleSelectPreset = (hex: string, name: string) => {
    setColor(hex);
    setColorFeedback(`Cor do perfil alterada para "${name}" nesta sessão!`);
    setTimeout(() => setColorFeedback(null), 4000);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setCustomHex(newHex);
    setColor(newHex);
    setColorFeedback("Cor personalizada aplicada para esta sessão!");
    setTimeout(() => setColorFeedback(null), 4000);
  };

  const handleResetColor = () => {
    resetColor();
    setColorFeedback("Cor padrão da sessão restaurada.");
    setTimeout(() => setColorFeedback(null), 4000);
  };

  const onSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError("Informe um nome de usuário.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Faça login novamente.");
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const data = (await res.json()) as { id: string; username: string };

      // Atualiza o usuário no storage para refletir no dropdown.
      try {
        const raw =
          localStorage.getItem("auth_user") ??
          sessionStorage.getItem("auth_user");
        const parsed = raw
          ? (JSON.parse(raw) as { id?: string; username?: string })
          : null;
        const next = {
          id: data.id ?? parsed?.id ?? "",
          username: data.username,
        };
        localStorage.setItem("auth_user", JSON.stringify(next));
        sessionStorage.setItem("auth_user", JSON.stringify(next));
      } catch {
        /* ignore */
      }

      setUsername(data.username);
      setSuccess("Nome atualizado com sucesso.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao atualizar nome."
      );
    } finally {
      setSavingName(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("As senhas novas não coincidem.");
      return;
    }
    if (!currentPassword) {
      setError("Informe sua senha atual.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Faça login novamente.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccess("Senha alterada com sucesso.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao alterar a senha."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className="min-h-screen py-6 sm:py-10 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Perfil do Usuário
          </h1>
          <p className="text-gray-600">
            Gerencie suas credenciais e personalize a cor do seu perfil para a sessão
          </p>
        </header>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center shadow-sm">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-center shadow-sm">
            {success}
          </div>
        ) : null}

        {/* Hero Preview Card do Perfil */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-green-950 p-6 sm:p-8 text-white shadow-xl border border-white/10">
          <div className="flex flex-col sm:flex-row items-center gap-6 z-10 relative">
            <UserAvatar username={username} size="xl" showGlow />
            <div className="text-center sm:text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/20">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: color }}
                />
                Sessão Ativa
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {username || "Usuário"}
              </h2>
              <p className="text-sm text-gray-300 flex items-center justify-center sm:justify-start gap-2">
                <span>Cor da Sessão:</span>
                <span className="font-semibold text-white">
                  {preset ? preset.name : color.toUpperCase()}
                </span>
                <span
                  className="inline-block w-4 h-4 rounded-full border border-white/50 shadow-sm"
                  style={{ backgroundColor: color }}
                />
              </p>
            </div>
          </div>
          {/* Subtle background glow */}
          <div
            className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ backgroundColor: color }}
          />
        </section>

        {/* Seção da Cor do Perfil da Sessão */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-green-700" />
                <h2 className="text-xl font-bold text-gray-800">
                  Cor de Perfil da Sessão
                </h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Escolha a cor de fundo do seu avatar e destaques do perfil para a sua sessão atual
              </p>
            </div>

            {color !== DEFAULT_PROFILE_COLOR.hex && (
              <button
                type="button"
                onClick={handleResetColor}
                className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-green-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar padrão
              </button>
            )}
          </div>

          {colorFeedback && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl animate-in fade-in duration-200">
              <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{colorFeedback}</span>
            </div>
          )}

          {/* Grid de Paleta Predefinida */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Paleta de Cores
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COLOR_PRESETS.map((p) => {
                const isSelected =
                  color.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.hex, p.name)}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? "border-green-600 bg-green-50/50 shadow-md ring-2 ring-green-600/30 scale-[1.02]"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 border border-black/10 shadow-sm flex items-center justify-center text-white"
                      style={{
                        background: `linear-gradient(135deg, ${p.hex}, ${p.secondaryHex})`,
                      }}
                    >
                      {isSelected && <Check className="h-4 w-4 drop-shadow" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {p.hex}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Cor Personalizada HEX */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Cor Personalizada (HEX)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Escolha qualquer cor personalizada utilizando o seletor
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={customHex.startsWith("#") ? customHex : "#10b981"}
                  onChange={handleCustomHexChange}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-gray-300 p-0.5 bg-white shadow-sm"
                  title="Abrir seletor de cor"
                />
              </div>

              <input
                type="text"
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    setColor(e.target.value);
                  }
                }}
                placeholder="#10B981"
                className="w-32 p-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
              />
            </div>
          </div>
        </section>

        {/* Formulário de Nome de Usuário */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-gray-800">
            Nome de usuário
          </h2>
          <form onSubmit={onSaveUsername} className="flex flex-col sm:flex-row gap-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 text-sm"
              placeholder="Seu usuário"
              autoComplete="username"
            />
            <button
              type="submit"
              disabled={savingName}
              className="px-6 py-3 bg-green-800 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-sm"
            >
              {savingName ? "Salvando..." : "Salvar nome"}
            </button>
          </form>
        </section>

        {/* Formulário de Troca de Senha */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-gray-800">
            Trocar senha
          </h2>
          <form onSubmit={onChangePassword} className="flex flex-col gap-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 text-sm"
              placeholder="Senha atual"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 text-sm"
              placeholder="Nova senha"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 text-sm"
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-3 bg-green-800 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-sm self-start"
            >
              {changingPassword ? "Atualizando..." : "Atualizar senha"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}


