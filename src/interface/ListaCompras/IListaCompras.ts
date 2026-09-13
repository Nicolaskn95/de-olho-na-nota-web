export interface MercadoHistorico {
  cnpj: string
  nomeOriginal: string
  nomeDepara: string | null
  totalNotas: number
  mesesDisponiveis: number
}

export interface ItemLista {
  nome: string
  nomeOriginal: string
  quantidade: number
  unidade: string
  valorEstimado: number
  valorUnitarioRecente: number
  frequencia: number
  comprado: boolean
}

export interface ListaComprasData {
  _id: string
  cnpj: string
  nomeEstabelecimento: string
  periodoAnaliseMeses: number
  estimativaTotal: number
  itens: ItemLista[]
  createdAt: string
  updatedAt: string
}

export interface ProdutoApelido {
  _id: string
  nomeOriginal: string
  apelido: string
}
