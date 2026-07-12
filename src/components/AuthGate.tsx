"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getAccessToken } from "@/lib/auth-api";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

function decodeJwtPayload(payloadB64: string): any {
  try {
    const bin = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const json = decodeURIComponent(
      bin
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    try {
      return JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = decodeJwtPayload(parts[1]);
    if (!payload || typeof payload.exp !== "number") return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkTokenAndRedirect = () => {
      const token = getAccessToken();
      if (!token || isTokenExpired(token)) {
        setReady(false);
        clearSession();
        router.replace("/login");
        return false;
      }
      return true;
    };

    // Initial check
    const isValid = checkTokenAndRedirect();
    if (isValid) {
      setReady(true);
    }

    // Set up periodic checks (every 5 seconds) and event listeners for focus/visibility changes.
    // This handles background expiration when the user wakes the device or switches tabs,
    // which is particularly helpful on mobile Safari.
    const interval = setInterval(checkTokenAndRedirect, 5000);
    window.addEventListener("visibilitychange", checkTokenAndRedirect);
    window.addEventListener("focus", checkTokenAndRedirect);

    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
      try {
        const response = await originalFetch(...args);
        
        const input = args[0];
        let urlString = "";
        if (typeof input === "string") {
          urlString = input;
        } else if (input instanceof URL) {
          urlString = input.href;
        } else if (input && typeof input === "object" && "url" in input) {
          urlString = input.url;
        }

        const isApiRequest = urlString.startsWith(API_URL) || urlString.startsWith("/");

        if (response.status === 401 && isApiRequest) {
          setReady(false);
          clearSession();
          router.replace("/login");
        }
        return response;
      } catch (error) {
        // If the fetch call failed/rejected (which can happen on iOS Safari when the request fails
        // on a 401 due to WWW-Authenticate headers), double-check if the token has expired.
        const token = getAccessToken();
        if (token && isTokenExpired(token)) {
          setReady(false);
          clearSession();
          router.replace("/login");
        }
        throw error;
      }
    };

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", checkTokenAndRedirect);
      window.removeEventListener("focus", checkTokenAndRedirect);
      window.fetch = originalFetch;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

