"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getAccessToken } from "@/lib/auth-api";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      router.replace("/login");
      return;
    }
    setReady(true);

    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
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
    };

    return () => {
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

