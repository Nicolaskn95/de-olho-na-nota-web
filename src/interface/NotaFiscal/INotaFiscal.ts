import { Produto } from '../Produto/IProduto'

export interface TributosDetalhados {
  federal?: number
  estadual?: number
  municipal?: number
}

export interface NotaFiscal {
  _id: string
  chaveAcesso: string
  numero: string
  dataEmissao: string
  estabelecimento: string
  valorTotal: number
  valorPago: number
  formaPagamento?: string
  tipoPagamento?: string
  cartaoUsado?: string
  valorTributos?: number
  tributosDetalhados?: TributosDetalhados
  produtos: Produto[]
}

export interface GastosMensais {
  mes: string
  mesNumero: number
  ano: number
  total: number
  totalTributos?: number
  notas: NotaFiscal[]
}

export interface NotaFiscalResponse {
  _id: string
  chaveAcesso: string
  numero: string
  estabelecimento: string
  valorTotal: number
  valorPago: number
  formaPagamento?: string
  tipoPagamento?: string
  cartaoUsado?: string
  valorTributos?: number
  tributosDetalhados?: TributosDetalhados
  produtos: Array<{
    nome: string
    quantidade: number
    unidade: string
    valorUnitario: number
    valorTotal: number
  }>
}
