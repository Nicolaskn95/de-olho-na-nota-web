"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/auth-api";
import {
  Clock,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  Package,
  ShoppingBag,
  Timer,
} from "lucide-react";
import type {
  FiltrarDuracaoResponse,
  CalcularDuracaoResponse,
  NotaFiscalDuracao,
} from "@/interface/DuracaoMedia/IDuracaoMedia";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface CategoriaOption {
  _id: string;
  nome: string;
  icone: string;
  cor: string;
}

export function DuracaoMedia() {
  // Step control
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 form state
  const [mesInicial, setMesInicial] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [qtdMeses, setQtdMeses] = useState(3);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [prefixos, setPrefixos] = useState<any[]>([]);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);
  
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingNotas, setLoadingNotas] = useState(true);
  const [loadingPrefixos, setLoadingPrefixos] = useState(true);
  const [loadingFiltrar, setLoadingFiltrar] = useState(false);

  // Step 2 state
  const [filtroResult, setFiltroResult] =
    useState<FiltrarDuracaoResponse | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<
    Record<string, boolean>
  >({});
  const [loadingCalcular, setLoadingCalcular] = useState(false);
  const [resultado, setResultado] = useState<CalcularDuracaoResponse | null>(
    null
  );
  const [showResult, setShowResult] = useState(false);

  // Error state
  const [erro, setErro] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Load categories
      try {
        const res = await fetch(`${API_URL}/categorias`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Erro ao carregar categorias");
        const data: CategoriaOption[] = await res.json();
        setCategorias(data);
        if (data.length > 0 && !categoriaId) {
          setCategoriaId(data[0]._id);
        }
      } catch (e) {
        console.error(e);
        setErro("Não foi possível carregar as categorias.");
      } finally {
        setLoadingCategorias(false);
      }

      // 2. Load prefixos
      try {
        const res = await fetch(`${API_URL}/categorias/prefixos/listar`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setPrefixos(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPrefixos(false);
      }

      // 3. Load notas to extract months
      try {
        const res = await fetch(`${API_URL}/notas-fiscais`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const meses = new Set<string>();
          data.forEach((nota: any) => {
            if (nota.dataEmissao) {
              const date = new Date(nota.dataEmissao);
              const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              meses.add(mesAno);
            }
          });
          const mesesOrdenados = Array.from(meses).sort().reverse();
          setMesesDisponiveis(mesesOrdenados);
          if (mesesOrdenados.length > 0) {
            setMesInicial(mesesOrdenados[0]);
          } else {
            // Fallback to current calendar month
            const hoje = new Date();
            setMesInicial(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingNotas(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fade-in for results
  useEffect(() => {
    if (resultado) {
      const t = setTimeout(() => setShowResult(true), 50);
      return () => clearTimeout(t);
    } else {
      setShowResult(false);
    }
  }, [resultado]);

  const handleFiltrar = async () => {
    if (!mesInicial) {
      setErro("Nenhum mês de partida disponível. Certifique-se de ter notas fiscais escaneadas.");
      return;
    }
    setErro(null);
    setLoadingFiltrar(true);
    try {
      const res = await fetch(`${API_URL}/duracao-media/filtrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ mesInicial, categoriaId, qtdMeses }),
      });
      if (!res.ok) throw new Error("Erro ao filtrar notas fiscais");
      const data: FiltrarDuracaoResponse = await res.json();
      setFiltroResult(data);

      // Select all products by default
      const selection: Record<string, boolean> = {};
      data.notasFiscais.forEach((nf) => {
        nf.produtos.forEach((p) => {
          selection[p._id] = true;
        });
      });
      setSelectedProducts(selection);
      setResultado(null);
      setStep(2);
    } catch {
      setErro("Erro ao buscar notas fiscais. Tente novamente.");
    } finally {
      setLoadingFiltrar(false);
    }
  };

  const handleVoltar = () => {
    setStep(1);
    setFiltroResult(null);
    setResultado(null);
    setSelectedProducts({});
  };

  const handleCalcular = async () => {
    setErro(null);
    setLoadingCalcular(true);
    setResultado(null);
    try {
      const produtoIds = Object.entries(selectedProducts)
        .filter(([, selected]) => selected)
        .map(([id]) => id);

      const res = await fetch(`${API_URL}/duracao-media/calcular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ produtoIds, qtdMeses }),
      });
      if (!res.ok) throw new Error("Erro ao calcular duração média");
      const data: CalcularDuracaoResponse = await res.json();
      setResultado(data);
    } catch {
      setErro("Erro ao calcular duração média. Tente novamente.");
    } finally {
      setLoadingCalcular(false);
    }
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllInNf = (nf: NotaFiscalDuracao) => {
    const allSelected = nf.produtos.every((p) => selectedProducts[p._id]);
    const updates: Record<string, boolean> = {};
    nf.produtos.forEach((p) => {
      updates[p._id] = !allSelected;
    });
    setSelectedProducts((prev) => ({ ...prev, ...updates }));
  };

  const selectedCount = Object.values(selectedProducts).filter(Boolean).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatarLabelMes = (mesAno: string) => {
    if (!mesAno) return "";
    const [ano, mes] = mesAno.split("-");
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    return `${meses[parseInt(mes) - 1]} ${ano}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const categoriaNome =
    categorias.find((c) => c._id === categoriaId)?.nome || "";

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              step === 1
                ? "bg-green-600 text-white"
                : "bg-green-100 text-green-700"
            }`}
          >
            1
          </div>
          <span
            className={`text-sm ${step === 1 ? "font-semibold text-green-800" : "text-gray-500"}`}
          >
            Configuração
          </span>
        </div>
        <div className="w-12 h-0.5 bg-gray-300 rounded" />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              step === 2
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            2
          </div>
          <span
            className={`text-sm ${step === 2 ? "font-semibold text-green-800" : "text-gray-500"}`}
          >
            Seleção e Resultado
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500">
        Etapa {step} de 2
      </p>

      {/* Error display */}
      {erro && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
          {erro}
        </div>
      )}

      {/* STEP 1: Configuration Form */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Timer className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Calcular Duração Média
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Configure os parâmetros para analisar a duração média dos produtos
            entre compras.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mês/Ano Inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Mês/Ano Inicial
              </label>
              {loadingNotas ? (
                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Carregando meses...
                </div>
              ) : mesesDisponiveis.length === 0 ? (
                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Nenhuma nota cadastrada
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={mesInicial}
                    onChange={(e) => setMesInicial(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white"
                  >
                    {mesesDisponiveis.map((mes) => (
                      <option key={mes} value={mes}>
                        {formatarLabelMes(mes)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Package className="w-4 h-4 inline mr-1" />
                Categoria do Produto
              </label>
              {loadingCategorias ? (
                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Carregando categorias...
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
                  >
                    {categorias.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Período de Análise (meses)
              </label>
              <input
                type="number"
                min={1}
                max={36}
                value={qtdMeses}
                onChange={(e) =>
                  setQtdMeses(
                    Math.max(1, Math.min(36, parseInt(e.target.value) || 1))
                  )
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleFiltrar}
              disabled={loadingFiltrar || !categoriaId}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loadingFiltrar ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Buscando...
                </>
              ) : (
                <>
                  Avançar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Selection & Result */}
      {step === 2 && filtroResult && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    {filtroResult.categoria.nome}
                  </h2>
                </div>
                <p className="text-sm text-gray-500">
                  Período: {formatDate(filtroResult.periodoInicio)} até{" "}
                  {formatDate(filtroResult.periodoFim)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Search className="w-4 h-4" />
                <span>
                  {filtroResult.notasFiscais.length} nota
                  {filtroResult.notasFiscais.length !== 1 ? "s" : ""} encontrada
                  {filtroResult.notasFiscais.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {filtroResult.notasFiscais.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 shadow-sm text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                Nenhuma nota fiscal encontrada no período selecionado.
              </p>
              
              {prefixos.filter(p => p.categoria?._id === categoriaId).length === 0 ? (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-lg mx-auto text-left">
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    ⚠️ Atenção: Categoria sem prefixos cadastrados
                  </p>
                  <p className="text-xs text-yellow-700">
                    A categoria <strong>"{filtroResult.categoria.nome}"</strong> não possui nenhum prefixo cadastrado para a busca automática. 
                    Acesse a aba <strong>Configurações</strong> para cadastrar prefixos como "ARROZ", "FEIJAO", "BATATA", etc., permitindo que o sistema encontre e classifique as compras.
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-lg mx-auto text-left">
                  <p className="text-xs text-gray-600">
                    <strong>Prefixos ativos para {filtroResult.categoria.nome}:</strong>{" "}
                    {prefixos.filter(p => p.categoria?._id === categoriaId).map(p => p.prefixo).join(', ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Certifique-se de que existem compras correspondentes a estes prefixos nas datas selecionadas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty products state */}
          {filtroResult.notasFiscais.length > 0 &&
            filtroResult.notasFiscais.every(
              (nf) => nf.produtos.length === 0
            ) && (
              <div className="bg-white border border-gray-200 rounded-xl p-12 shadow-sm text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">
                  Nenhum produto da categoria encontrado nessas notas.
                </p>
              </div>
            )}

          {/* NF list with products */}
          {filtroResult.notasFiscais.some((nf) => nf.produtos.length > 0) && (
            <div className="space-y-4">
              {filtroResult.notasFiscais
                .filter((nf) => nf.produtos.length > 0)
                .map((nf) => {
                  const allSelected = nf.produtos.every(
                    (p) => selectedProducts[p._id]
                  );
                  return (
                    <div
                      key={nf._id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300"
                    >
                      {/* NF header */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleAllInNf(nf)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all duration-300 ${
                              allSelected
                                ? "bg-green-600 border-green-600 text-white"
                                : "border-gray-400 bg-white"
                            }`}
                          >
                            {allSelected && <Check className="w-3 h-3" />}
                          </button>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {formatDate(nf.dataEmissao)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {nf.estabelecimento}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                          {nf.produtos.length} produto
                          {nf.produtos.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Products */}
                      <div className="divide-y divide-gray-100">
                        {nf.produtos.map((produto) => (
                          <label
                            key={produto._id}
                            className="flex items-center gap-3 p-3 px-4 hover:bg-gray-50 cursor-pointer transition-all duration-300"
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedProducts[produto._id]}
                              onChange={() => toggleProduct(produto._id)}
                              className="accent-green-600 w-4 h-4"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {produto.nome}
                              </p>
                              <p className="text-xs text-gray-500">
                                {produto.quantidade} {produto.unidade} ×{" "}
                                {formatCurrency(produto.valorUnitario)}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {formatCurrency(produto.valorTotal)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <button
              onClick={handleVoltar}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={handleCalcular}
              disabled={loadingCalcular || selectedCount === 0}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loadingCalcular ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Calculando...
                </>
              ) : (
                <>
                  <Timer className="w-4 h-4" />
                  Calcular Duração Média
                  {selectedCount > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {selectedCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Result display */}
          {resultado && (
            <div
              className={`space-y-4 transition-all duration-500 ${
                showResult
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              {/* Main result card */}
              <div className="bg-white border-2 border-green-500 rounded-xl p-8 shadow-sm text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Timer className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-4xl font-bold text-green-800 mb-2">
                  Duração Média: {resultado.duracaoMediaDias} dias
                </p>
                <p className="text-gray-600">
                  Baseado em{" "}
                  {resultado.detalhes.reduce(
                    (sum, d) => sum + d.totalCompras,
                    0
                  )}{" "}
                  compras ao longo de {resultado.qtdMeses} meses
                </p>
              </div>

              {/* Detail cards */}
              {resultado.detalhes.map((detalhe, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">
                      {detalhe.nomeProduto}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total de compras:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {detalhe.totalCompras}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Soma das diferenças:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {detalhe.somaTotal} dias
                      </span>
                    </div>
                  </div>

                  {/* Purchase dates timeline */}
                  {detalhe.datasCompras.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Datas das compras
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {detalhe.datasCompras.map((data, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium"
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(data)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Differences */}
                  {detalhe.diferencasDias.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Diferenças entre compras (dias)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {detalhe.diferencasDias.map((diff, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                          >
                            <Clock className="w-3 h-3" />
                            {diff} dias
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
