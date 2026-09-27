'use client'

import { useState, useEffect } from 'react'
import { NotaFiscal } from '@/interface/NotaFiscal/INotaFiscal'
import { getAuthHeaders } from '@/lib/auth-api'
import {
  CreditCard,
  Landmark,
  X,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ModalEditarNotaFiscalProps {
  open: boolean
  onClose: () => void
  nota: NotaFiscal | null
  onSalvo: (notaAtualizada: NotaFiscal) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const OPCOES_TIPO_PAGAMENTO = [
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Dinheiro',
  'Vale Alimentação',
  'Vale Refeição',
  'Boleto Bancário',
  'Transferência',
  'Outro',
]

const SUGESTOES_CARTAO = [
  'Nubank',
  'Inter',
  'Itaú',
  'Bradesco',
  'Santander',
  'C6 Bank',
  'Mastercard',
  'Visa',
  'Elo',
  'Alelo',
  'VR Benefícios',
  'Sodexo',
]

export function ModalEditarNotaFiscal({
  open,
  onClose,
  nota,
  onSalvo,
}: ModalEditarNotaFiscalProps) {
  const [tipoPagamento, setTipoPagamento] = useState('')
  const [cartaoUsado, setCartaoUsado] = useState('')
  const [valorTributos, setValorTributos] = useState('')
  const [mostrarDetalhamento, setMostrarDetalhamento] = useState(false)
  const [tributoFederal, setTributoFederal] = useState('')
  const [tributoEstadual, setTributoEstadual] = useState('')
  const [tributoMunicipal, setTributoMunicipal] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (nota) {
      setTipoPagamento(nota.tipoPagamento || nota.formaPagamento || '')
      setCartaoUsado(nota.cartaoUsado || '')
      setValorTributos(
        nota.valorTributos !== undefined && nota.valorTributos !== null
          ? String(nota.valorTributos)
          : '',
      )
      setTributoFederal(
        nota.tributosDetalhados?.federal !== undefined
          ? String(nota.tributosDetalhados.federal)
          : '',
      )
      setTributoEstadual(
        nota.tributosDetalhados?.estadual !== undefined
          ? String(nota.tributosDetalhados.estadual)
          : '',
      )
      setTributoMunicipal(
        nota.tributosDetalhados?.municipal !== undefined
          ? String(nota.tributosDetalhados.municipal)
          : '',
      )
      if (
        nota.tributosDetalhados?.federal ||
        nota.tributosDetalhados?.estadual ||
        nota.tributosDetalhados?.municipal
      ) {
        setMostrarDetalhamento(true)
      } else {
        setMostrarDetalhamento(false)
      }
      setErro(null)
    }
  }, [nota, open])

  if (!open || !nota) return null

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setErro(null)

    try {
      const vTrib = valorTributos.trim()
        ? parseFloat(valorTributos.replace(',', '.'))
        : 0
      const fed = tributoFederal.trim()
        ? parseFloat(tributoFederal.replace(',', '.'))
        : undefined
      const est = tributoEstadual.trim()
        ? parseFloat(tributoEstadual.replace(',', '.'))
        : undefined
      const mun = tributoMunicipal.trim()
        ? parseFloat(tributoMunicipal.replace(',', '.'))
        : undefined

      const bodyPayload = {
        tipoPagamento: tipoPagamento.trim(),
        cartaoUsado: cartaoUsado.trim(),
        valorTributos: isNaN(vTrib) ? 0 : vTrib,
        tributosDetalhados:
          fed !== undefined || est !== undefined || mun !== undefined
            ? {
                federal: fed && !isNaN(fed) ? fed : 0,
                estadual: est && !isNaN(est) ? est : 0,
                municipal: mun && !isNaN(mun) ? mun : 0,
              }
            : undefined,
      }

      const res = await fetch(`${API_URL}/notas-fiscais/${nota._id}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.message || 'Não foi possível atualizar a nota fiscal.',
        )
      }

      const notaAtualizada: NotaFiscal = await res.json()
      onSalvo(notaAtualizada)
      onClose()
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : 'Erro ao salvar informações.',
      )
    } finally {
      setSalvando(false)
    }
  }

  const calcularSomaTributos = () => {
    const fed = parseFloat(tributoFederal.replace(',', '.')) || 0
    const est = parseFloat(tributoEstadual.replace(',', '.')) || 0
    const mun = parseFloat(tributoMunicipal.replace(',', '.')) || 0
    const total = fed + est + mun
    setValorTributos(total > 0 ? total.toFixed(2) : '')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Informações de Pagamento e Tributos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {nota.estabelecimento} • Nota #{nota.numero}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-5 overflow-y-auto space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {erro}
            </div>
          )}

          {/* Tipo de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Tipo de Pagamento
            </label>
            <select
              value={tipoPagamento}
              onChange={(e) => setTipoPagamento(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Selecione um tipo...</option>
              {OPCOES_TIPO_PAGAMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Cartão Usado / Bandeira */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Cartão Usado / Bandeira / Apelido</span>
              <span className="text-[11px] text-gray-400 font-normal">
                Ex: Nubank, Mastercard, Visa
              </span>
            </label>
            <input
              type="text"
              value={cartaoUsado}
              onChange={(e) => setCartaoUsado(e.target.value)}
              placeholder="Ex: Nubank Ultravioleta, Inter Débito..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {/* Chips de sugestões */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGESTOES_CARTAO.map((sugestao) => (
                <button
                  type="button"
                  key={sugestao}
                  onClick={() => setCartaoUsado(sugestao)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                    cartaoUsado.toLowerCase().includes(sugestao.toLowerCase())
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>

          {/* Impostos / Tributos */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-amber-600" />
                Valor Total dos Tributos (R$)
              </span>
              <span className="text-[11px] text-gray-400 font-normal">
                Lei Federal 12.741/2012
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-500">
                R$
              </span>
              <input
                type="text"
                value={valorTributos}
                onChange={(e) => setValorTributos(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            {nota.valorTotal > 0 && valorTributos && !isNaN(parseFloat(valorTributos)) && (
              <p className="text-[11px] text-amber-700 mt-1">
                Representa cerca de{' '}
                {(
                  (parseFloat(valorTributos.replace(',', '.')) /
                    nota.valorTotal) *
                  100
                ).toFixed(1)}
                % do valor total da nota ({nota.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
              </p>
            )}
          </div>

          {/* Detalhamento Opcional */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setMostrarDetalhamento(!mostrarDetalhamento)}
              className="flex items-center justify-between w-full text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              <span>Detalhamento dos tributos (Federal, Estadual, Municipal)</span>
              {mostrarDetalhamento ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {mostrarDetalhamento && (
              <div className="mt-3 space-y-2.5 pt-2 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Federal (R$)
                    </label>
                    <input
                      type="text"
                      value={tributoFederal}
                      onChange={(e) => setTributoFederal(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Estadual (R$)
                    </label>
                    <input
                      type="text"
                      value={tributoEstadual}
                      onChange={(e) => setTributoEstadual(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Municipal (R$)
                    </label>
                    <input
                      type="text"
                      value={tributoMunicipal}
                      onChange={(e) => setTributoMunicipal(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={calcularSomaTributos}
                  className="text-[11px] text-emerald-700 hover:underline font-medium"
                >
                  Somar nos tributos totais
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Salvar informações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
