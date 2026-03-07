import { Produto } from '../Produto/IProduto'

export interface NotaFiscal {
  _id: string
  chaveAcesso: string
  numero: string
  dataEmissao: string
  estabelecimento: string
  valorTotal: number
  valorPago: number
  produtos: Produto[]
}

export interface GastosMensais {
  mes: string
  mesNumero: number
  ano: number
  total: number
  notas: NotaFiscal[]
}

export interface NotaFiscalResponse {
  _id: string
  chaveAcesso: string
  numero: string
  estabelecimento: string
  valorTotal: number
  valorPago: number
  produtos: Array<{
    nome: string
    quantidade: number
    unidade: string
    valorUnitario: number
    valorTotal: number
  }>
}
