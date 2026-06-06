export interface Categoria {
  _id: string
  codigo: string
  nome: string
  descricao: string
  icone: string
  cor: string
}

export interface Prefixo {
  _id: string
  prefixo: string
  categoria: Categoria
}

export interface ImportarPrefixoItem {
  prefixo: string
  codigoCategoria: string
}

export interface ImportarPrefixosResult {
  criados: number
  ignorados: number
  erros: { prefixo: string; motivo: string }[]
  prefixos: Prefixo[]
}

export interface CsvPreviewRow {
  linha: number
  prefixo: string
  codigoCategoria: string
  status: 'ok' | 'erro'
  motivo?: string
}
