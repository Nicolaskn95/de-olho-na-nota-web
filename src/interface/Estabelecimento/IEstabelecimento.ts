export interface EstabelecimentoItem {
  cnpj: string
  /** Nome como veio na nota (ligado ao CNPJ). */
  nomeOriginal: string
  /** Nome que o usuário cadastrou (de-para); null se ainda não definiu. */
  nomeDepara: string | null
  totalNotas: number
}
