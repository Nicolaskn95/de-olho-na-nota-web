export interface Produto {
  nome: string
  codigo?: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface EstabelecimentoItemStats {
  total: number
  count: number
  ultimoPreco: number
}

export interface PrecoMesStats {
  total: number
  count: number
}

export interface ProdutoAgrupadoResponse {
  id: string
  nome: string
  nomes: string[]
  totalGasto: number
  totalQuantidade: number
  vezesComprado: number
  mediaPrecoUnitario: number
  ultimoPreco: number
  ultimaData: string
  estabelecimentos: Record<string, EstabelecimentoItemStats>
  precosPorMes: Record<string, PrecoMesStats>
  variacao: number | null
  categoria: {
    _id: string
    nome: string
    cor?: string
    icone?: string
  } | null
}
