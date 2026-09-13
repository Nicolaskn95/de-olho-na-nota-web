"use client";

import { Categorias } from "@/components/Categorias";
import { Estabelecimentos } from "@/components/Estabelecimentos";
import { PageBackgroundSelector } from "@/components/PageBackgroundSelector";

export default function ConfiguracoesPage() {
  return (
    <main className="min-h-screen py-4 sm:py-8 bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Configurações
          </h1>
          <p className="text-gray-600">
            Personalize a aparência, categorias e estabelecimentos do seu sistema
          </p>
        </header>

        {/* Seção Plano de Fundo das Páginas */}
        <PageBackgroundSelector />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Categorias
          </h2>
          <Categorias compact />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Estabelecimentos
          </h2>
          <Estabelecimentos />
        </section>
      </div>
    </main>
  );
}


