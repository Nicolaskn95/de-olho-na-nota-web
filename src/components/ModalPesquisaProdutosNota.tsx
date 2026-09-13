'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAuthHeaders } from '@/lib/auth-api'
import { Categoria, Prefixo } from '@/interface/Prefixo/IPrefixo'
import { NotaFiscal } from '@/interface/NotaFiscal/INotaFiscal'
import { Search, ShoppingBag, Calendar, Store, Tag, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Loader } from '@/components/Loader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ProdutoEncontrado {
  nome: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
  estabelecimento: string
  dataEmissao: string
  notaId: string
  numeroNota: string
}

interface ModalPesquisaProdutosNotaProps {
  open: boolean
  onClose: () => void
  prefixo: Prefixo | null
  categoria?: Categoria | null
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(dataStr: string) {
  return new Date(dataStr).toLocaleDateString('pt-BR')
}

export function ModalPesquisaProdutosNota({
  open,
  onClose,
  prefixo,
  categoria,
}: ModalPesquisaProdutosNotaProps) {
  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [filtroTexto, setFiltroTexto] = useState('')

  useEffect(() => {
    if (open) {
      carregarNotas()
    }
  }, [open])

  const carregarNotas = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch(`${API_URL}/notas-fiscais`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error('Erro ao buscar notas fiscais')
      }
      const data: NotaFiscal[] = await res.json()
      setNotas(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar notas fiscais')
    } finally {
      setCarregando(false)
    }
  }

  const produtosEncontrados = useMemo(() => {
    if (!prefixo && !categoria) return []
    const resultado: ProdutoEncontrado[] = []
    const siglaPrefixo = prefixo?.prefixo?.toUpperCase().trim() || ''

    for (const nota of notas) {
      for (const p of nota.produtos || []) {
        if (!p || !p.nome) continue
        const nomeUpper = p.nome.toUpperCase().trim()

        const correspondePrefixo =
          siglaPrefixo && nomeUpper.startsWith(siglaPrefixo)

        if (correspondePrefixo) {
          resultado.push({
            nome: p.nome,
            quantidade: p.quantidade,
            unidade: p.unidade,
            valorUnitario: p.valorUnitario,
            valorTotal: p.valorTotal,
            estabelecimento: nota.estabelecimento,
            dataEmissao: nota.dataEmissao,
            notaId: nota._id,
            numeroNota: nota.numero,
          })
        }
      }
    }

    return resultado.sort(
      (a, b) =>
        new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime(),
    )
  }, [notas, prefixo, categoria])

  const produtosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return produtosEncontrados
    const termo = filtroTexto.toLowerCase().trim()
    return produtosEncontrados.filter(
      (item) =>
        item.nome.toLowerCase().includes(termo) ||
        item.estabelecimento.toLowerCase().includes(termo),
    )
  }, [produtosEncontrados, filtroTexto])

  const totalGasto = useMemo(() => {
    return produtosEncontrados.reduce((acc, p) => acc + p.valorTotal, 0)
  }, [produtosEncontrados])

  if (!open) return null

  const catAtual = prefixo?.categoria || categoria

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl shadow-xs"
              style={{
                backgroundColor: catAtual?.cor
                  ? `${catAtual.cor}15`
                  : '#ECFDF5',
                color: catAtual?.cor || '#059669',
              }}
            >
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Produtos com o Prefixo &quot;{prefixo?.prefixo}&quot;
                {catAtual && (
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium border"
                    style={{
                      backgroundColor: `${catAtual.cor}20`,
                      borderColor: catAtual.cor,
                      color: catAtual.cor,
                    }}
                  >
                    {catAtual.nome}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Busca de produtos cadastrados nas notas fiscais físicas do seu histórico.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Campo de Busca Interno */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por nome do produto ou mercado..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>

          <Link
            href="/notasfiscais"
            className="px-3 py-2 text-xs font-medium text-green-800 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Ver Notas Fiscais</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carregando ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <Loader className="mb-3" size="sm" />
              Buscando produtos nas notas fiscais...
            </div>
          ) : erro ? (
            <div className="p-4 bg-red-50 text-red-700 text-center rounded-xl">
              {erro}
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
              <Tag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">
                Nenhum produto encontrado nas notas fiscais com este prefixo.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ao escanear cupons fiscais com produtos começando por &quot;{prefixo?.prefixo}&quot;, eles aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            produtosFiltrados.map((item, idx) => (
              <div
                key={`${item.notaId}-${idx}`}
                className="p-3.5 bg-white border border-gray-200 hover:border-green-400 rounded-xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <span className="font-bold text-gray-800 text-sm block">
                    {item.nome}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                      <Store className="w-3.5 h-3.5 text-gray-400" />
                      {item.estabelecimento}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatarData(item.dataEmissao)}
                    </span>
                    {item.numeroNota && (
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-mono text-[10px]">
                        Nota #{item.numeroNota}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right sm:border-l sm:pl-4 border-gray-100">
                  <span className="text-xs text-gray-500 block">
                    {item.quantidade} {item.unidade} x {formatarMoeda(item.valorUnitario)}
                  </span>
                  <span className="font-extrabold text-green-700 text-base">
                    {formatarMoeda(item.valorTotal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
