"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList,
  Edit2,
  Check,
  X,
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  Plus,
  Minus,
  Send,
  Store,
  History,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useSessionProfileColor } from "@/lib/profile-color";
import { getAuthHeaders } from "@/lib/auth-api";
import {
  MercadoHistorico,
  ItemRascunho,
  ListaComprasData,
  ProdutoApelido,
} from "@/interface/ListaCompras/IListaCompras";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const UNIDADES_DISPONIVEIS = ["UN", "KG", "G", "L", "ML", "PCT", "CX", "LATA", "BJ", "FD", "DZ"];

export function ListaCompras() {
  const { color, preset } = useSessionProfileColor();
  const secondaryColor = preset ? preset.secondaryHex : color;

  const [mercados, setMercados] = useState<MercadoHistorico[]>([]);
  const [selectedCnpj, setSelectedCnpj] = useState<string | null>(null);
  const [periodoMeses, setPeriodoMeses] = useState<number>(3);
  const [lista, setLista] = useState<ListaComprasData | null>(null);
  const [apelidos, setApelidos] = useState<ProdutoApelido[]>([]);

  // Mode: 'voz' (default for building list as things run out) or 'recorrencia'
  const [modoCriacao, setModoCriacao] = useState<"voz" | "recorrencia">("voz");

  // Draft (rascunho) state persisted in MongoDB
  const [rascunhoItens, setRascunhoItens] = useState<ItemRascunho[]>([]);
  const [incluirSugestoesRecorrentes, setIncluirSugestoesRecorrentes] = useState<boolean>(false);

  // Voice & NLP state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [textoComandoVoz, setTextoComandoVoz] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [processandoVoz, setProcessandoVoz] = useState<boolean>(false);
  const [vozFeedback, setVozFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [suportaReconhecimentoVoz, setSuportaReconhecimentoVoz] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMercados, setLoadingMercados] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [showChecked, setShowChecked] = useState<boolean>(true);

  const [apelidoModal, setApelidoModal] = useState<{
    open: boolean;
    nomeOriginal: string;
    apelido: string;
  }>({ open: false, nomeOriginal: "", apelido: "" });

  const [pendingChanges, setPendingChanges] = useState<{ index: number; comprado: boolean }[]>([]);
  const [changeCount, setChangeCount] = useState<number>(0);

  // Check browser Web Speech API support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSuportaReconhecimentoVoz(false);
      }
    }
  }, []);

  const fetchApelidos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/lista-compras/apelidos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setApelidos(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRascunho = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/lista-compras/rascunho`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRascunhoItens(Array.isArray(data?.itens) ? data.itens : []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadMercados = useCallback(async () => {
    try {
      setLoadingMercados(true);
      const res = await fetch(`${API_URL}/lista-compras/mercados`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMercados(data);
        if (data.length > 0 && !selectedCnpj) {
          setSelectedCnpj(data[0].cnpj);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMercados(false);
    }
  }, [selectedCnpj]);

  const loadExistingList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/lista-compras`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();

        const storedPending = localStorage.getItem("lista_compras_pending");
        if (storedPending) {
          const parsedPending = JSON.parse(storedPending) as {
            index: number;
            comprado: boolean;
          }[];

          parsedPending.forEach((change) => {
            if (data.itens[change.index]) {
              data.itens[change.index].comprado = change.comprado;
            }
          });

          setPendingChanges(parsedPending);
          setChangeCount(parsedPending.length);
        }

        setLista(data);
      } else if (res.status === 404) {
        setLista(null);
        await Promise.all([loadMercados(), fetchRascunho()]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadMercados, fetchRascunho]);

  useEffect(() => {
    fetchApelidos();
    loadExistingList();
  }, [fetchApelidos, loadExistingList]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Sync batch changes
  const syncBatchChanges = useCallback(
    async (changes: { index: number; comprado: boolean }[]) => {
      if (changes.length === 0) return;
      try {
        await fetch(`${API_URL}/lista-compras/itens`, {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ itens: changes }),
        });
        localStorage.removeItem("lista_compras_pending");
        setPendingChanges([]);
        setChangeCount(0);
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  useEffect(() => {
    if (changeCount >= 10) {
      syncBatchChanges(pendingChanges);
    }
  }, [changeCount, pendingChanges, syncBatchChanges]);

  // ==================== COMANDO DE VOZ (WEB SPEECH API + PLN) ====================

  const enviarTextoComandoVoz = useCallback(
    async (textoParaEnviar: string, naListaAtiva = false) => {
      const limpo = textoParaEnviar.trim();
      if (!limpo) return;

      try {
        setProcessandoVoz(true);
        setVozFeedback(null);

        const endpoint = naListaAtiva
          ? `${API_URL}/lista-compras/voz-ativa`
          : `${API_URL}/lista-compras/rascunho/voz`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ textoFalado: limpo }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.message || "Não conseguimos identificar os produtos nesse comando."
          );
        }

        const data = await res.json();

        if (naListaAtiva) {
          setLista(data);
          setVozFeedback({
            tipo: "sucesso",
            msg: "Itens adicionados e vinculados com o histórico do mercado!",
          });
        } else {
          if (data?.rascunho?.itens) {
            setRascunhoItens(data.rascunho.itens);
          }
          const qtdExtraidos = Array.isArray(data?.itensExtraidos)
            ? data.itensExtraidos.length
            : 1;
          const resumoExtraidos = Array.isArray(data?.itensExtraidos)
            ? data.itensExtraidos
                .map((i: ItemRascunho) => `${i.quantidade} ${i.unidade} ${i.termoFalado}`)
                .join(", ")
            : "";

          setVozFeedback({
            tipo: "sucesso",
            msg: `${qtdExtraidos} item(ns) anotado(s): ${resumoExtraidos}`,
          });
        }

        setTextoComandoVoz("");
        setInterimTranscript("");
      } catch (err: any) {
        setVozFeedback({
          tipo: "erro",
          msg: err?.message || "Erro ao processar comando de voz.",
        });
      } finally {
        setProcessandoVoz(false);
      }
    },
    []
  );

  const toggleMicrofone = (naListaAtiva = false) => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      const textoFinal = `${textoComandoVoz} ${interimTranscript}`.trim();
      if (textoFinal) {
        enviarTextoComandoVoz(textoFinal, naListaAtiva);
      }
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSuportaReconhecimentoVoz(false);
      setVozFeedback({
        tipo: "erro",
        msg: "Seu navegador não suporta captura direta de microfone. Digite ou use o microfone do teclado!",
      });
      return;
    }

    setVozFeedback(null);
    setInterimTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let acumuladoSessao = textoComandoVoz ? `${textoComandoVoz} ` : "";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let provisorio = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          acumuladoSessao += transcript + ", ";
          setTextoComandoVoz(acumuladoSessao.trim());
        } else {
          provisorio += transcript;
        }
      }
      setInterimTranscript(provisorio);
    };

    recognition.onerror = (event: any) => {
      console.warn("SpeechRecognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        setVozFeedback({
          tipo: "erro",
          msg: "Permissão de microfone negada. Habilite o microfone no navegador.",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ==================== MANIPULAÇÃO DO RASCUNHO ====================

  const salvarRascunhoNoBackend = async (novosItens: ItemRascunho[]) => {
    setRascunhoItens(novosItens);
    try {
      await fetch(`${API_URL}/lista-compras/rascunho`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ itens: novosItens }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const alterarQuantidadeRascunho = (index: number, delta: number) => {
    const copia = [...rascunhoItens];
    const atual = copia[index];
    if (!atual) return;
    const novaQtd = Number(Math.max(0.5, atual.quantidade + delta).toFixed(2));
    copia[index] = { ...atual, quantidade: novaQtd };
    salvarRascunhoNoBackend(copia);
  };

  const alterarUnidadeRascunho = (index: number, novaUnidade: string) => {
    const copia = [...rascunhoItens];
    if (!copia[index]) return;
    copia[index] = { ...copia[index], unidade: novaUnidade };
    salvarRascunhoNoBackend(copia);
  };

  const removerItemRascunho = (index: number) => {
    const copia = rascunhoItens.filter((_, i) => i !== index);
    salvarRascunhoNoBackend(copia);
  };

  const limparTodoRascunho = async () => {
    setRascunhoItens([]);
    try {
      await fetch(`${API_URL}/lista-compras/rascunho`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ==================== GERAR LISTA (RAG OU RECORRÊNCIA) ====================

  const handleProcessarRagNoMercado = async () => {
    if (!selectedCnpj || rascunhoItens.length === 0) return;
    try {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      setGenerating(true);
      const res = await fetch(`${API_URL}/lista-compras/processar-rag`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: selectedCnpj,
          incluirSugestoesRecorrentes,
          periodoMeses,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.removeItem("lista_compras_pending");
        setPendingChanges([]);
        setChangeCount(0);
        setRascunhoItens([]);
        setLista(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGerarListaRecorrencia = async () => {
    if (!selectedCnpj) return;
    try {
      setGenerating(true);
      const res = await fetch(`${API_URL}/lista-compras/gerar`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: selectedCnpj, periodoMeses }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.removeItem("lista_compras_pending");
        setPendingChanges([]);
        setChangeCount(0);
        setLista(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const formatCnpj = (cnpj: string) =>
    cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const toggleItem = async (index: number) => {
    if (!lista) return;

    const newLista = { ...lista };
    const currentItem = newLista.itens[index];
    const novoComprado = !currentItem.comprado;

    currentItem.comprado = novoComprado;
    setLista(newLista);

    const newPending = [...pendingChanges];
    const existingIndex = newPending.findIndex((p) => p.index === index);
    if (existingIndex >= 0) {
      newPending[existingIndex].comprado = novoComprado;
    } else {
      newPending.push({ index, comprado: novoComprado });
    }

    setPendingChanges(newPending);
    setChangeCount((c) => c + 1);
    localStorage.setItem("lista_compras_pending", JSON.stringify(newPending));
  };

  const handleSaveApelido = async () => {
    try {
      const res = await fetch(`${API_URL}/lista-compras/apelidos`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeOriginal: apelidoModal.nomeOriginal,
          apelido: apelidoModal.apelido,
        }),
      });
      if (res.ok) {
        await fetchApelidos();
        setApelidoModal({ open: false, nomeOriginal: "", apelido: "" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getApelidoName = (nomeOriginal: string) => {
    const ap = apelidos.find((a) => a.nomeOriginal === nomeOriginal);
    return ap ? ap.apelido : null;
  };

  const deleteList = async () => {
    try {
      if (pendingChanges.length > 0) {
        await syncBatchChanges(pendingChanges);
      }
      await fetch(`${API_URL}/lista-compras`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setLista(null);
      localStorage.removeItem("lista_compras_pending");
      setPendingChanges([]);
      setChangeCount(0);
      await Promise.all([loadMercados(), fetchRascunho()]);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-green-600 mb-4" />
        <p className="text-gray-500 font-medium">Carregando sua lista de compras...</p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="book-loader">
          <div>
            <ul>
              {[...Array(6)].map((_, i) => (
                <li key={i}>
                  <svg viewBox="0 0 90 120" fill="currentColor">
                    <rect width="90" height="120" rx="4" />
                  </svg>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-gray-700 font-semibold text-lg">
          Processando produtos no histórico do mercado com IA (RAG)...
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Relacionando os itens que você falou com os produtos cadastrados nas suas notas fiscais.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold flex items-center gap-3 mb-2"
          style={{
            background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          <ClipboardList className="h-8 w-8" style={{ color }} />
          Lista de Compras Inteligente
        </h1>
        <p className="text-gray-600">
          Vá falando os produtos conforme acabam em casa e processe tudo no mercado escolhido usando IA (PLN + RAG).
        </p>
      </div>

      {!lista ? (
        <div className="space-y-6">
          {/* Seletor de Modo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200">
            <button
              onClick={() => setModoCriacao("voz")}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                modoCriacao === "voz"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Mic className="w-4 h-4" style={{ color: modoCriacao === "voz" ? color : undefined }} />
              Montar por Voz (Conforme Acaba)
              {rascunhoItens.length > 0 && (
                <span
                  className="px-2 py-0.5 text-xs rounded-full text-white font-bold"
                  style={{ backgroundColor: color }}
                >
                  {rascunhoItens.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setModoCriacao("recorrencia")}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                modoCriacao === "recorrencia"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <History
                className="w-4 h-4"
                style={{ color: modoCriacao === "recorrencia" ? color : undefined }}
              />
              Sugerir apenas por Recorrência
            </button>
          </div>

          {modoCriacao === "voz" && (
            <>
              {/* Card de Comando de Voz (PLN) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Botão Microfone Pulsante */}
                  <div className="flex flex-col items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleMicrofone(false)}
                      disabled={processandoVoz}
                      className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${
                        isListening
                          ? "scale-105 ring-8 ring-red-500/20 bg-red-500 hover:bg-red-600"
                          : "hover:scale-105"
                      }`}
                      style={{
                        background: isListening
                          ? undefined
                          : `linear-gradient(135deg, ${secondaryColor}, ${color})`,
                      }}
                      title={isListening ? "Toque para finalizar e adicionar" : "Toque para falar"}
                    >
                      {isListening && (
                        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></span>
                      )}
                      {processandoVoz ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                      ) : isListening ? (
                        <MicOff className="w-10 h-10 relative z-10" />
                      ) : (
                        <Mic className="w-10 h-10 relative z-10" />
                      )}
                    </button>
                    <span className="mt-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {isListening
                        ? "Ouvindo... Toque p/ concluir"
                        : processandoVoz
                        ? "Extraindo com PLN..."
                        : "Toque para falar"}
                    </span>
                  </div>

                  {/* Área de Transcrição / Digitação */}
                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color }} />
                        Fale os itens que estão acabando
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ex:{" "}
                        <span className="italic text-gray-600">
                          &ldquo;adicionar 3 limões, 1 kilo de carne moída, azeite, 1 macarrão
                          penne, 1 sal&rdquo;
                        </span>
                      </p>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={2}
                        value={
                          isListening && interimTranscript
                            ? `${textoComandoVoz} ${interimTranscript}`.trim()
                            : textoComandoVoz
                        }
                        onChange={(e) => setTextoComandoVoz(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            enviarTextoComandoVoz(textoComandoVoz, false);
                          }
                        }}
                        placeholder="Aperte o microfone e fale, ou digite aqui os itens separados por vírgula..."
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-14 text-sm text-gray-800 focus:outline-none focus:border-green-500 transition-colors resize-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          enviarTextoComandoVoz(
                            `${textoComandoVoz} ${interimTranscript}`.trim(),
                            false
                          )
                        }
                        disabled={
                          processandoVoz ||
                          (!textoComandoVoz.trim() && !interimTranscript.trim())
                        }
                        className="absolute right-3 bottom-3 p-2.5 rounded-lg text-white shadow-sm disabled:opacity-40 transition-all hover:opacity-90"
                        style={{
                          background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
                        }}
                        title="Processar comando (PLN)"
                      >
                        {processandoVoz ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {!suportaReconhecimentoVoz && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Dica: Use o ícone de microfone do teclado do celular ou digite os itens acima.
                      </p>
                    )}

                    {vozFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
                          vozFeedback.tipo === "sucesso"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span>{vozFeedback.msg}</span>
                        <button
                          onClick={() => setVozFeedback(null)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Rascunho Acumulada */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Itens Anotados na Pré-Lista ({rascunhoItens.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Salvos automaticamente na sua conta conforme você vai falando ao longo da
                      semana.
                    </p>
                  </div>
                  {rascunhoItens.length > 0 && (
                    <button
                      onClick={limparTodoRascunho}
                      className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
                    </button>
                  )}
                </div>

                {rascunhoItens.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
                    <Mic className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium text-sm">
                      Sua pré-lista ainda está vazia.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Toque no botão de microfone acima e diga o que acabou em casa!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {rascunhoItens.map((item, idx) => (
                      <div
                        key={`${item.termoFalado}-${idx}`}
                        className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-800 truncate">
                            {item.termoFalado}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                            <button
                              type="button"
                              onClick={() => alterarQuantidadeRascunho(idx, -1)}
                              className="p-1.5 text-gray-600 hover:text-gray-900"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-sm font-bold text-gray-800 min-w-[2.5rem] text-center">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => alterarQuantidadeRascunho(idx, 1)}
                              className="p-1.5 text-gray-600 hover:text-gray-900"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <select
                            value={item.unidade}
                            onChange={(e) => alterarUnidadeRascunho(idx, e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none"
                          >
                            {UNIDADES_DISPONIVEIS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => removerItemRascunho(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Seleção do Mercado para Processar a Lista */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1 text-gray-800 flex items-center gap-2">
              <Store className="w-5 h-5" style={{ color }} />
              {modoCriacao === "voz"
                ? "Em qual mercado você vai comprar?"
                : "Selecione o Estabelecimento"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {modoCriacao === "voz"
                ? "O motor RAG buscará no histórico deste mercado qual produto cadastrado corresponde a cada item que você falou."
                : "Analisaremos suas notas fiscais deste estabelecimento para sugerir itens frequentes."}
            </p>

            {loadingMercados ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : mercados.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  Nenhum histórico de mercado encontrado. Escaneie notas fiscais para habilitar o
                  vínculo com mercados!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mercados.map((m) => (
                  <div
                    key={m.cnpj}
                    onClick={() => setSelectedCnpj(m.cnpj)}
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
                      selectedCnpj === m.cnpj
                        ? "shadow-md scale-[1.01] bg-gray-50/40"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{ borderColor: selectedCnpj === m.cnpj ? color : undefined }}
                  >
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {m.nomeDepara || m.nomeOriginal}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">CNPJ: {formatCnpj(m.cnpj)}</p>
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg">
                      <span>{m.totalNotas} notas</span>
                      <span>{m.mesesDisponiveis} meses de hist.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mercados.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                {modoCriacao === "voz" ? (
                  <>
                    <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={incluirSugestoesRecorrentes}
                        onChange={(e) => setIncluirSugestoesRecorrentes(e.target.checked)}
                        className="w-4 h-4 rounded text-green-600 focus:ring-0"
                      />
                      <span>
                        Incluir também produtos recorrentes deste mercado que não citei por voz
                      </span>
                    </label>

                    <button
                      onClick={handleProcessarRagNoMercado}
                      disabled={!selectedCnpj || rascunhoItens.length === 0}
                      className="w-full md:w-auto px-7 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
                      }}
                    >
                      <Sparkles className="w-5 h-5" />
                      Processar Lista no Mercado (RAG)
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Analisar últimos {periodoMeses} meses
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5, 6].map((m) => (
                          <button
                            key={m}
                            onClick={() => setPeriodoMeses(m)}
                            className={`w-10 h-10 rounded-full font-medium transition-colors ${
                              periodoMeses === m
                                ? "text-white shadow-sm"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            style={{
                              backgroundColor: periodoMeses === m ? color : undefined,
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGerarListaRecorrencia}
                      disabled={!selectedCnpj}
                      className="w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1"
                      style={{
                        background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
                      }}
                    >
                      Gerar Lista por Recorrência
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <button
              onClick={deleteList}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Nova Lista / Voltar
            </button>

            <button
              onClick={() => setShowChecked(!showChecked)}
              className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
            >
              {showChecked ? "Ocultar comprados" : "Mostrar comprados"}
            </button>
          </div>

          {/* Barra rápida para adicionar mais itens por voz na lista já gerada */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => toggleMicrofone(true)}
              disabled={processandoVoz}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 shadow transition-all ${
                isListening ? "bg-red-500 animate-pulse" : ""
              }`}
              style={{
                background: isListening
                  ? undefined
                  : `linear-gradient(135deg, ${secondaryColor}, ${color})`,
              }}
              title="Falar mais itens para esta lista"
            >
              {processandoVoz ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={
                isListening && interimTranscript
                  ? `${textoComandoVoz} ${interimTranscript}`.trim()
                  : textoComandoVoz
              }
              onChange={(e) => setTextoComandoVoz(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  enviarTextoComandoVoz(textoComandoVoz, true);
                }
              }}
              placeholder="Esqueceu algo? Toque no microfone ou digite: ex. 'adicionar 2 leites e 1 café'..."
              className="flex-1 w-full text-sm border border-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-green-500"
            />

            <button
              type="button"
              onClick={() =>
                enviarTextoComandoVoz(
                  `${textoComandoVoz} ${interimTranscript}`.trim(),
                  true
                )
              }
              disabled={
                processandoVoz || (!textoComandoVoz.trim() && !interimTranscript.trim())
              }
              className="px-4 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm disabled:opacity-40 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
              }}
            >
              Adicionar c/ RAG
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Estimativa Total</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(lista.estimativaTotal)}
                </p>
              </div>
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center opacity-20"
                style={{ backgroundColor: color }}
              >
                <span className="text-2xl" style={{ color: secondaryColor }}>
                  💰
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Total de Itens</p>
                <p className="text-2xl font-bold text-gray-800">{lista.itens.length}</p>
              </div>
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center opacity-20"
                style={{ backgroundColor: color }}
              >
                <span className="text-2xl" style={{ color: secondaryColor }}>
                  📦
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 font-medium">Comprados</p>
                <p className="text-sm font-bold text-gray-800">
                  {lista.itens.filter((i) => i.comprado).length} / {lista.itens.length}
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      lista.itens.length > 0
                        ? (lista.itens.filter((i) => i.comprado).length / lista.itens.length) *
                          100
                        : 0
                    }%`,
                    backgroundColor: color,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {lista.itens.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-lg text-gray-600 font-medium">Nenhum produto encontrado.</p>
              <p className="text-gray-500 mt-2">
                Adicione itens usando o microfone acima ou tente selecionar outro mercado.
              </p>
            </div>
          ) : (
            <div className="notebook-container mt-8 max-w-3xl mx-auto">
              <div className="notebook-spiral">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="notebook-ring"></div>
                ))}
              </div>
              <div className="notebook-page">
                <div className="mb-6 border-b-2 border-gray-300 pb-2 flex justify-between items-end">
                  <div>
                    <h2 className="font-['Patrick_Hand'] text-3xl text-gray-800 tracking-wide">
                      {lista.nomeEstabelecimento}
                    </h2>
                    <p className="text-xs text-gray-500 font-sans">
                      Produto falado por você <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                      Produto relacionado cadastrado no mercado
                    </p>
                  </div>
                  <span className="font-['Patrick_Hand'] text-lg text-gray-500">
                    {new Date(lista.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {lista.itens
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => showChecked || !item.comprado)
                    .map(({ item, index }) => {
                      const apelidoSalvo = getApelidoName(item.nomeOriginal);
                      const nomeFaladoOuPrincipal =
                        apelidoSalvo || item.termoFalado || item.nome;
                      const nomeCadastradoMercado =
                        item.nomeMercado ||
                        (item.origemMatch !== "SEM_HISTORICO" ? item.nomeOriginal : null);

                      return (
                        <div
                          key={index}
                          className={`notebook-item group flex-wrap sm:flex-nowrap py-2 ${
                            item.comprado ? "checked" : ""
                          }`}
                        >
                          <button
                            className={`notebook-checkbox shrink-0 ${
                              item.comprado ? "checked" : ""
                            }`}
                            onClick={() => toggleItem(index)}
                          >
                            <Check className="w-4 h-4 text-white opacity-0 transition-opacity" />
                          </button>

                          {/* Coluna Central: O que o usuário disse + Do lado o nome cadastrado no mercado */}
                          <div
                            className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 cursor-pointer"
                            onClick={() => toggleItem(index)}
                          >
                            <span className="item-text font-semibold text-gray-900 truncate">
                              {nomeFaladoOuPrincipal}
                            </span>

                            {nomeCadastradoMercado ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono tracking-tight border max-w-full truncate ${
                                  item.origemMatch === "OUTRO_MERCADO"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                                title={
                                  item.origemMatch === "OUTRO_MERCADO"
                                    ? `Referência de outro mercado: ${item.estabelecimentoOrigem}`
                                    : `Cadastrado no mercado: ${nomeCadastradoMercado}`
                                }
                              >
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span className="truncate">{nomeCadastradoMercado}</span>
                                {item.origemMatch === "OUTRO_MERCADO" &&
                                  item.estabelecimentoOrigem && (
                                    <span className="text-[10px] font-sans font-semibold opacity-75 shrink-0">
                                      ({item.estabelecimentoOrigem})
                                    </span>
                                  )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-sans bg-gray-100 text-gray-500 border border-gray-200 w-fit">
                                Sem histórico neste mercado
                              </span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApelidoModal({
                                  open: true,
                                  nomeOriginal: item.nomeOriginal,
                                  apelido: apelidoSalvo || item.termoFalado || "",
                                });
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200/50 rounded w-fit"
                              title="Renomear apelido"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-[1rem] shrink-0 text-gray-600 item-text ml-auto">
                            <span className="w-16 text-right font-medium">
                              {item.quantidade} {item.unidade}
                            </span>
                            <span className="w-24 text-right font-semibold">
                              {item.valorEstimado > 0
                                ? formatCurrency(item.valorEstimado)
                                : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {apelidoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Renomear Produto</h3>
                <button
                  onClick={() =>
                    setApelidoModal({ open: false, nomeOriginal: "", apelido: "" })
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Nome Cadastrado na Nota do Mercado
                </p>
                <p className="font-mono text-sm text-gray-700 break-words">
                  {apelidoModal.nomeOriginal}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Como você chama este produto?
                </label>
                <input
                  type="text"
                  value={apelidoModal.apelido}
                  onChange={(e) =>
                    setApelidoModal((prev) => ({ ...prev, apelido: e.target.value }))
                  }
                  placeholder="Ex: Leite Integral, Macarrão Penne..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() =>
                  setApelidoModal({ open: false, nomeOriginal: "", apelido: "" })
                }
                className="px-5 py-2 font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApelido}
                disabled={!apelidoModal.apelido.trim()}
                className="px-5 py-2 font-bold text-white rounded-lg shadow-md disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${secondaryColor}, ${color})`,
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
