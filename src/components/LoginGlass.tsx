"use client";

import {
  ArrowLeftRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageCircle,
  Send,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  loginRequest,
  persistSession,
  registerRequest,
} from "@/lib/auth-api";

type Mode = "login" | "register";

function SocialCircle({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/15 text-white/90 shadow-inner transition hover:bg-white/25"
    >
      {children}
    </button>
  );
}

export function LoginGlass() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  };

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginRequest(username.trim(), password, remember);
      persistSession(data, remember);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await registerRequest(username.trim(), password);
      const data = await loginRequest(username.trim(), password, remember);
      persistSession(data, remember);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#e8e4f5] text-slate-900">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-fuchsia-400/55 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-4rem] top-10 h-80 w-80 rounded-full bg-violet-500/45 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-orange-300/50 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-3rem] right-1/4 h-72 w-72 rounded-full bg-teal-400/40 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div
          className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[40px] border border-white/30 bg-white/20 shadow-[0_25px_80px_-20px_rgba(79,70,229,0.35)] backdrop-blur-[20px] backdrop-saturate-[180%] md:flex-row md:min-h-[420px]"
          style={{ WebkitBackdropFilter: "blur(20px) saturate(180%)" }}
        >
          <div className="absolute left-1/2 top-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-violet-600 shadow-lg md:flex">
            <button
              type="button"
              onClick={toggleMode}
              className="flex h-full w-full items-center justify-center rounded-full transition hover:bg-white"
              aria-label="Alternar entre login e cadastro"
            >
              <ArrowLeftRight className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <section
            className={`relative flex flex-1 flex-col justify-between gap-8 px-8 py-10 md:px-10 ${
              isLogin
                ? "bg-gradient-to-b from-violet-100/55 to-orange-100/45"
                : "bg-gradient-to-b from-orange-100/45 to-violet-100/55 order-2 md:order-1"
            }`}
          >
            <div className="space-y-2">
              <p className="text-xs font-light uppercase tracking-[0.25em] text-slate-600/90">
                {isLogin ? "bem vindo" : "olá de novo"}
              </p>
              <h2 className="text-2xl font-semibold text-[#0f2744]">
                {isLogin ? (
                  <>
                    Novo login
                    <span className="mt-1 block h-0.5 w-12 rounded-full bg-[#0f2744]/35" />
                  </>
                ) : (
                  <>
                    Já tem conta?
                    <span className="mt-1 block h-0.5 w-12 rounded-full bg-[#0f2744]/35" />
                  </>
                )}
              </h2>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setMode(isLogin ? "register" : "login")}
                className="rounded-full border border-white/40 bg-orange-200/50 px-8 py-2.5 text-sm font-medium text-[#7a3d12] shadow-sm transition hover:bg-orange-200/70"
              >
                {isLogin ? "Criar conta" : "Fazer login"}
              </button>
            </div>
            <div className="flex gap-3">
              <SocialCircle label="E-mail">
                <Mail className="h-4 w-4" />
              </SocialCircle>
              <SocialCircle label="Telegram">
                <Send className="h-4 w-4" />
              </SocialCircle>
              <SocialCircle label="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </SocialCircle>
            </div>
          </section>

          <section
            className={`relative flex flex-1 flex-col justify-center gap-6 px-8 py-10 md:px-12 ${
              isLogin
                ? "bg-indigo-500/25"
                : "bg-indigo-500/25 order-1 md:order-2"
            }`}
          >
            <div className="flex justify-end md:absolute md:right-8 md:top-8">
              <span className="rounded-full bg-pink-200/50 px-4 py-1 text-xs font-medium text-pink-950/80 backdrop-blur-sm">
                {isLogin ? "Logar" : "Cadastrar"}
              </span>
            </div>

            {isLogin ? (
              <form onSubmit={onLogin} className="mt-6 flex flex-col gap-5 md:mt-0">
                <p className="text-xs font-light uppercase tracking-[0.25em] text-white/85">
                  faça login
                </p>
                <label className="relative block">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-900/50"
                    aria-hidden
                  />
                  <input
                    className="w-full rounded-full border border-white/50 bg-white/35 py-3 pl-11 pr-4 text-xs font-semibold uppercase tracking-wide text-indigo-950 shadow-inner outline-none ring-white/30 placeholder:text-indigo-900/35 focus:ring-2"
                    placeholder="usuário"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </label>
                <label className="relative block">
                  <Lock
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-900/50"
                    aria-hidden
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-full border border-white/50 bg-white/35 py-3 pl-11 pr-12 text-xs font-semibold uppercase tracking-wide text-indigo-950 shadow-inner outline-none ring-white/30 placeholder:text-indigo-900/35 focus:ring-2"
                    placeholder="senha"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-indigo-900/55 hover:bg-white/20 hover:text-indigo-950"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </label>
                <div className="flex items-center justify-between gap-4 text-xs text-white/90">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-white/60 bg-white/30 text-indigo-700 focus:ring-indigo-300"
                    />
                    Lembrar
                  </label>
                  <button
                    type="button"
                    className="underline decoration-white/60 underline-offset-2 hover:text-white"
                  >
                    Esqueceu senha?
                  </button>
                </div>
                {error ? (
                  <p className="text-center text-xs font-medium text-red-100" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#0f2744] py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#162f52] disabled:opacity-60"
                >
                  {loading ? "Entrando…" : "Entrar"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={onRegister}
                className="mt-6 flex flex-col gap-5 md:mt-0"
              >
                <p className="text-xs font-light uppercase tracking-[0.25em] text-white/85">
                  criar conta
                </p>
                <label className="relative block">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-900/50"
                    aria-hidden
                  />
                  <input
                    className="w-full rounded-full border border-white/50 bg-white/35 py-3 pl-11 pr-4 text-xs font-semibold uppercase tracking-wide text-indigo-950 shadow-inner outline-none ring-white/30 placeholder:text-indigo-900/35 focus:ring-2"
                    placeholder="usuário"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                  />
                </label>
                <label className="relative block">
                  <Lock
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-900/50"
                    aria-hidden
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-full border border-white/50 bg-white/35 py-3 pl-11 pr-12 text-xs font-semibold uppercase tracking-wide text-indigo-950 shadow-inner outline-none ring-white/30 placeholder:text-indigo-900/35 focus:ring-2"
                    placeholder="senha"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-indigo-900/55 hover:bg-white/20 hover:text-indigo-950"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </label>
                <label className="relative block">
                  <Lock
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-900/50"
                    aria-hidden
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-full border border-white/50 bg-white/35 py-3 pl-11 pr-4 text-xs font-semibold uppercase tracking-wide text-indigo-950 shadow-inner outline-none ring-white/30 placeholder:text-indigo-900/35 focus:ring-2"
                    placeholder="confirmar senha"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </label>
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-white/60 bg-white/30 text-indigo-700 focus:ring-indigo-300"
                    />
                    Lembrar após cadastro
                  </label>
                </div>
                {error ? (
                  <p className="text-center text-xs font-medium text-red-100" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#0f2744] py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#162f52] disabled:opacity-60"
                >
                  {loading ? "Criando…" : "Criar e entrar"}
                </button>
              </form>
            )}

            <div className="mt-2 flex justify-center gap-3">
              <SocialCircle label="Facebook">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </SocialCircle>
              <SocialCircle label="TikTok">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </SocialCircle>
              <SocialCircle label="Instagram">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </SocialCircle>
              <SocialCircle label="Twitter / X">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialCircle>
            </div>

            <p className="text-center text-[11px] text-white/70 md:pb-0">
              <Link href="/" className="underline underline-offset-2 hover:text-white">
                Voltar ao app
              </Link>
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-6 flex items-center justify-center gap-2 rounded-full border border-slate-400/30 bg-white/40 px-4 py-2 text-xs font-medium text-slate-800 backdrop-blur md:hidden"
          aria-label="Alternar entre login e cadastro"
        >
          <ArrowLeftRight className="h-4 w-4" />
          {isLogin ? "Ir para cadastro" : "Ir para login"}
        </button>
      </div>
    </div>
  );
}
