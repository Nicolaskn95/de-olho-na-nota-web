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
