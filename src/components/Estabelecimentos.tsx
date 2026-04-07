'use client'

import { EstabelecimentoItem } from '@/interface/Estabelecimento/IEstabelecimento'
import { getAccessToken, getAuthHeaders } from '@/lib/auth-api'
import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function Estabelecimentos() {
  const [lista, setLista] = useState<EstabelecimentoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [editando, setEditando] = useState<EstabelecimentoItem | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const token = getAccessToken()
      if (!token) throw new Error('Faça login novamente.')
      const res = await fetch(`${API_URL}/notas-fiscais/estabelecimentos`, {
        headers: { ...getAuthHeaders() },
      })
      if (!res.ok) throw new Error('Erro ao carregar estabelecimentos')
      const data = await res.json()
      setLista(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const nomeExibicaoAtual = (item: EstabelecimentoItem) =>
    item.nomeDepara?.trim() || item.nomeOriginal || ''

  const abrirEdicao = (item: EstabelecimentoItem) => {
    setEditando(item)
    setNomeEditado(nomeExibicaoAtual(item))
    setErro(null)
    setSucesso(null)
  }

  const fecharEdicao = () => {
    setEditando(null)
    setNomeEditado('')
  }

  const salvarNome = async () => {
    if (!editando || !nomeEditado.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      const cnpjEncoded = encodeURIComponent(editando.cnpj)
      const res = await fetch(
        `${API_URL}/notas-fiscais/estabelecimentos/${cnpjEncoded}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ nomeDepara: nomeEditado.trim() }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Erro ${res.status}`)
      }
      const result = await res.json()
      setLista((prev) =>
        prev.map((e) =>
          e.cnpj === editando.cnpj
            ? {
                ...e,
                nomeDepara: result.nomeDepara,
                nomeOriginal: result.nomeOriginal ?? e.nomeOriginal,
              }
            : e,
        ),
      )
      setSucesso(
        `De-para salvo. ${result.notasAtualizadas} nota(s) passam a exibir o novo nome.`,
      )
      fecharEdicao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Carregando estabelecimentos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Para cada CNPJ você vê o nome como veio na nota (ligado ao CNPJ) e pode
        cadastrar como prefere chamar o lugar. Salvamos o nome original e o
        de-para; as notas passam a exibir o nome que você escolheu.
      </p>

      {erro && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center justify-between">
          <span>{erro}</span>
          <button
            onClick={() => setErro(null)}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {sucesso && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center justify-between">
          <span>{sucesso}</span>
          <button
            onClick={() => setSucesso(null)}
            className="text-green-600 hover:text-green-800"
          >
            ✕
          </button>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Nome de exibição (de-para)
            </h3>
            <p className="text-sm text-gray-500 mb-2 font-mono">
              CNPJ: {editando.cnpj}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              <span className="font-medium text-gray-600">Na nota (CNPJ):</span>{' '}
              {editando.nomeOriginal || '—'}
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Como você quer chamar este lugar
            </label>
            <input
              type="text"
              value={nomeEditado}
              onChange={(e) => setNomeEditado(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 mb-4"
              placeholder="Ex.: Mercado do bairro"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={fecharEdicao}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNome}
                disabled={!nomeEditado.trim() || salvando}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-gray-500 py-6 text-center">
          Nenhum estabelecimento encontrado. Processe notas fiscais para
          aparecerem aqui.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {lista.map((item) => (
            <li
              key={item.cnpj}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-gray-50/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-gray-500">{item.cnpj}</p>
                <p className="font-medium text-gray-800 truncate">
                  {nomeExibicaoAtual(item) || '—'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Na nota: {item.nomeOriginal || '—'}
                  {item.nomeDepara ? (
                    <span className="text-gray-400">
                      {' '}
                      · De-para: {item.nomeDepara}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-400">
                  {item.totalNotas} nota(s)
                </p>
              </div>
              <button
                onClick={() => abrirEdicao(item)}
                className="px-3 py-1.5 text-sm border border-green-700 text-green-700 rounded-lg hover:bg-green-50 transition-colors shrink-0"
              >
                Definir de-para
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
