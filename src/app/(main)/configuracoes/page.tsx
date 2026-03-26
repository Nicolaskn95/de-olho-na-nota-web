"use client";

import { Categorias } from "@/components/Categorias";
import { Estabelecimentos } from "@/components/Estabelecimentos";

export default function ConfiguracoesPage() {
  return (
    <main className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Configurações
          </h1>
          <p className="text-gray-600">
            Categorias de produtos e nomes dos estabelecimentos
          </p>
        </header>

        <section className="mb-12">
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

