"use client";

import { useEffect, useState } from "react";
import { getAccessToken, getAuthHeaders, getAuthUser } from "@/lib/auth-api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function readErrorMessage(res: Response): Promise<string> {
  return res
    .json()
    .then((body) => {
      if (body?.message) return Array.isArray(body.message) ? body.message.join(", ") : String(body.message);
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

  useEffect(() => {
    const user = getAuthUser();
    setUsername(user?.username ?? "");
  }, []);

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
        const raw = localStorage.getItem("auth_user") ?? sessionStorage.getItem("auth_user");
        const parsed = raw ? (JSON.parse(raw) as { id?: string; username?: string }) : null;
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
      setError(err instanceof Error ? err.message : "Falha ao atualizar nome.");
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
        err instanceof Error ? err.message : "Falha ao alterar a senha.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Perfil</h1>
          <p className="text-gray-600">Atualize seu nome e troque sua senha</p>
        </header>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-center">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-center">
            {success}
          </div>
        ) : null}

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Nome de usuário
          </h2>
          <form onSubmit={onSaveUsername} className="flex flex-col gap-4">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="Seu usuário"
              autoComplete="username"
            />
            <button
              type="submit"
              disabled={savingName}
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingName ? "Salvando..." : "Salvar nome"}
            </button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Trocar senha
          </h2>
          <form onSubmit={onChangePassword} className="flex flex-col gap-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="Senha atual"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="Nova senha"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {changingPassword ? "Atualizando..." : "Atualizar senha"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

