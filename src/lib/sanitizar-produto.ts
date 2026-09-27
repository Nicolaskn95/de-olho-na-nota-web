/**
 * Utilitários para sanitização de descrições de produtos e geração de chaves canônicas
 */

const SIGLAS_ESTADO =
  /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PR|PE|PI|RJ|RN|RO|RS|SC|SP|SE|TO)\s+/i

const PREFIXOS_FISCAIS_EMBALAGEM =
  /^\s*\d*([.,]\d+)?\s*(UN|KG|LT|CX|PT|GL|FD|BJ|PC|FR|SH|MA|TP|LATA|BARRA|GR|G|M|PCT|SC|DG|TB|AM|TR|VD|EMB)\s*[-–:/.]\s*/i

const PREFIXOS_SETORES_MERCADO =
  /^\s*(HORT|HORTI|HF|FLV|ACOU|ACOUGUE|AÇOUGUE|MER|MERC|MERCEARIA|PAD|PADARIA|BEB|BEBIDAS|FRIOS|LATIC|LATICINIOS|BAZAR|HIG|HIGIENE|LIM|LIMPEZA|CARNES|DEPTO|DEP|SETOR)\b\s*[-–:/.]?\s*/i

const PREFIXOS_CODIGO_INTERNO_BALANCA =
  /^\s*(#|PLU\s*[:.-]?\s*)\d+\s*[-–:/.]?\s*|^\s*\d{1,6}\s*[-–]\s*|^\s*\d{4,6}\s+/i

const UNIDADES_SUFIXO =
  /\s+(UN|CX|BJ|KG|G|PCT|PC|LT|ML|GR|PÇ|PAR|KIT|FD|SC|DG|TB|AM|FR|PT|TR|VD|EMB|LATA|BARRA)\s*$/i

const STOP_WORDS = new Set([
  'DE',
  'DA',
  'DO',
  'DAS',
  'DOS',
  'E',
  'COM',
  'SEM',
  'PARA',
  'EM',
  'NO',
  'NA',
  'NOS',
  'NAS',
  'POR',
  'AO',
  'AOS',
])

export function normalizarEspacos(texto: string): string {
  if (typeof texto !== 'string') return ''
  return texto.replace(/\s+/g, ' ').trim()
}

export function sanitizarDescricaoProduto(descricao: string): string {
  if (!descricao || typeof descricao !== 'string') {
    return ''
  }

  let limpo = normalizarEspacos(descricao)
  limpo = limpo.replace(SIGLAS_ESTADO, '').trim() || limpo
  limpo = limpo.replace(PREFIXOS_FISCAIS_EMBALAGEM, '').trim() || limpo
  limpo = limpo.replace(PREFIXOS_SETORES_MERCADO, '').trim() || limpo
  limpo = limpo.replace(PREFIXOS_CODIGO_INTERNO_BALANCA, '').trim() || limpo
  limpo = limpo.replace(PREFIXOS_FISCAIS_EMBALAGEM, '').trim() || limpo
  limpo = limpo.replace(UNIDADES_SUFIXO, '').trim() || limpo

  return normalizarEspacos(limpo)
}

export function isEanValido(ean?: string | null): boolean {
  if (!ean || typeof ean !== 'string') {
    return false
  }

  const valorNormalizado = ean.trim().toUpperCase()

  if (
    valorNormalizado === 'SEM GTIN' ||
    valorNormalizado === 'SEMGTIN' ||
    valorNormalizado === 'NAO INFORMADO' ||
    valorNormalizado === 'NULL'
  ) {
    return false
  }

  if (!/^\d+$/.test(valorNormalizado)) {
    return false
  }

  const tamanho = valorNormalizado.length
  if (![8, 12, 13, 14].includes(tamanho)) {
    return false
  }

  if (tamanho === 13 && valorNormalizado.startsWith('2')) {
    return false
  }

  return true
}

export function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function gerarChaveCanonica(
  codigo?: string | null,
  nomeOuDescricao?: string | null,
): string {
  if (isEanValido(codigo)) {
    return `EAN_${codigo!.trim()}`
  }

  const nomeSanitizado = sanitizarDescricaoProduto(nomeOuDescricao || '')
  if (!nomeSanitizado) {
    return 'CANON_DESCONHECIDO'
  }

  const semAcentos = removerAcentos(nomeSanitizado.toUpperCase())

  const tokens = semAcentos
    .split(/[^A-Z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))

  if (tokens.length === 0) {
    return `CANON_${semAcentos.replace(/[^A-Z0-9]/g, '_')}`
  }

  const tokensOrdenados = Array.from(new Set(tokens)).sort()
  return `CANON_${tokensOrdenados.join('_')}`
}
