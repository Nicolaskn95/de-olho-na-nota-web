"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, Edit2, Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { useSessionProfileColor } from "@/lib/profile-color";
import { getAuthHeaders } from "@/lib/auth-api";
import { MercadoHistorico, ItemLista, ListaComprasData, ProdutoApelido } from "@/interface/ListaCompras/IListaCompras";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function ListaCompras() {
  const { color, preset } = useSessionProfileColor();
  const secondaryColor = preset ? preset.secondaryHex : color;

  const [mercados, setMercados] = useState<MercadoHistorico[]>([]);
  const [selectedCnpj, setSelectedCnpj] = useState<string | null>(null);
  const [periodoMeses, setPeriodoMeses] = useState<number>(3);
  const [lista, setLista] = useState<ListaComprasData | null>(null);
  const [apelidos, setApelidos] = useState<ProdutoApelido[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMercados, setLoadingMercados] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [showChecked, setShowChecked] = useState<boolean>(true);
  
  const [apelidoModal, setApelidoModal] = useState<{ open: boolean, nomeOriginal: string, apelido: string }>({ open: false, nomeOriginal: '', apelido: '' });
  
  const [pendingChanges, setPendingChanges] = useState<{ index: number, comprado: boolean }[]>([]);
  const [changeCount, setChangeCount] = useState<number>(0);

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

  const loadExistingList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/lista-compras`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        
        // Restore pending changes from localStorage
        const storedPending = localStorage.getItem('lista_compras_pending');
        if (storedPending) {
          const parsedPending = JSON.parse(storedPending) as { index: number, comprado: boolean }[];
          
          parsedPending.forEach(change => {
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
        await loadMercados();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMercados = async () => {
    try {
      setLoadingMercados(true);
      const res = await fetch(`${API_URL}/lista-compras/mercados`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMercados(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMercados(false);
    }
  };

  useEffect(() => {
    fetchApelidos();
    loadExistingList();
  }, [fetchApelidos, loadExistingList]);

  // Sync batch changes
  const syncBatchChanges = useCallback(async (changes: { index: number, comprado: boolean }[]) => {
    if (changes.length === 0) return;
    try {
      await fetch(`${API_URL}/lista-compras/itens`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: changes })
      });
      localStorage.removeItem('lista_compras_pending');
      setPendingChanges([]);
      setChangeCount(0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (changeCount >= 10) {
      syncBatchChanges(pendingChanges);
    }
  }, [changeCount, pendingChanges, syncBatchChanges]);

  useEffect(() => {
    return () => {
      // Cleanup effect if we want to save pending changes when unmounting
    };
  }, []);

  const handleGerarLista = async () => {
    if (!selectedCnpj) return;
    try {
      setGenerating(true);
      const res = await fetch(`${API_URL}/lista-compras/gerar`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: selectedCnpj, periodoMeses })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.removeItem('lista_compras_pending');
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

  const formatCnpj = (cnpj: string) => cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const toggleItem = async (index: number) => {
    if (!lista) return;
    
    const newLista = { ...lista };
    const currentItem = newLista.itens[index];
    const novoComprado = !currentItem.comprado;
    
    currentItem.comprado = novoComprado;
    setLista(newLista);

    const newPending = [...pendingChanges];
    const existingIndex = newPending.findIndex(p => p.index === index);
    if (existingIndex >= 0) {
      newPending[existingIndex].comprado = novoComprado;
    } else {
      newPending.push({ index, comprado: novoComprado });
    }
    
    setPendingChanges(newPending);
    setChangeCount(c => c + 1);
    localStorage.setItem('lista_compras_pending', JSON.stringify(newPending));
  };

  const handleSaveApelido = async () => {
    try {
      const res = await fetch(`${API_URL}/lista-compras/apelidos`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeOriginal: apelidoModal.nomeOriginal, apelido: apelidoModal.apelido })
      });
      if (res.ok) {
        await fetchApelidos();
        setApelidoModal({ open: false, nomeOriginal: '', apelido: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getApelidoName = (nomeOriginal: string) => {
    const ap = apelidos.find(a => a.nomeOriginal === nomeOriginal);
    return ap ? ap.apelido : nomeOriginal;
  };

  const deleteList = async () => {
    try {
      if (pendingChanges.length > 0) {
        await syncBatchChanges(pendingChanges);
      }
      await fetch(`${API_URL}/lista-compras`, { method: 'DELETE', headers: getAuthHeaders() });
      setLista(null);
      localStorage.removeItem('lista_compras_pending');
      setPendingChanges([]);
      setChangeCount(0);
      loadMercados();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-green-600 mb-4" />
        <p className="text-gray-500 font-medium">Carregando...</p>
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
        <p className="mt-6 text-gray-500 font-medium">Gerando sua lista de compras...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <div className="mb-8">
        <h1 
          className="text-3xl font-bold flex items-center gap-3 mb-2"
          style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${color})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          <ClipboardList className="h-8 w-8" style={{ color }} />
          Lista de Compras
        </h1>
        <p className="text-gray-600">Gere sua lista de compras inteligente baseada no seu histórico de notas fiscais.</p>
      </div>

      {!lista ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Selecione o Estabelecimento</h2>
            
            {loadingMercados ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
            ) : mercados.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Nenhum histórico encontrado. Escaneie mais notas fiscais para gerar listas de compras!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mercados.map(m => (
                  <div 
                    key={m.cnpj}
                    onClick={() => setSelectedCnpj(m.cnpj)}
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${selectedCnpj === m.cnpj ? 'shadow-md scale-[1.02]' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{ borderColor: selectedCnpj === m.cnpj ? color : undefined }}
                  >
                    <h3 className="font-semibold text-gray-800 mb-1">{m.nomeDepara || m.nomeOriginal}</h3>
                    <p className="text-sm text-gray-500 mb-3">CNPJ: {formatCnpj(m.cnpj)}</p>
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg">
                      <span>{m.totalNotas} notas</span>
                      <span>{m.mesesDisponiveis} meses de hist.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mercados.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Analisar últimos {periodoMeses} meses</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map(m => (
                    <button
                      key={m}
                      onClick={() => setPeriodoMeses(m)}
                      className={`w-10 h-10 rounded-full font-medium transition-colors ${periodoMeses === m ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={{ backgroundColor: periodoMeses === m ? color : undefined }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleGerarLista}
                disabled={!selectedCnpj}
                className="w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1"
                style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${color})` }}
              >
                Gerar Lista
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <button
              onClick={deleteList}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Nova Lista
            </button>
            
            <button
              onClick={() => setShowChecked(!showChecked)}
              className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
            >
              {showChecked ? 'Ocultar comprados' : 'Mostrar comprados'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Estimativa Total</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(lista.estimativaTotal)}</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center opacity-20" style={{ backgroundColor: color }}>
                <span className="text-2xl" style={{ color: secondaryColor }}>💰</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Total de Itens</p>
                <p className="text-2xl font-bold text-gray-800">{lista.itens.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center opacity-20" style={{ backgroundColor: color }}>
                <span className="text-2xl" style={{ color: secondaryColor }}>📦</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 font-medium">Comprados</p>
                <p className="text-sm font-bold text-gray-800">{lista.itens.filter(i => i.comprado).length} / {lista.itens.length}</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${lista.itens.length > 0 ? (lista.itens.filter(i => i.comprado).length / lista.itens.length) * 100 : 0}%`, backgroundColor: color }}
                ></div>
              </div>
            </div>
          </div>

          {lista.itens.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-lg text-gray-600 font-medium">Nenhum produto recorrente encontrado.</p>
              <p className="text-gray-500 mt-2">Tente aumentar o período de análise ou selecionar outro mercado.</p>
            </div>
          ) : (
            <div className="notebook-container mt-8 max-w-2xl mx-auto">
              <div className="notebook-spiral">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="notebook-ring"></div>
                ))}
              </div>
              <div className="notebook-page">
                <div className="mb-6 border-b-2 border-gray-300 pb-2 flex justify-between items-end">
                  <h2 className="font-['Patrick_Hand'] text-3xl text-gray-800 tracking-wide">
                    {lista.nomeEstabelecimento}
                  </h2>
                  <span className="font-['Patrick_Hand'] text-lg text-gray-500">
                    {new Date(lista.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {lista.itens
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => showChecked || !item.comprado)
                    .map(({ item, index }) => {
                      const displayName = getApelidoName(item.nomeOriginal);
                      const hasApelido = displayName !== item.nomeOriginal;

                      return (
                        <div key={index} className={`notebook-item group ${item.comprado ? 'checked' : ''}`}>
                          <button 
                            className={`notebook-checkbox ${item.comprado ? 'checked' : ''}`}
                            onClick={() => toggleItem(index)}
                          >
                            <Check className="w-4 h-4 text-white opacity-0 transition-opacity" />
                          </button>
                          
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="item-text truncate cursor-pointer" onClick={() => toggleItem(index)}>
                              {displayName}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApelidoModal({ open: true, nomeOriginal: item.nomeOriginal, apelido: hasApelido ? displayName : '' });
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200/50 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[1.05rem] shrink-0 text-gray-500 item-text">
                            <span className="w-16 text-right">{item.quantidade} {item.unidade}</span>
                            <span className="w-24 text-right">{formatCurrency(item.valorEstimado)}</span>
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
                <button onClick={() => setApelidoModal({ open: false, nomeOriginal: '', apelido: '' })} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome Original na Nota</p>
                <p className="font-mono text-sm text-gray-700 break-words">{apelidoModal.nomeOriginal}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Como você chama este produto?</label>
                <input
                  type="text"
                  value={apelidoModal.apelido}
                  onChange={e => setApelidoModal(prev => ({ ...prev, apelido: e.target.value }))}
                  placeholder="Ex: Leite Integral, Arroz 5kg..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
              <button 
                onClick={() => setApelidoModal({ open: false, nomeOriginal: '', apelido: '' })}
                className="px-5 py-2 font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveApelido}
                disabled={!apelidoModal.apelido.trim()}
                className="px-5 py-2 font-bold text-white rounded-lg shadow-md disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${color})` }}
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
