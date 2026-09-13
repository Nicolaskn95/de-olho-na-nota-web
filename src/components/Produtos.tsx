"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getAuthHeaders } from "@/lib/auth-api";
import type { NotaFiscal } from "@/interface/NotaFiscal/INotaFiscal";
import type { Produto } from "@/interface/Produto/IProduto";
import type { Categoria, Prefixo } from "@/interface/Prefixo/IPrefixo";
import { Loader } from "@/components/Loader";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Search,
  Package,
  DollarSign,
  Hash,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Store,
  Calendar,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Fuzzy Matching ────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeForMatching(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function areSimilar(a: string, b: string): boolean {
  const na = normalizeForMatching(a);
  const nb = normalizeForMatching(b);
  if (na === nb) return true;

  // Check prefix match (first 60% of shorter string)
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  const prefixLen = Math.max(4, Math.floor(shorter.length * 0.6));
  if (
    shorter.length >= 4 &&
    shorter.substring(0, prefixLen) === longer.substring(0, prefixLen)
  ) {
    // If prefix matches, check overall similarity
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    return dist / maxLen < 0.35;
  }

  // Direct distance check for short names
  if (na.length <= 8 && nb.length <= 8) {
    return levenshtein(na, nb) <= 2;
  }

  return false;
}

// ─── Types ─────────────────────────────────────────────────────────

interface ProdutoOccurrence {
  produto: Produto;
  nota: NotaFiscal;
}

interface ProdutoAgrupado {
  nome: string;
  nomes: string[];
  ocorrencias: ProdutoOccurrence[];
  totalGasto: number;
  totalQuantidade: number;
  vezesComprado: number;
  mediaPrecoUnitario: number;
  ultimoPreco: number;
  ultimaData: string;
  estabelecimentos: Map<string, { total: number; count: number; ultimoPreco: number }>;
  precosPorMes: Map<string, { total: number; count: number }>;
  variacao: number | null; // % change of last price vs average
  categoria: Categoria | null;
}

// ─── Helpers ───────────────────────────────────────────────────────

function formatCurrency(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatMonthLabel(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
}

function getCategoriaProduto(
  nomeProduto: string,
  prefixos: Prefixo[]
): Categoria | null {
  const nomeUpper = nomeProduto.toUpperCase();
  const sorted = [...prefixos].sort(
    (a, b) => b.prefixo.length - a.prefixo.length
  );
  for (const p of sorted) {
    if (nomeUpper.startsWith(p.prefixo.toUpperCase())) {
      return p.categoria;
    }
  }
  return null;
}

// ─── Component ─────────────────────────────────────────────────────

export function Produtos() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [prefixos, setPrefixos] = useState<Prefixo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filters
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [produtoSelecionado, setProdutoSelecionado] =
    useState<ProdutoAgrupado | null>(null);

  // Ranking order
  const [rankingOrder, setRankingOrder] = useState<
    "gasto" | "frequencia" | "quantidade"
  >("gasto");

  // Search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ─── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    carregarDados();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const carregarDados = async () => {
    try {
      const [notasRes, prefixosRes, categoriasRes] = await Promise.all([
        fetch(`${API_URL}/notas-fiscais`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/categorias/prefixos/listar`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/categorias`),
      ]);

      if (!notasRes.ok) throw new Error("Erro ao carregar notas fiscais.");
      const notasData = (await notasRes.json()) as NotaFiscal[];
      setNotas(notasData);

      if (prefixosRes.ok) {
        setPrefixos((await prefixosRes.json()) as Prefixo[]);
      }
      if (categoriasRes.ok) {
        setCategorias((await categoriasRes.json()) as Categoria[]);
      }

      // Auto-set date range to full data span
      if (notasData.length > 0) {
        const datas = notasData.map((n) => new Date(n.dataEmissao).getTime());
        const min = new Date(Math.min(...datas));
        const max = new Date(Math.max(...datas));
        setDataInicio(
          `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, "0")}-${String(min.getDate()).padStart(2, "0")}`
        );
        setDataFim(
          `${max.getFullYear()}-${String(max.getMonth() + 1).padStart(2, "0")}-${String(max.getDate()).padStart(2, "0")}`
        );
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  };

  // ─── Aggregate products with fuzzy matching ────────────────────
  const produtosAgrupados = useMemo(() => {
    // Filter notas by date range
    const notasFiltradas = notas.filter((nota) => {
      const d = new Date(nota.dataEmissao);
      if (dataInicio && d < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        if (d > fim) return false;
      }
      return true;
    });

    // Collect all product occurrences
    const allOccurrences: ProdutoOccurrence[] = [];
    for (const nota of notasFiltradas) {
      if (!nota.produtos) continue;
      for (const produto of nota.produtos) {
        allOccurrences.push({ produto, nota });
      }
    }

    // Group by fuzzy name
    const groups: ProdutoAgrupado[] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < allOccurrences.length; i++) {
      if (assigned.has(i)) continue;

      const occ = allOccurrences[i];
      const group: ProdutoOccurrence[] = [occ];
      const names = new Set<string>([occ.produto.nome]);
      assigned.add(i);

      for (let j = i + 1; j < allOccurrences.length; j++) {
        if (assigned.has(j)) continue;
        const other = allOccurrences[j];

        // Check if any name in the group is similar
        let match = false;
        for (const existingName of names) {
          if (areSimilar(existingName, other.produto.nome)) {
            match = true;
            break;
          }
        }

        if (match) {
          group.push(other);
          names.add(other.produto.nome);
          assigned.add(j);
        }
      }

      // Build aggregated product
      const totalGasto = group.reduce(
        (acc, o) => acc + o.produto.valorTotal,
        0
      );
      const totalQuantidade = group.reduce(
        (acc, o) => acc + o.produto.quantidade,
        0
      );

      // Sort by date to find latest
      const sorted = [...group].sort(
        (a, b) =>
          new Date(b.nota.dataEmissao).getTime() -
          new Date(a.nota.dataEmissao).getTime()
      );

      // Establishment stats
      const estabMap = new Map<
        string,
        { total: number; count: number; ultimoPreco: number }
      >();
      for (const o of group) {
        const key = o.nota.estabelecimento;
        const existing = estabMap.get(key) || {
          total: 0,
          count: 0,
          ultimoPreco: 0,
        };
        existing.total += o.produto.valorTotal;
        existing.count += 1;
        existing.ultimoPreco = o.produto.valorUnitario;
        estabMap.set(key, existing);
      }

      // Monthly price stats
      const mesMap = new Map<string, { total: number; count: number }>();
      for (const o of group) {
        const d = new Date(o.nota.dataEmissao);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const existing = mesMap.get(key) || { total: 0, count: 0 };
        existing.total += o.produto.valorUnitario;
        existing.count += 1;
        mesMap.set(key, existing);
      }

      const mediaPreco = totalGasto / totalQuantidade;
      const ultimoPreco = sorted[0].produto.valorUnitario;
      const variacao =
        mediaPreco > 0 ? ((ultimoPreco - mediaPreco) / mediaPreco) * 100 : null;

      // Use most common name
      const nameCount = new Map<string, number>();
      group.forEach((o) => {
        nameCount.set(
          o.produto.nome,
          (nameCount.get(o.produto.nome) || 0) + 1
        );
      });
      const mainName = [...nameCount.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      const cat = getCategoriaProduto(mainName, prefixos);

      groups.push({
        nome: mainName,
        nomes: [...names],
        ocorrencias: group,
        totalGasto,
        totalQuantidade,
        vezesComprado: group.length,
        mediaPrecoUnitario: mediaPreco,
        ultimoPreco,
        ultimaData: sorted[0].nota.dataEmissao,
        estabelecimentos: estabMap,
        precosPorMes: mesMap,
        variacao,
        categoria: cat,
      });
    }

    return groups;
  }, [notas, prefixos, dataInicio, dataFim]);

  // ─── Filter products ──────────────────────────────────────────
  const produtosFiltrados = useMemo(() => {
    let filtered = produtosAgrupados;

    // Category filter
    if (categoriaFiltro !== "todas") {
      filtered = filtered.filter(
        (p) => p.categoria?._id === categoriaFiltro
      );
    }

    // Search filter
    if (busca.trim()) {
      const term = busca.toLowerCase().trim();
      filtered = filtered.filter((p) =>
        p.nomes.some((n) => n.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [produtosAgrupados, categoriaFiltro, busca]);

  // ─── Global stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalGasto = produtosFiltrados.reduce(
      (acc, p) => acc + p.totalGasto,
      0
    );
    const totalItens = produtosFiltrados.reduce(
      (acc, p) => acc + p.totalQuantidade,
      0
    );
    const produtosUnicos = produtosFiltrados.length;
    const mediaPorItem = totalItens > 0 ? totalGasto / totalItens : 0;

    return { totalGasto, totalItens, produtosUnicos, mediaPorItem };
  }, [produtosFiltrados]);

  // ─── Ranking ──────────────────────────────────────────────────
  const ranking = useMemo(() => {
    const sorted = [...produtosFiltrados];
    switch (rankingOrder) {
      case "gasto":
        sorted.sort((a, b) => b.totalGasto - a.totalGasto);
        break;
      case "frequencia":
        sorted.sort((a, b) => b.vezesComprado - a.vezesComprado);
        break;
      case "quantidade":
        sorted.sort((a, b) => b.totalQuantidade - a.totalQuantidade);
        break;
    }
    return sorted.slice(0, 20);
  }, [produtosFiltrados, rankingOrder]);

  // ─── Search suggestions ───────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!busca.trim() || busca.length < 2) return [];
    const term = busca.toLowerCase();
    return produtosAgrupados
      .filter((p) => p.nomes.some((n) => n.toLowerCase().includes(term)))
      .slice(0, 8);
  }, [busca, produtosAgrupados]);

  // ─── Price chart data for selected product ────────────────────
  const chartData = useMemo(() => {
    if (!produtoSelecionado) return null;

    const entries = [...produtoSelecionado.precosPorMes.entries()].sort(
      (a, b) => a[0].localeCompare(b[0])
    );

    const labels = entries.map(([mes]) => formatMonthLabel(mes));
    const data = entries.map(([, v]) => v.total / v.count);

    return {
      labels,
      datasets: [
        {
          label: "Preço Médio Unitário",
          data,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [produtoSelecionado]);

  // ─── Categories used in products ──────────────────────────────
  const categoriasUsadas = useMemo(() => {
    const cats = new Map<string, Categoria>();
    produtosAgrupados.forEach((p) => {
      if (p.categoria) {
        cats.set(p.categoria._id, p.categoria);
      }
    });
    return [...cats.values()];
  }, [produtosAgrupados]);

  // ─── Export CSV ───────────────────────────────────────────────
  const exportarCSV = useCallback(() => {
    const rows = [
      ["Produto", "Total Gasto", "Quantidade Total", "Vezes Comprado", "Preço Médio", "Último Preço", "Última Compra", "Categoria"],
    ];
    produtosFiltrados
      .sort((a, b) => b.totalGasto - a.totalGasto)
      .forEach((p) => {
        rows.push([
          p.nome,
          p.totalGasto.toFixed(2),
          p.totalQuantidade.toString(),
          p.vezesComprado.toString(),
          p.mediaPrecoUnitario.toFixed(2),
          p.ultimoPreco.toFixed(2),
          formatDate(p.ultimaData),
          p.categoria?.nome || "Sem categoria",
        ]);
      });

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos-de-olho-na-nota-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [produtosFiltrados]);

  // ─── Export PDF ───────────────────────────────────────────────
  const exportarPDF = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text("De Olho na Nota - Relatório de Produtos", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} | ${produtosFiltrados.length} produtos`,
      14,
      30
    );

    // Stats
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`Total Gasto: ${formatCurrency(stats.totalGasto)}`, 14, 40);
    doc.text(`Total de Itens: ${stats.totalItens}`, 14, 46);
    doc.text(`Média por Item: ${formatCurrency(stats.mediaPorItem)}`, 14, 52);
    doc.text(`Produtos Únicos: ${stats.produtosUnicos}`, 120, 40);

    // Table
    const tableData = produtosFiltrados
      .sort((a, b) => b.totalGasto - a.totalGasto)
      .map((p) => [
        p.nome,
        formatCurrency(p.totalGasto),
        p.vezesComprado.toString(),
        p.totalQuantidade.toFixed(1),
        formatCurrency(p.mediaPrecoUnitario),
        formatCurrency(p.ultimoPreco),
        p.categoria?.nome || "-",
      ]);

    autoTable(doc, {
      startY: 58,
      head: [
        [
          "Produto",
          "Total Gasto",
          "Compras",
          "Qtd Total",
          "Preço Médio",
          "Último Preço",
          "Categoria",
        ],
      ],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(
      `produtos-de-olho-na-nota-${new Date().toISOString().split("T")[0]}.pdf`
    );
  }, [produtosFiltrados, stats]);

  // ─── Render helpers ───────────────────────────────────────────

  const VariacaoBadge = ({ variacao }: { variacao: number | null }) => {
    if (variacao === null) return null;
    const abs = Math.abs(variacao);
    if (abs < 1) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          <Minus className="w-3 h-3" /> Estável
        </span>
      );
    }
    if (variacao > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
          <ArrowUpRight className="w-3 h-3" /> +{abs.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
        <ArrowDownRight className="w-3 h-3" /> -{abs.toFixed(1)}%
      </span>
    );
  };

  // ─── Loading & Error ──────────────────────────────────────────

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-gray-600">Carregando produtos...</p>
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

  // ─── Main Render ──────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">Produtos</h1>
        <p className="text-gray-600">
          Visão macro dos seus produtos comprados
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Total Gasto
            </span>
          </div>
          <p className="text-xl font-bold text-gray-800">
            {formatCurrency(stats.totalGasto)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hash className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Itens Encontrados
            </span>
          </div>
          <p className="text-xl font-bold text-gray-800">
            {stats.totalItens.toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Média por Item
            </span>
          </div>
          <p className="text-xl font-bold text-gray-800">
            {formatCurrency(stats.mediaPorItem)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Produtos Únicos
            </span>
          </div>
          <p className="text-xl font-bold text-gray-800">
            {stats.produtosUnicos}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setShowSuggestions(true);
                setProdutoSelecionado(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Buscar produto por nome..."
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
            />
            {busca && (
              <button
                onClick={() => {
                  setBusca("");
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((p, i) => (
                  <button
                    key={`${p.nome}-${i}`}
                    onClick={() => {
                      setBusca(p.nome);
                      setProdutoSelecionado(p);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-green-50 flex items-center justify-between gap-3 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {p.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.vezesComprado}x comprado
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-green-700">
                        {formatCurrency(p.totalGasto)}
                      </p>
                      <VariacaoBadge variacao={p.variacao} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              showFilters
                ? "bg-green-50 border-green-300 text-green-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {showFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportarCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Exportar PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Categoria
              </label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              >
                <option value="todas">Todas as categorias</option>
                {categoriasUsadas.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Data início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Data fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Selected Product Detail */}
      {produtoSelecionado && (
        <div className="mb-8 space-y-4 animate-in fade-in duration-300">
          {/* Detail Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-800">
                    {produtoSelecionado.nome}
                  </h2>
                  <VariacaoBadge variacao={produtoSelecionado.variacao} />
                </div>
                {produtoSelecionado.categoria && (
                  <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    {produtoSelecionado.categoria.nome}
                  </span>
                )}
                {produtoSelecionado.nomes.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Variações agrupadas: {produtoSelecionado.nomes.join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setProdutoSelecionado(null);
                  setBusca("");
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Detail Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Gasto</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatCurrency(produtoSelecionado.totalGasto)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Vezes Comprado</p>
                <p className="text-lg font-bold text-gray-800">
                  {produtoSelecionado.vezesComprado}x
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Preço Médio</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatCurrency(produtoSelecionado.mediaPrecoUnitario)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Último Preço</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatCurrency(produtoSelecionado.ultimoPreco)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Quantidade Total</p>
                <p className="text-lg font-bold text-gray-800">
                  {produtoSelecionado.totalQuantidade.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Última Compra</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(produtoSelecionado.ultimaData)}
                </p>
              </div>
            </div>
          </div>

          {/* Price History Chart */}
          {chartData && chartData.labels.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Histórico de Preço (Média Mensal)
              </h3>
              <div className="h-64">
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) =>
                            `Preço médio: ${formatCurrency(ctx.raw as number)}`,
                        },
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (v) =>
                            `R$ ${(v as number).toFixed(2)}`,
                        },
                        grid: { color: "rgba(0,0,0,0.05)" },
                      },
                      x: {
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Establishment Comparison */}
          {produtoSelecionado.estabelecimentos.size > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Comparativo por Estabelecimento
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600 rounded-tl-lg">
                        Estabelecimento
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600">
                        Compras
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600">
                        Preço Médio
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600">
                        Último Preço
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600 rounded-tr-lg">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...produtoSelecionado.estabelecimentos.entries()]
                      .sort((a, b) => a[1].total / a[1].count - b[1].total / b[1].count)
                      .map(([estab, data], idx, arr) => {
                        const avg = data.total / data.count;
                        const isCheapest = idx === 0 && arr.length > 1;
                        const isMostExpensive =
                          idx === arr.length - 1 && arr.length > 1;
                        return (
                          <tr
                            key={estab}
                            className={`border-t border-gray-100 ${
                              isCheapest
                                ? "bg-green-50/50"
                                : isMostExpensive
                                ? "bg-red-50/30"
                                : ""
                            }`}
                          >
                            <td className="p-3 text-gray-800 font-medium">
                              <div className="flex items-center gap-2">
                                {estab}
                                {isCheapest && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                    Mais barato
                                  </span>
                                )}
                                {isMostExpensive && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                    Mais caro
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right text-gray-600">
                              {data.count}x
                            </td>
                            <td className="p-3 text-right font-medium text-gray-800">
                              {formatCurrency(avg)}
                            </td>
                            <td className="p-3 text-right text-gray-600">
                              {formatCurrency(data.ultimoPreco)}
                            </td>
                            <td className="p-3 text-right font-semibold text-gray-800">
                              {formatCurrency(data.total)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ranking */}
      {!produtoSelecionado && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Ranking header */}
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Ranking de Produtos
              <span className="text-sm font-normal text-gray-500">
                ({produtosFiltrados.length} produtos)
              </span>
            </h2>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs">
              {(
                [
                  { key: "gasto" as const, label: "Maior Gasto" },
                  { key: "frequencia" as const, label: "Mais Frequente" },
                  { key: "quantidade" as const, label: "Maior Qtd" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRankingOrder(opt.key)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    rankingOrder === opt.key
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product list */}
          <div className="divide-y divide-gray-100">
            {ranking.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">
                  Tente ajustar os filtros ou o período
                </p>
              </div>
            )}

            {ranking.map((p, idx) => {
              const maxValue =
                rankingOrder === "gasto"
                  ? ranking[0]?.totalGasto || 1
                  : rankingOrder === "frequencia"
                  ? ranking[0]?.vezesComprado || 1
                  : ranking[0]?.totalQuantidade || 1;

              const currentValue =
                rankingOrder === "gasto"
                  ? p.totalGasto
                  : rankingOrder === "frequencia"
                  ? p.vezesComprado
                  : p.totalQuantidade;

              const percentage = (currentValue / maxValue) * 100;

              return (
                <button
                  key={`${p.nome}-${idx}`}
                  onClick={() => {
                    setProdutoSelecionado(p);
                    setBusca(p.nome);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-full text-left p-4 hover:bg-green-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank number */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx < 3
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-green-700 transition-colors">
                          {p.nome}
                        </p>
                        <VariacaoBadge variacao={p.variacao} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{p.vezesComprado}x comprado</span>
                        <span>•</span>
                        <span>
                          Última: {formatDate(p.ultimaData)}
                        </span>
                        {p.categoria && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {p.categoria.nome}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Values */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">
                        {formatCurrency(p.totalGasto)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(p.mediaPrecoUnitario)}/un
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Show more hint */}
          {produtosFiltrados.length > 20 && (
            <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
              Mostrando os 20 primeiros de {produtosFiltrados.length} produtos.
              Use a busca para encontrar um produto específico.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
