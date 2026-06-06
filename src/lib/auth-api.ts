const API_BASE =
  typeof process.env.NEXT_PUBLIC_API_URL === "string"
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:3001";

export type AuthUser = { id: string; username: string };

export type LoginResponse = {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      message?: string | string[];
    };
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    if (typeof body.message === "string") {
      return body.message;
    }
  } catch {
    /* ignore */
  }
  return res.statusText || "Erro na requisição";
}

export async function loginRequest(
  username: string,
  password: string,
  remember: boolean,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, remember }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<LoginResponse>;
}

export async function registerRequest(
  username: string,
  password: string,
): Promise<{ id: string; username: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<{ id: string; username: string }>;
}

function normalizeToken(token: string | null): string | null {
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_remember");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
  } catch {
    /* ignore */
  }
}

export function persistSession(
  data: LoginResponse,
  remember: boolean,
): void {
  if (!data.accessToken?.trim()) {
    throw new Error("Resposta de login inválida: token ausente");
  }
  if (!data.user?.id || !data.user?.username) {
    throw new Error("Resposta de login inválida: usuário ausente");
  }

  clearStoredSession();

  // sessionStorage is cleared aggressively on mobile Safari when the tab/app
  // is closed; localStorage survives. "remember" still controls JWT expiry (7d vs 1d).
  try {
    localStorage.setItem("auth_token", data.accessToken);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem("auth_remember", remember ? "1" : "0");
  } catch {
    throw new Error(
      "Não foi possível salvar a sessão. Verifique se cookies/dados do site não estão bloqueados.",
    );
  }
}

export function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem("auth_remember") !== "0";
  } catch {
    return true;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeToken(
      localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token"),
    );
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem("auth_user") ||
      sessionStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  clearStoredSession();
}
