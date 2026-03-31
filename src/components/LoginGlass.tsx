"use client";

import { ArrowLeftRight, Eye, EyeOff, Lock, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginRequest, persistSession, registerRequest } from "@/lib/auth-api";

type Mode = "login" | "register";

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
      router.push("/notasfiscais");
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
      router.push("/notasfiscais");
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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-start justify-center px-4 py-4 sm:items-center sm:px-6 sm:py-10">
        <div
          className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/20 shadow-[0_25px_80px_-20px_rgba(79,70,229,0.35)] backdrop-blur-[20px] backdrop-saturate-[180%] sm:rounded-[40px] md:flex-row md:min-h-[460px]"
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
            className={`relative flex flex-1 flex-col justify-between gap-6 px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 ${
              isLogin
                ? "bg-gradient-to-b from-violet-100/55 to-orange-100/45"
                : "bg-gradient-to-b from-orange-100/45 to-violet-100/55 order-2 md:order-1"
            }`}
          >
            <div className="space-y-2">
              <p className="text-xs font-light uppercase tracking-[0.25em] text-slate-600/90">
                {isLogin ? "bem vindo" : "olá de novo"}
              </p>
              <h2 className="text-xl font-semibold text-[#0f2744] sm:text-2xl">
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
                className="w-full rounded-full border border-white/40 bg-orange-200/50 px-6 py-2.5 text-sm font-medium text-[#7a3d12] shadow-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-orange-200/70 hover:shadow-md active:scale-[0.98] sm:w-auto sm:px-8"
              >
                {isLogin ? "Criar conta" : "Fazer login"}
              </button>
            </div>
          </section>

          <section
            className={`relative flex flex-1 flex-col justify-center gap-5 px-5 py-6 sm:px-8 sm:py-8 md:gap-6 md:px-12 md:py-10 ${
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

            <div className="relative mt-2 min-h-[370px] sm:mt-4 sm:min-h-[395px] md:mt-0">
              <form
                onSubmit={onLogin}
                aria-hidden={!isLogin}
                className={`absolute inset-0 flex flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-5 ${
                  isLogin
                    ? "translate-x-0 opacity-100"
                    : "pointer-events-none translate-x-3 opacity-0"
                }`}
              >
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
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
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
                {isLogin && error ? (
                  <p
                    className="text-center text-xs font-medium text-red-100"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || !isLogin}
                  className="w-full rounded-full bg-[#0f2744] py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[#162f52] hover:shadow-xl active:scale-[0.99] disabled:translate-y-0 disabled:shadow-lg disabled:opacity-60"
                >
                  {loading && isLogin ? "Entrando…" : "Entrar"}
                </button>
              </form>

              <form
                onSubmit={onRegister}
                aria-hidden={isLogin}
                className={`absolute inset-0 flex flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-5 ${
                  isLogin
                    ? "pointer-events-none -translate-x-3 opacity-0"
                    : "translate-x-0 opacity-100"
                }`}
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
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
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
                {!isLogin && error ? (
                  <p
                    className="text-center text-xs font-medium text-red-100"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || isLogin}
                  className="w-full rounded-full bg-[#0f2744] py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[#162f52] hover:shadow-xl active:scale-[0.99] disabled:translate-y-0 disabled:shadow-lg disabled:opacity-60"
                >
                  {loading && !isLogin ? "Criando…" : "Criar e entrar"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
