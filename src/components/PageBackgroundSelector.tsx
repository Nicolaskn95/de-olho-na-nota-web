"use client";

import { useState } from "react";
import {
  BACKGROUND_PATTERNS,
  DEFAULT_BACKGROUND_PATTERN,
  usePageBackground,
} from "@/lib/page-background";
import { Check, Image as ImageIcon, RotateCcw, Sparkles } from "lucide-react";

export function PageBackgroundSelector() {
  const { backgroundId, setBackgroundId, resetBackgroundId } =
    usePageBackground();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSelect = (id: string, name: string) => {
    setBackgroundId(id);
    setFeedback(`Plano de fundo alterado para "${name}"!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleReset = () => {
    resetBackgroundId();
    setFeedback("Plano de fundo padrão (limpo) restaurado.");
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-green-700" />
            <h2 className="text-xl font-bold text-gray-800">
              Plano de Fundo das Páginas
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Escolha o estilo de textura ou padrão de fundo para personalizar o visual de todas as suas páginas
          </p>
        </div>

        {backgroundId !== DEFAULT_BACKGROUND_PATTERN.id && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-green-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </button>
        )}
      </div>

      {feedback && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl animate-in fade-in duration-200">
          <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {BACKGROUND_PATTERNS.map((pattern) => {
          const isSelected = backgroundId === pattern.id;

          return (
            <button
              key={pattern.id}
              type="button"
              onClick={() => handleSelect(pattern.id, pattern.name)}
              className={`group relative flex flex-col rounded-xl border text-left overflow-hidden transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-green-600 ring-2 ring-green-600/30 shadow-md scale-[1.02] bg-green-50/20"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 shadow-xs"
              }`}
            >
              {/* Box de Preview Visual do Padrão */}
              <div
                className="h-24 w-full relative border-b border-gray-200/80 transition-transform duration-300 group-hover:scale-105"
                style={pattern.style}
              >
                {/* Mini card simulando conteúdo */}
                <div className="absolute inset-x-3 bottom-2 bg-white/90 backdrop-blur-xs p-2 rounded-lg shadow-sm border border-black/10 flex items-center justify-between">
                  <div className="w-12 h-2 rounded-full bg-gray-300" />
                  <div className="w-4 h-2 rounded-full bg-green-600" />
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1 shadow-md">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Informações do Padrão */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {pattern.name}
                    </p>
                    {pattern.author !== "Original" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono">
                        {pattern.author}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {pattern.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
