"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Categoria {
  _id: string;
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
}

interface Prefixo {
  _id: string;
  prefixo: string;
  categoria: Categoria;
}

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [prefixos, setPrefixos] = useState<Prefixo[]>([]);
  const [novoPrefixo, setNovoPrefixo] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [editando, setEditando] = useState<Prefixo | null>(null);
  const [editPrefixo, setEditPrefixo] = useState("");
  const [editCategoria, setEditCategoria] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [categoriasRes, prefixosRes] = await Promise.all([
        fetch(`${API_URL}/categorias`),
        fetch(`${API_URL}/categorias/prefixos/listar`),
      ]);

      if (!categoriasRes.ok || !prefixosRes.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const categoriasData = await categoriasRes.json();
      const prefixosData = await prefixosRes.json();

      setCategorias(categoriasData);
      setPrefixos(prefixosData);

      if (categoriasData.length > 0 && !categoriaSelecionada) {
        setCategoriaSelecionada(categoriasData[0]._id);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  };

  const salvarPrefixo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novoPrefixo.trim() || !categoriaSelecionada) return;

    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      const response = await fetch(`${API_URL}/categorias/prefixos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixo: novoPrefixo.trim(),
          categoriaId: categoriaSelecionada,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      const novoPrefixoSalvo = await response.json();
      setPrefixos((prev) =>
        [...prev, novoPrefixoSalvo].sort((a, b) =>
          a.prefixo.localeCompare(b.prefixo)
        )
      );
      setNovoPrefixo("");
      setSucesso(`Prefixo "${novoPrefixoSalvo.prefixo}" cadastrado com sucesso!`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar prefixo");
    } finally {
      setSalvando(false);
    }
  };

  const removerPrefixo = async (id: string, prefixo: string) => {
    if (!confirm(`Deseja remover o prefixo "${prefixo}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/categorias/prefixos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao remover prefixo");
      }

      setPrefixos((prev) => prev.filter((p) => p._id !== id));
      setSucesso(`Prefixo "${prefixo}" removido com sucesso!`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover prefixo");
    }
  };

  const iniciarEdicao = (prefixo: Prefixo) => {
    setEditando(prefixo);
    setEditPrefixo(prefixo.prefixo);
    setEditCategoria(prefixo.categoria._id);
    setErro(null);
    setSucesso(null);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setEditPrefixo("");
    setEditCategoria("");
  };

  const salvarEdicao = async () => {
    if (!editando || !editPrefixo.trim() || !editCategoria) return;

    setSalvando(true);
    setErro(null);

    try {
      const response = await fetch(
        `${API_URL}/categorias/prefixos/${editando._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prefixo: editPrefixo.trim(),
            categoriaId: editCategoria,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      const prefixoAtualizado = await response.json();
      setPrefixos((prev) =>
        prev
          .map((p) => (p._id === editando._id ? prefixoAtualizado : p))
          .sort((a, b) => a.prefixo.localeCompare(b.prefixo))
      );
      setSucesso(`Prefixo "${prefixoAtualizado.prefixo}" atualizado com sucesso!`);
      cancelarEdicao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar prefixo");
    } finally {
      setSalvando(false);
    }
  };

  const prefixosPorCategoria = prefixos.reduce(
    (acc, prefixo) => {
      const catId = prefixo.categoria?._id || "sem-categoria";
      if (!acc[catId]) {
        acc[catId] = [];
      }
      acc[catId].push(prefixo);
      return acc;
    },
    {} as Record<string, Prefixo[]>
  );

  const getCategoriaById = (id: string) => {
    return categorias.find((c) => c._id === id);
  };

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Carregando categorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">
          Categorização de Produtos
        </h1>
        <p className="text-gray-600">
          Cadastre prefixos para categorizar produtos automaticamente
        </p>
      </header>

      {erro && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {erro}
          <button
            onClick={() => setErro(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {sucesso && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
          {sucesso}
          <button
            onClick={() => setSucesso(null)}
            className="ml-4 text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Editar Prefixo
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Prefixo
                </label>
                <input
                  type="text"
                  value={editPrefixo}
                  onChange={(e) => setEditPrefixo(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Categoria
                </label>
                <select
                  value={editCategoria}
                  onChange={(e) => setEditCategoria(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                >
                  {categorias.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={cancelarEdicao}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={!editPrefixo.trim() || salvando}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Cadastrar Novo Prefixo
        </h2>
        <form onSubmit={salvarPrefixo} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="prefixo" className="block text-sm text-gray-600 mb-1">
              Prefixo (início do nome do produto)
            </label>
            <input
              id="prefixo"
              type="text"
              value={novoPrefixo}
              onChange={(e) => setNovoPrefixo(e.target.value.toUpperCase())}
              placeholder="Ex: LING, LEITE, SABAN"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="categoria" className="block text-sm text-gray-600 mb-1">
              Categoria
            </label>
            <select
              id="categoria"
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            >
              {categorias.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!novoPrefixo.trim() || salvando}
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Prefixos Cadastrados ({prefixos.length})
        </h2>

        {prefixos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum prefixo cadastrado ainda
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(prefixosPorCategoria).map(([catId, items]) => {
              const categoria = getCategoriaById(catId);
              return (
                <div key={catId}>
                  <h3
                    className="text-sm font-medium mb-2 border-b pb-1 flex items-center gap-2"
                    style={{ 
                      color: categoria?.cor || "#666",
                      borderColor: categoria?.cor || "#e5e7eb"
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria?.cor || "#9ca3af" }}
                    />
                    {categoria?.nome || "Sem categoria"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((prefixo) => (
                      <span
                        key={prefixo._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                      >
                        <span className="font-mono font-medium text-gray-800">
                          {prefixo.prefixo}
                        </span>
                        <button
                          onClick={() => iniciarEdicao(prefixo)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Editar prefixo"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => removerPrefixo(prefixo._id, prefixo.prefixo)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover prefixo"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
