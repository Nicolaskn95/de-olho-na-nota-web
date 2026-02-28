"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Produto {
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

interface NotaFiscal {
  _id: string;
  dataEmissao: string;
  valorPago: number;
  produtos: Produto[];
}

interface Categoria {
  _id: string;
  codigo: string;
  nome: string;
  cor: string;
  icone: string;
}

interface Prefixo {
  prefixo: string;
  categoria: Categoria;
}

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

const CATEGORIA_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  ACOUGUE_E_PEIXARIA: { label: "Açougue", color: "#dc2626", icon: Beef },
  HORTIFRUTI: { label: "Hortifruti", color: "#16a34a", icon: Apple },
  LATICINIOS_E_OVOS: { label: "Laticínios", color: "#f59e0b", icon: Milk },
  PADARIA_E_CONFEITARIA: { label: "Padaria", color: "#d97706", icon: Croissant },
  MERCEARIA_SECA: { label: "Mercearia", color: "#8b5cf6", icon: Package },
  CONGELADOS: { label: "Congelados", color: "#0ea5e9", icon: Snowflake },
  BEBIDAS: { label: "Bebidas", color: "#ec4899", icon: Wine },
  LIMPEZA: { label: "Limpeza", color: "#06b6d4", icon: SprayCan },
  HIGIENE_E_BELEZA: { label: "Higiene", color: "#f472b6", icon: Sparkles },
  PET_SHOP: { label: "Pet Shop", color: "#a855f7", icon: PawPrint },
  UTILIDADES_DOMESTICAS: { label: "Utilidades", color: "#64748b", icon: Lamp },
  OUTROS: { label: "Outros", color: "#9ca3af", icon: ShoppingCart },
};

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
}

function categorizarProduto(
  nomeProduto: string,
  prefixos: Prefixo[]
): { categoriaId: string; categoriaCodigo: string } | null {
  const nomeUpper = nomeProduto.toUpperCase();
  
  const prefixosOrdenados = [...prefixos].sort(
    (a, b) => b.prefixo.length - a.prefixo.length
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
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [notasRes, prefixosRes, categoriasRes] = await Promise.all([
        fetch(`${API_URL}/notas-fiscais`),
        fetch(`${API_URL}/categorias/prefixos/listar`),
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

    const datasets = categoriasAtivas.map((categoria) => ({
      label: CATEGORIA_CONFIG[categoria]?.label || categoria,
      data: [1, 2, 3, 4, 5].map(
        (semana) => dadosPorSemana[semana]?.[categoria] || 0
      ),
      backgroundColor: CATEGORIA_CONFIG[categoria]?.color || "#9ca3af",
      borderRadius: 4,
    }));

    return { labels, datasets };
  }, [dadosPorSemana, categoriasAtivas]);

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
      return (
        total + Object.values(semana).reduce((sum, val) => sum + val, 0)
      );
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
              const config = CATEGORIA_CONFIG[categoria] || CATEGORIA_CONFIG.OUTROS;
              const Icon = config.icon;
              const percentual = totalMes > 0 ? (valor / totalMes) * 100 : 0;

              return (
                <div key={categoria} className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: config.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {config.label}
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
                          backgroundColor: config.color,
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
          {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full"
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-sm text-gray-700">{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
