"use client";

import { useEffect, useState, CSSProperties } from "react";

export type BackgroundPattern = {
  id: string;
  name: string;
  author: string;
  description: string;
  style: CSSProperties;
};

export const BACKGROUND_PATTERNS: BackgroundPattern[] = [
  {
    id: "none",
    name: "Padrão (Limpo)",
    author: "Original",
    description: "Fundo cinza suave e limpo do sistema",
    style: {
      backgroundColor: "#f8fafc",
    },
  },
  {
    id: "escannord",
    name: "Caderno Pautado Azul",
    author: "escannord",
    description: "Linhas pautadas horizontais com margem vermelha lateral",
    style: {
      background:
        "linear-gradient(#3f87a6 10%, #ebf8e1a2 10%), linear-gradient(to right, #ebf8e100 10%, #c73030 10% 10.2%, #ebf8e100 10.5%)",
      backgroundSize: "100% 25px, 100% 100%",
      backgroundRepeat: "repeat, no-repeat",
    },
  },
  {
    id: "monochromia",
    name: "Grade Monocromática",
    author: "kennyotsu-monochromia",
    description: "Grade quadriculada cinza minimalista de alta precisão",
    style: {
      backgroundColor: "#F3F3F3",
      backgroundImage:
        "linear-gradient(0deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%,transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%,transparent), linear-gradient(90deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%,transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%,transparent)",
      backgroundSize: "55px 55px",
    },
  },
  {
    id: "arnavk",
    name: "Linhas Horizontais",
    author: "ArnavK-09",
    description: "Linhas zebradas horizontais em preto e branco",
    style: {
      backgroundImage:
        "repeating-linear-gradient(0deg, black, 1px, white 1px, white)",
      backgroundSize: "100% 30px",
      backgroundColor: "white",
    },
  },
  {
    id: "selfmadesystem",
    name: "Degradê Vibrante OKLCH",
    author: "SelfMadeSystem",
    description: "Degradê cromático dinâmico com textura espectral",
    style: {
      background:
        "linear-gradient(#000 1px, #0000 0), linear-gradient(90deg, #000, #0000, #000), linear-gradient(in oklch longer hue -2deg, #a00, #a00)",
      backgroundSize: "100% 2px, 100% 100%, 100% 100%",
    },
  },
  {
    id: "argyle",
    name: "Losangos / Argyle",
    author: "Pattern",
    description: "Textura geométrica de losangos em tons bege e terrosos",
    style: {
      backgroundImage:
        "linear-gradient(rgba(244, 235, 208, 0.5) 50%, rgba(194, 178, 163, 0.5) 50%), linear-gradient(45deg, rgba(244, 235, 208, 0.5) 50%, rgba(194, 178, 163, 0.5) 50%), linear-gradient(90deg, rgba(244, 235, 208, 0.5) 50%, rgba(194, 178, 163, 0.5) 50%), linear-gradient(135deg, rgba(244, 235, 208, 0.5) 50%, rgba(194, 178, 163, 0.5) 50%)",
      backgroundSize: "83px 83px",
      backgroundColor: "#fdfbf7",
    },
  },
  {
    id: "deri-kurniawan",
    name: "Pontos Radiais Azuis",
    author: "Deri-Kurniawan",
    description: "Matriz de pontos esféricos azuis em grade circular",
    style: {
      background:
        "radial-gradient(circle at 10% 10%, #3e73f0 5%, transparent 5%), radial-gradient(circle at 90% 10%, #3e73f0 5%, transparent 5%), radial-gradient(circle at 90% 90%, #3e73f0 5%, transparent 5%), radial-gradient(circle at 10% 90%, #3e73f0 5%, transparent 5%)",
      backgroundSize: "20px 20px",
      backgroundColor: "#fafafa",
    },
  },
  {
    id: "artvelog",
    name: "Pauta Caderno Rosa",
    author: "artvelog",
    description: "Folha de caderno pautada com margem rosa destaque",
    style: {
      backgroundColor: "#f1f1f1",
      backgroundImage:
        "linear-gradient(90deg, transparent 50px, #ffb4b8 50px, #ffb4b8 52px, transparent 52px), linear-gradient(#e1e1e1 0.1em, transparent 0.1em)",
      backgroundSize: "100% 30px",
    },
  },
];

export const DEFAULT_BACKGROUND_PATTERN = BACKGROUND_PATTERNS[0];
const STORAGE_KEY = "session_page_background";
const EVENT_NAME = "session-page-background-changed";

export function findPatternById(id: string): BackgroundPattern {
  return (
    BACKGROUND_PATTERNS.find((p) => p.id === id) || DEFAULT_BACKGROUND_PATTERN
  );
}

export function getSessionPageBackground(): string {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND_PATTERN.id;
  try {
    const saved =
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_BACKGROUND_PATTERN.id;
}

export function setSessionPageBackground(id: string): void {
  if (typeof window === "undefined") return;
  const cleanId = id.trim();
  try {
    sessionStorage.setItem(STORAGE_KEY, cleanId);
    localStorage.setItem(STORAGE_KEY, cleanId);
  } catch {
    /* ignore */
  }

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { backgroundId: cleanId } })
  );
}

export function resetSessionPageBackground(): void {
  setSessionPageBackground(DEFAULT_BACKGROUND_PATTERN.id);
}

export function usePageBackground(): {
  backgroundId: string;
  setBackgroundId: (id: string) => void;
  resetBackgroundId: () => void;
  currentPattern: BackgroundPattern;
} {
  const [backgroundId, setBackgroundIdState] = useState<string>(
    DEFAULT_BACKGROUND_PATTERN.id
  );

  useEffect(() => {
    const activeId = getSessionPageBackground();
    setBackgroundIdState(activeId);

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ backgroundId: string }>;
      const newId =
        customEvent.detail?.backgroundId || getSessionPageBackground();
      setBackgroundIdState(newId);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newId = e.newValue || DEFAULT_BACKGROUND_PATTERN.id;
        setBackgroundIdState(newId);
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const setBackgroundId = (newId: string) => {
    setSessionPageBackground(newId);
    setBackgroundIdState(newId);
  };

  const resetBackgroundId = () => {
    resetSessionPageBackground();
    setBackgroundIdState(DEFAULT_BACKGROUND_PATTERN.id);
  };

  const currentPattern = findPatternById(backgroundId);

  return {
    backgroundId,
    setBackgroundId,
    resetBackgroundId,
    currentPattern,
  };
}
