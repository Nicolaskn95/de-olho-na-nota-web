'use client'

import { useState, useMemo } from 'react'

export interface CompraProduto {
  estabelecimento: string
  dataEmissao: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface ProdutoAgrupado {
  nome: string
  compras: CompraProduto[]
}

interface ModalTodosProdutosProps {
  open: boolean
  onClose: () => void
  produtos: ProdutoAgrupado[]
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

export function ModalTodosProdutos({
  open,
  onClose,
  produtos,
}: ModalTodosProdutosProps) {
  const [filtroNome, setFiltroNome] = useState('')

  const produtosFiltrados = useMemo(() => {
    if (!filtroNome.trim()) return produtos
    const termo = filtroNome.trim().toLowerCase()
    return produtos.filter((item) =>
      item.nome.toLowerCase().includes(termo),
    )
  }, [produtos, filtroNome])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Todos os produtos
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="Filtrar por nome do produto..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {produtosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum produto encontrado.
            </p>
          ) : (
            <ul className="space-y-4">
              {produtosFiltrados.map((item) => (
                <li
                  key={item.nome}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
                >
                  <p className="font-medium text-gray-800 mb-2">
                    {item.nome}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Comprado em {item.compras.length} nota
                    {item.compras.length !== 1 ? 's' : ''}:
                  </p>
                  <ul className="space-y-1.5 pl-2">
                    {item.compras.map((c, i) => (
                      <li
                        key={`${c.estabelecimento}-${c.dataEmissao}-${i}`}
                        className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1"
                      >
                        <span className="text-gray-700 font-medium">
                          {c.estabelecimento}
                        </span>
                        <span className="text-gray-500">
                          {formatarData(c.dataEmissao)}
                        </span>
                        <span className="text-gray-600">
                          {c.quantidade} {c.unidade} ·{' '}
                          {formatarMoeda(c.valorTotal)}
                          {c.unidade?.toUpperCase() === 'KG' && (
                            <span className="text-gray-500 ml-1">
                              ({formatarMoeda(c.valorUnitario)}/kg)
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
