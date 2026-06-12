"use client";

import { useState, useEffect, useMemo } from "react";
import { getAccessToken, getAuthHeaders } from "@/lib/auth-api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  Beef,
  Apple,
  Milk,
  Croissant,
  Package,
  Snowflake,
  Wine,
  SprayCan,
  Sparkles,
  PawPrint,
  Lamp,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
} from "lucide-react";
import { Categoria, Prefixo } from "@/interface/Prefixo/IPrefixo";
import { NotaFiscal } from "@/interface/NotaFiscal/INotaFiscal";
import { DuracaoMedia } from "./DuracaoMedia";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const ICONE_MAP: Record<string, React.ElementType> = {
  Beef,
  Apple,
  Milk,
  Croissant,
  Package,
  Snowflake,
  Wine,
  SprayCan,
  Sparkles,
  PawPrint,
  Lamp,
  ShoppingCart,
};

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
}

function categorizarProduto(
  nomeProduto: string,
  prefixos: Prefixo[],
): { categoriaId: string; categoriaCodigo: string } | null {
  const nomeUpper = nomeProduto.toUpperCase();

  const prefixosOrdenados = [...prefixos].sort(
    (a, b) => b.prefixo.length - a.prefixo.length,
  );

  for (const p of prefixosOrdenados) {
    if (nomeUpper.startsWith(p.prefixo) && p.categoria) {
      return {
        categoriaId: p.categoria._id,
        categoriaCodigo: p.categoria.codigo,
      };
    }
  }
  return null;
}

export function DashboardFinanceiro() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [prefixos, setPrefixos] = useState<Prefixo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  });
  const [carregando, setCarregando] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'duracao'>('dashboard');
  const [erro, setErro] = useState<string | null>(null);
  const [produtoComparacao1, setProdutoComparacao1] = useState("");
  const [produtoComparacao2, setProdutoComparacao2] = useState("");
  const [searchProduto1, setSearchProduto1] = useState("");
  const [listaProdutosBackend, setListaProdutosBackend] = useState<string[]>(
    [],
  );
  const [sugestoesProduto2, setSugestoesProduto2] = useState<string[]>([]);
  const [resultadoComparacao, setResultadoComparacao] = useState<{
    produto1: {
      nome: string;
      totalCompras: number;
      duracaoMediaDias: number | null;
      duracaoEntreComprasDias: number[];
    };
    produto2: {
      nome: string;
      totalCompras: number;
      duracaoMediaDias: number | null;
      duracaoEntreComprasDias: number[];
    };
  } | null>(null);
  const [dropdownProduto1Aberto, setDropdownProduto1Aberto] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [loadingComparacao, setLoadingComparacao] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Faça login para ver seus dados financeiros.");
      }
      const [notasRes, prefixosRes, categoriasRes] = await Promise.all([
        fetch(`${API_URL}/notas-fiscais`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/categorias/prefixos/listar`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/categorias`),
      ]);

      if (!notasRes.ok || !prefixosRes.ok || !categoriasRes.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const notasData = await notasRes.json();
      const prefixosData = await prefixosRes.json();
      const categoriasData = await categoriasRes.json();

      setNotas(notasData);
      setPrefixos(prefixosData);
      setCategorias(categoriasData);

      // Selecionar automaticamente o mês mais recente com notas
      if (notasData.length > 0) {
        const mesesComNotas = new Set<string>();
        notasData.forEach((nota: NotaFiscal) => {
          const data = new Date(nota.dataEmissao);
          const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
          mesesComNotas.add(mesAno);
        });
        const mesesOrdenados = Array.from(mesesComNotas).sort().reverse();
        if (mesesOrdenados.length > 0) {
          setMesSelecionado(mesesOrdenados[0]);
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  };

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();
    notas.forEach((nota) => {
      const data = new Date(nota.dataEmissao);
      const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      meses.add(mesAno);
    });
    return Array.from(meses).sort().reverse();
  }, [notas]);

  const dadosPorSemana = useMemo(() => {
    const [ano, mes] = mesSelecionado.split("-").map(Number);

    const notasDoMes = notas.filter((nota) => {
      const data = new Date(nota.dataEmissao);
      return data.getFullYear() === ano && data.getMonth() === mes - 1;
    });

    const semanas: Record<number, Record<string, number>> = {
      1: {},
      2: {},
      3: {},
      4: {},
      5: {},
    };

    notasDoMes.forEach((nota) => {
      const data = new Date(nota.dataEmissao);
      const semana = getWeekOfMonth(data);

      if (nota.produtos && Array.isArray(nota.produtos)) {
        nota.produtos.forEach((produto) => {
          const resultado = categorizarProduto(produto.nome, prefixos);
          const categoriaCodigo = resultado?.categoriaCodigo || "OUTROS";
          if (!semanas[semana]) semanas[semana] = {};
          semanas[semana][categoriaCodigo] =
            (semanas[semana][categoriaCodigo] || 0) + produto.valorTotal;
        });
      }
    });

    return semanas;
  }, [notas, prefixos, mesSelecionado]);

  const categoriasAtivas = useMemo(() => {
    const cats = new Set<string>();
    Object.values(dadosPorSemana).forEach((semana) => {
      Object.keys(semana).forEach((cat) => cats.add(cat));
    });
    return Array.from(cats);
  }, [dadosPorSemana]);

  const chartData = useMemo(() => {
    const labels = ["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"];

    const datasets = categoriasAtivas.map((codigo) => {
      const categoria = categorias.find((c) => c.codigo === codigo);
      const color = categoria?.cor || "#9ca3af";
      const label = categoria?.nome || codigo;

      return {
        label,
        data: [1, 2, 3, 4, 5].map(
          (semana) => dadosPorSemana[semana]?.[codigo] || 0,
        ),
        backgroundColor: color,
        borderRadius: 4,
      };
    });

    return { labels, datasets };
  }, [dadosPorSemana, categoriasAtivas, categorias]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw: unknown }) => {
            const value = context.raw as number;
            return `${context.dataset.label || ""}: R$ ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        ticks: {
          callback: (value: number | string) => `R$ ${value}`,
        },
      },
    },
  };

  const totalMes = useMemo(() => {
    return Object.values(dadosPorSemana).reduce((total, semana) => {
      return total + Object.values(semana).reduce((sum, val) => sum + val, 0);
    }, 0);
  }, [dadosPorSemana]);

  const totalPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {};
    Object.values(dadosPorSemana).forEach((semana) => {
      Object.entries(semana).forEach(([cat, valor]) => {
        totais[cat] = (totais[cat] || 0) + valor;
      });
    });
    return Object.entries(totais)
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, valor]) => ({ categoria, valor }));
  }, [dadosPorSemana]);

  const mediaSemanal = totalMes / 4;

  const formatarMesAno = (mesAno: string) => {
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

  useEffect(() => {
    if (carregando) return;
    setLoadingProdutos(true);
    fetch(`${API_URL}/notas-fiscais/produtos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: string[]) =>
        setListaProdutosBackend(Array.isArray(arr) ? arr : []),
      )
      .catch(() => setListaProdutosBackend([]))
      .finally(() => setLoadingProdutos(false));
  }, [carregando]);

  useEffect(() => {
    if (!produtoComparacao1.trim()) {
      setSugestoesProduto2([]);
      setProdutoComparacao2("");
      setResultadoComparacao(null);
      return;
    }
    setLoadingSugestoes(true);
    setProdutoComparacao2("");
    setResultadoComparacao(null);
    const nome = encodeURIComponent(produtoComparacao1.trim());
    fetch(`${API_URL}/notas-fiscais/produtos/sugestoes?nome=${nome}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: string[]) =>
        setSugestoesProduto2(Array.isArray(arr) ? arr : []),
      )
      .catch(() => setSugestoesProduto2([]))
      .finally(() => setLoadingSugestoes(false));
  }, [produtoComparacao1]);

  useEffect(() => {
    if (!produtoComparacao1.trim() || !produtoComparacao2.trim()) {
      setResultadoComparacao(null);
      return;
    }
    setLoadingComparacao(true);
    const p1 = encodeURIComponent(produtoComparacao1.trim());
    const p2 = encodeURIComponent(produtoComparacao2.trim());
    fetch(
      `${API_URL}/notas-fiscais/produtos/comparar-duracao?produto1=${p1}&produto2=${p2}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(setResultadoComparacao)
      .catch(() => setResultadoComparacao(null))
      .finally(() => setLoadingComparacao(false));
  }, [produtoComparacao1, produtoComparacao2]);

  const listaProdutosFiltrada = useMemo(() => {
    const termo = searchProduto1.trim().toLowerCase();
    if (!termo) return listaProdutosBackend.slice(0, 50);
    return listaProdutosBackend
      .filter((n) => n.toLowerCase().includes(termo))
      .slice(0, 50);
  }, [listaProdutosBackend, searchProduto1]);

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center">
          <p className="mb-4">{erro}</p>
          <button
            onClick={carregarDados}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">
          Dashboard Financeiro
        </h1>
        <p className="text-gray-600">
          Acompanhe seus gastos semanais por categoria
        </p>
      </header>

      {/* Tab bar */}
      <div className="mb-8 overflow-x-auto">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 min-w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'dashboard'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('duracao')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'duracao'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Duração Média
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (<>
      <div className="flex flex-wrap gap-4 mb-8 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
          >
            {mesesDisponiveis.map((mes) => (
              <option key={mes} value={mes}>
                {formatarMesAno(mes)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Total do Mês</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            R$ {totalMes.toFixed(2)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Média Semanal</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            R$ {mediaSemanal.toFixed(2)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Categorias Ativas</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {categoriasAtivas.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Gastos por Semana
          </h2>
          <div className="h-80">
            {categoriasAtivas.length > 0 ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Nenhum dado disponível para este mês
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Gastos por Categoria
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {totalPorCategoria.map(({ categoria, valor }) => {
              const cat = categorias.find((c) => c.codigo === categoria);
              const color = cat?.cor || "#9ca3af";
              const Icon =
                ICONE_MAP[cat?.icone || "ShoppingCart"] || ShoppingCart;
              const percentual = totalMes > 0 ? (valor / totalMes) * 100 : 0;

              return (
                <div key={categoria} className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {cat?.nome || categoria}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        R$ {valor.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percentual}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {totalPorCategoria.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Nenhum gasto registrado
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Legenda das Categorias
        </h2>
        <div className="flex flex-wrap gap-4">
          {categorias.map((cat) => {
            const Icon = ICONE_MAP[cat.icone] || ShoppingCart;
            return (
              <div
                key={cat._id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full"
              >
                <Icon className="w-4 h-4" style={{ color: cat.cor }} />
                <span className="text-sm text-gray-700">{cat.nome}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Quanto tempo durou na sua casa?
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Selecione dois produtos para comparar o tempo médio entre uma compra e
          a próxima (quanto tempo o produto costuma durar até você comprar de
          novo).
        </p>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Produto 1
            </label>
            <input
              type="text"
              value={
                dropdownProduto1Aberto ? searchProduto1 : produtoComparacao1
              }
              onChange={(e) => {
                setSearchProduto1(e.target.value);
                if (!e.target.value) setProdutoComparacao1("");
                setDropdownProduto1Aberto(true);
              }}
              onFocus={() => {
                setSearchProduto1(produtoComparacao1);
                setDropdownProduto1Aberto(true);
              }}
              onBlur={() =>
                setTimeout(() => setDropdownProduto1Aberto(false), 200)
              }
              placeholder="Buscar produto..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {dropdownProduto1Aberto && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loadingProdutos ? (
                  <li className="p-3 text-gray-500 text-sm">Carregando...</li>
                ) : listaProdutosFiltrada.length === 0 ? (
                  <li className="p-3 text-gray-500 text-sm">
                    Nenhum produto encontrado
                  </li>
                ) : (
                  listaProdutosFiltrada.map((nome) => (
                    <li key={nome}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 focus:bg-green-50 focus:outline-none"
                        onClick={() => {
                          setProdutoComparacao1(nome);
                          setSearchProduto1("");
                          setDropdownProduto1Aberto(false);
                        }}
                      >
                        {nome}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Produto 2 (sugestões parecidas com o 1º)
            </label>
            <select
              value={produtoComparacao2}
              onChange={(e) => setProdutoComparacao2(e.target.value)}
              disabled={!produtoComparacao1 || loadingSugestoes}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {!produtoComparacao1
                  ? "Selecione o produto 1 antes"
                  : loadingSugestoes
                    ? "Carregando sugestões..."
                    : sugestoesProduto2.length === 0
                      ? "Nenhuma sugestão"
                      : "Selecione um produto"}
              </option>
              {sugestoesProduto2.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loadingComparacao && (
          <p className="text-sm text-gray-500 mb-4">Calculando comparação...</p>
        )}
        {resultadoComparacao && !loadingComparacao && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[resultadoComparacao.produto1, resultadoComparacao.produto2].map(
                (info) => (
                  <div
                    key={info.nome}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
                  >
                    <h3 className="font-medium text-gray-800 mb-2 truncate">
                      {info.nome}
                    </h3>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total de compras:</dt>
                        <dd className="font-medium text-gray-800">
                          {info.totalCompras}
                        </dd>
                      </div>
                      {info.duracaoMediaDias !== null ? (
                        <>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">
                              Tempo médio entre compras:
                            </dt>
                            <dd className="font-medium text-green-700">
                              {info.duracaoMediaDias} dia
                              {info.duracaoMediaDias !== 1 ? "s" : ""}
                            </dd>
                          </div>
                          {info.duracaoEntreComprasDias.length > 1 && (
                            <div className="pt-2 mt-2 border-t border-gray-200">
                              <dt className="text-gray-600 mb-1">
                                Duração em cada ciclo:
                              </dt>
                              <dd className="text-gray-700">
                                {info.duracaoEntreComprasDias.join(", ")} dias
                              </dd>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 italic">
                          Comprado apenas 1 vez — não há como calcular duração
                          ainda.
                        </p>
                      )}
                    </dl>
                  </div>
                ),
              )}
            </div>
            {resultadoComparacao.produto1.duracaoMediaDias != null &&
              resultadoComparacao.produto2.duracaoMediaDias != null && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    {(() => {
                      const d1 = resultadoComparacao.produto1.duracaoMediaDias;
                      const d2 = resultadoComparacao.produto2.duracaoMediaDias;
                      const diff = d1 - d2;
                      if (diff > 0)
                        return `"${resultadoComparacao.produto1.nome}" dura em média ${diff} dias a mais entre compras que "${resultadoComparacao.produto2.nome}".`;
                      if (diff < 0)
                        return `"${resultadoComparacao.produto2.nome}" dura em média ${Math.abs(diff)} dias a mais entre compras que "${resultadoComparacao.produto1.nome}".`;
                      return "Os dois produtos têm o mesmo tempo médio entre compras.";
                    })()}
                  </p>
                </div>
              )}
          </>
        )}
      </div>
      </>)}

      {activeTab === 'duracao' && <DuracaoMedia />}
    </div>
  );
}
