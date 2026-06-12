export interface FiltrarDuracaoRequest {
  mesInicial: string
  categoriaId: string
  qtdMeses: number
}

export interface FiltrarDuracaoResponse {
  notasFiscais: NotaFiscalDuracao[]
  categoria: CategoriaResumo
  periodoInicio: string
  periodoFim: string
}

export interface NotaFiscalDuracao {
  _id: string
  dataEmissao: string
  estabelecimento: string
  produtos: ProdutoDuracao[]
}

export interface ProdutoDuracao {
  _id: string
  nome: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface CategoriaResumo {
  _id: string
  nome: string
  icone: string
  cor: string
}

export interface CalcularDuracaoRequest {
  produtoIds: string[]
  qtdMeses: number
}

export interface CalcularDuracaoResponse {
  duracaoMediaDias: number
  detalhes: DetalheCalculo[]
  qtdMeses: number
}

export interface DetalheCalculo {
  nomeProduto: string
  totalCompras: number
  datasCompras: string[]
  diferencasDias: number[]
  somaTotal: number
}
