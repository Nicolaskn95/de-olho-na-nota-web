"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/auth-api";
import type {
  GastosMensais,
  NotaFiscal,
} from "@/interface/NotaFiscal/INotaFiscal";
import type { Categoria, Prefixo } from "@/interface/Prefixo/IPrefixo";
import type { Produto } from "@/interface/Produto/IProduto";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getCategoriaProduto(
  nomeProduto: string,
  prefixos: Prefixo[],
): Categoria | null {
  const nomeUpper = nomeProduto.toUpperCase();
  const prefixosOrdenados = [...prefixos].sort(
    (a, b) => b.prefixo.length - a.prefixo.length,
  );

  for (const prefixo of prefixosOrdenados) {
    if (nomeUpper.startsWith(prefixo.prefixo.toUpperCase())) {
      return prefixo.categoria;
    }
  }

  return null;
}

export function Dashboard() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [prefixos, setPrefixos] = useState<Prefixo[]>([]);
  const [gastosPorMes, setGastosPorMes] = useState<GastosMensais[]>([]);
  const [mesSelecionado, setMesSelecionado] =
    useState<GastosMensais | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarDados() {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H1',location:'Dashboard.tsx:carregarDados:entry',message:'Fetching notas/prefixos',data:{apiUrl:API_URL,hasAuthHeader:Object.keys(getAuthHeaders()).includes('Authorization')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const [notasRes, prefixosRes] = await Promise.all([
        fetch(`${API_URL}/notas-fiscais`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/categorias/prefixos/listar`),
      ]);

      // #region agent log
      fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H1',location:'Dashboard.tsx:carregarDados:responses',message:'Fetch responses',data:{notasStatus:notasRes.status,prefixosStatus:prefixosRes.status,notasOk:notasRes.ok},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (!notasRes.ok) {
        throw new Error("Erro ao carregar notas fiscais.");
      }
      if (!prefixosRes.ok) {
        throw new Error("Erro ao carregar prefixos.");
      }

      const notasData = (await notasRes.json()) as NotaFiscal[];
      const prefixosData = (await prefixosRes.json()) as Prefixo[];

      // #region agent log
      fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H3',location:'Dashboard.tsx:carregarDados:parsed',message:'Parsed response JSON',data:{notasCount:Array.isArray(notasData)?notasData.length:-1,prefixosCount:Array.isArray(prefixosData)?prefixosData.length:-1},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      setNotas(notasData);
      setPrefixos(prefixosData);

      const mesesNomes = [
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

      const gastosMapa = new Map<string, GastosMensais>();
      for (const nota of notasData) {
        const data = new Date(nota.dataEmissao);
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const chave = `${ano}-${mes}`;

        if (!gastosMapa.has(chave)) {
          gastosMapa.set(chave, {
            mes: mesesNomes[mes],
            mesNumero: mes,
            ano,
            total: 0,
            notas: [],
          });
        }

        const gastos = gastosMapa.get(chave)!;
        gastos.total += nota.valorPago;
        gastos.notas.push(nota);
      }

      const gastosOrdenados = Array.from(gastosMapa.values()).sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano;
        return b.mesNumero - a.mesNumero;
      });

      setGastosPorMes(gastosOrdenados);
      setMesSelecionado(gastosOrdenados[0] ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  }

  const totalGeral = useMemo(
    () => notas.reduce((acc, nota) => acc + nota.valorPago, 0),
    [notas],
  );

  const mediaPorNota = useMemo(() => {
    if (notas.length === 0) return 0;
    return totalGeral / notas.length;
  }, [notas.length, totalGeral]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString("pt-BR");
  };

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Carregando notas fiscais...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-4xl mx-auto p-6">
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

  if (notas.length === 0 || !mesSelecionado) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Acompanhe seus gastos mensais</p>
        </header>
        <div className="bg-gray-50 text-gray-600 p-12 rounded-lg text-center">
          <p className="text-lg mb-2">Nenhuma nota fiscal encontrada</p>
          <p className="text-sm">Escaneie um cupom fiscal para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Acompanhe seus gastos mensais</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-sm text-green-700 mb-1">Total Geral</p>
          <p className="text-2xl font-bold text-green-800">
            {formatarMoeda(totalGeral)}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-sm text-blue-700 mb-1">Total de Notas</p>
          <p className="text-2xl font-bold text-blue-800">{notas.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
          <p className="text-sm text-purple-700 mb-1">Média por Nota</p>
          <p className="text-2xl font-bold text-purple-800">
            {formatarMoeda(mediaPorNota)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Gastos por Mês
          </h2>
          <div className="space-y-2">
            {gastosPorMes.map((gastos) => (
              <button
                key={`${gastos.ano}-${gastos.mesNumero}`}
                onClick={() => setMesSelecionado(gastos)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  mesSelecionado?.ano === gastos.ano &&
                  mesSelecionado?.mesNumero === gastos.mesNumero
                    ? "bg-green-100 border-2 border-green-500"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">
                      {gastos.mes} {gastos.ano}
                    </p>
                    <p className="text-sm text-gray-500">
                      {gastos.notas.length} nota
                      {gastos.notas.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-green-700">
                    {formatarMoeda(gastos.total)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Notas de {mesSelecionado.mes} {mesSelecionado.ano}
          </h2>

          <div className="space-y-4">
            {mesSelecionado.notas.map((nota) => (
              <div
                key={nota._id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-800">
                      {nota.estabelecimento}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatarData(nota.dataEmissao)} - Nota #{nota.numero}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-green-700">
                    {formatarMoeda(nota.valorPago)}
                  </p>
                </div>

                <details>
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                    Ver produtos ({nota.produtos.length})
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {nota.produtos.map((produto: Produto, idx: number) => {
                      const categoria = getCategoriaProduto(
                        produto.nome,
                        prefixos,
                      );
                      return (
                        <li
                          key={`${nota._id}-${idx}`}
                          className="flex justify-between items-start gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {produto.nome}
                            </p>
                            <p className="text-gray-500">
                              {produto.quantidade} {produto.unidade}
                            </p>
                          </div>
                          <div className="text-right">
                            {categoria ? (
                              <span className="inline-flex mb-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                {categoria.nome}
                              </span>
                            ) : null}
                            <p className="font-semibold text-gray-800">
                              {formatarMoeda(produto.valorTotal)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

