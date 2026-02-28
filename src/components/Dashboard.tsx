"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Produto {
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

interface NotaFiscal {
  _id: string;
  chaveAcesso: string;
  numero: string;
  dataEmissao: string;
  estabelecimento: string;
  valorTotal: number;
  valorPago: number;
  produtos: Produto[];
}

interface GastosMensais {
  mes: string;
  mesNumero: number;
  ano: number;
  total: number;
  notas: NotaFiscal[];
}

export function Dashboard() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [gastosPorMes, setGastosPorMes] = useState<GastosMensais[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<GastosMensais | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = async () => {
    try {
      const response = await fetch(`${API_URL}/notas-fiscais`);
      if (!response.ok) {
        throw new Error("Erro ao carregar notas fiscais");
      }
      const data: NotaFiscal[] = await response.json();
      setNotas(data);
      calcularGastosPorMes(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  };

  const calcularGastosPorMes = (notas: NotaFiscal[]) => {
    const gastosMapa = new Map<string, GastosMensais>();

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

    for (const nota of notas) {
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

    if (gastosOrdenados.length > 0 && !mesSelecionado) {
      setMesSelecionado(gastosOrdenados[0]);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

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
            onClick={carregarNotas}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (notas.length === 0) {
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

  const totalGeral = notas.reduce((acc, nota) => acc + nota.valorPago, 0);

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
            {formatarMoeda(totalGeral / notas.length)}
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
          {mesSelecionado && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Notas de {mesSelecionado.mes} {mesSelecionado.ano}
              </h2>
              <div className="space-y-4">
                {mesSelecionado.notas.map((nota) => (
                  <div
                    key={nota._id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
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

                    {nota.produtos.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                          Ver {nota.produtos.length} produto
                          {nota.produtos.length !== 1 ? "s" : ""}
                        </summary>
                        <ul className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                          {nota.produtos.map((produto, idx) => (
                            <li
                              key={idx}
                              className="text-sm flex justify-between"
                            >
                              <span className="text-gray-600">
                                {produto.quantidade} {produto.unidade} -{" "}
                                {produto.nome}
                              </span>
                              <span className="text-gray-800 font-medium">
                                {formatarMoeda(produto.valorTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
