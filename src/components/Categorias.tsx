'use client'

import {
  Categoria,
  CsvPreviewRow,
  ImportarPrefixosResult,
  Prefixo,
} from '@/interface/Prefixo/IPrefixo'
import { getAuthHeaders } from '@/lib/auth-api'
import { useState, useEffect, useCallback, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface CategoriasProps {
  /** Quando true, oculta o título principal (uso dentro de Configurações) */
  compact?: boolean
}

function limparCelulaCsv(valor: string): string {
  return valor.replace(/^\uFEFF/, '').trim()
}

function parseCsvLinhas(texto: string): string[][] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) =>
      linha.split(',').map((celula) => limparCelulaCsv(celula)),
    )
}

function validarCsv(
  linhas: string[][],
  codigosValidos: Set<string>,
): CsvPreviewRow[] {
  if (linhas.length === 0) return []

  const header = linhas[0].map((c) => c.toLowerCase())
  const idxPrefixo = header.indexOf('prefixo')
  const idxCodigo = header.indexOf('codigo_categoria')

  if (idxPrefixo === -1 || idxCodigo === -1) {
    return [
      {
        linha: 1,
        prefixo: '',
        codigoCategoria: '',
        status: 'erro',
        motivo: 'Cabeçalho inválido. Use: prefixo,codigo_categoria',
      },
    ]
  }

  const preview: CsvPreviewRow[] = []
  const vistos = new Set<string>()

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i]
    const prefixoRaw = linha[idxPrefixo] ?? ''
    const codigoRaw = linha[idxCodigo] ?? ''
    const prefixo = prefixoRaw.toUpperCase().trim()
    const codigoCategoria = codigoRaw.toUpperCase().trim()
    const numLinha = i + 1

    if (!prefixo && !codigoCategoria) continue

    if (prefixo.length < 2) {
      preview.push({
        linha: numLinha,
        prefixo,
        codigoCategoria,
        status: 'erro',
        motivo: 'Prefixo deve ter no mínimo 2 caracteres',
      })
      continue
    }

    if (!codigoCategoria) {
      preview.push({
        linha: numLinha,
        prefixo,
        codigoCategoria,
        status: 'erro',
        motivo: 'codigo_categoria é obrigatório',
      })
      continue
    }

    if (!codigosValidos.has(codigoCategoria)) {
      preview.push({
        linha: numLinha,
        prefixo,
        codigoCategoria,
        status: 'erro',
        motivo: `Código "${codigoCategoria}" não existe`,
      })
      continue
    }

    if (vistos.has(prefixo)) {
      preview.push({
        linha: numLinha,
        prefixo,
        codigoCategoria,
        status: 'erro',
        motivo: 'Prefixo duplicado no arquivo',
      })
      continue
    }

    vistos.add(prefixo)
    preview.push({
      linha: numLinha,
      prefixo,
      codigoCategoria,
      status: 'ok',
    })
  }

  return preview
}

export function Categorias({ compact }: CategoriasProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [prefixos, setPrefixos] = useState<Prefixo[]>([])
  const [novoPrefixo, setNovoPrefixo] = useState('')
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [editando, setEditando] = useState<Prefixo | null>(null)
  const [editPrefixo, setEditPrefixo] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [mostrarCodigos, setMostrarCodigos] = useState(false)
  const [previewCsv, setPreviewCsv] = useState<CsvPreviewRow[]>([])
  const [nomeArquivoCsv, setNomeArquivoCsv] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const categoriasRef = useRef<Categoria[]>([])

  useEffect(() => {
    categoriasRef.current = categorias
  }, [categorias])

  const carregarPrefixos = useCallback(async () => {
    const prefixosRes = await fetch(`${API_URL}/categorias/prefixos/listar`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    })

    if (!prefixosRes.ok) {
      if (prefixosRes.status === 401) {
        setErro('Faça login para gerenciar seus prefixos.')
      } else {
        setErro('Erro ao carregar prefixos.')
      }
      return false
    }

    setPrefixos((await prefixosRes.json()) as Prefixo[])
    setErro(null)
    return true
  }, [])

  const carregarDados = useCallback(async () => {
    try {
      const categoriasRes = await fetch(`${API_URL}/categorias`, {
        cache: 'no-store',
      })
      if (!categoriasRes.ok) {
        throw new Error('Erro ao carregar categorias')
      }

      const categoriasData = (await categoriasRes.json()) as Categoria[]
      setCategorias(categoriasData)
      categoriasRef.current = categoriasData

      if (categoriasData.length > 0 && !categoriaSelecionada) {
        setCategoriaSelecionada(categoriasData[0]._id)
      }

      const prefixosOk = await carregarPrefixos()
      if (!prefixosOk) {
        setPrefixos([])
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setCarregando(false)
    }
  }, [categoriaSelecionada, carregarPrefixos])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const salvarPrefixo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novoPrefixo.trim() || !categoriaSelecionada) return

    setSalvando(true)
    setErro(null)
    setSucesso(null)

    try {
      const response = await fetch(`${API_URL}/categorias/prefixos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          prefixo: novoPrefixo.trim(),
          categoriaId: categoriaSelecionada,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      const novoPrefixoSalvo = await response.json()
      setPrefixos((prev) =>
        [...prev, novoPrefixoSalvo].sort((a, b) =>
          a.prefixo.localeCompare(b.prefixo),
        ),
      )
      setNovoPrefixo('')
      setSucesso(
        `Prefixo "${novoPrefixoSalvo.prefixo}" cadastrado com sucesso!`,
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar prefixo')
    } finally {
      setSalvando(false)
    }
  }

  const removerPrefixo = async (id: string, prefixo: string) => {
    if (!confirm(`Deseja remover o prefixo "${prefixo}"?`)) return

    try {
      const response = await fetch(`${API_URL}/categorias/prefixos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Erro ao remover prefixo')
      }

      setPrefixos((prev) => prev.filter((p) => p._id !== id))
      setSucesso(`Prefixo "${prefixo}" removido com sucesso!`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover prefixo')
    }
  }

  const iniciarEdicao = (prefixo: Prefixo) => {
    setEditando(prefixo)
    setEditPrefixo(prefixo.prefixo)
    setEditCategoria(prefixo.categoria._id)
    setErro(null)
    setSucesso(null)
  }

  const cancelarEdicao = () => {
    setEditando(null)
    setEditPrefixo('')
    setEditCategoria('')
  }

  const salvarEdicao = async () => {
    if (!editando || !editPrefixo.trim() || !editCategoria) return

    setSalvando(true)
    setErro(null)

    try {
      const response = await fetch(
        `${API_URL}/categorias/prefixos/${editando._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            prefixo: editPrefixo.trim(),
            categoriaId: editCategoria,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      const prefixoAtualizado = await response.json()
      setPrefixos((prev) =>
        prev
          .map((p) => (p._id === editando._id ? prefixoAtualizado : p))
          .sort((a, b) => a.prefixo.localeCompare(b.prefixo)),
      )
      setSucesso(
        `Prefixo "${prefixoAtualizado.prefixo}" atualizado com sucesso!`,
      )
      cancelarEdicao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar prefixo')
    } finally {
      setSalvando(false)
    }
  }

  const handleArquivoCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    setErro(null)
    setSucesso(null)
    setNomeArquivoCsv(arquivo.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const texto = event.target?.result as string
      const linhas = parseCsvLinhas(texto)
      const cats = categoriasRef.current

      if (cats.length === 0) {
        setPreviewCsv([
          {
            linha: 1,
            prefixo: '',
            codigoCategoria: '',
            status: 'erro',
            motivo:
              'Categorias ainda não carregadas. Aguarde ou recarregue a página.',
          },
        ])
        return
      }

      const codigos = new Set(
        cats.map((c) => c.codigo.toUpperCase()).filter(Boolean),
      )
      setPreviewCsv(validarCsv(linhas, codigos))
    }
    reader.readAsText(arquivo, 'UTF-8')
    e.target.value = ''
  }

  const linhasValidas = previewCsv.filter((r) => r.status === 'ok')
  const linhasComErro = previewCsv.filter((r) => r.status === 'erro')

  const importarCsv = async () => {
    if (linhasValidas.length === 0 || linhasComErro.length > 0) return

    setImportando(true)
    setErro(null)
    setSucesso(null)

    try {
      const response = await fetch(`${API_URL}/categorias/prefixos/importar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          prefixos: linhasValidas.map((r) => ({
            prefixo: r.prefixo,
            codigoCategoria: r.codigoCategoria,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      const resultado = (await response.json()) as ImportarPrefixosResult

      const partes = [
        `${resultado.criados} criado(s)`,
        resultado.ignorados > 0
          ? `${resultado.ignorados} ignorado(s) (já existiam)`
          : null,
        resultado.erros.length > 0
          ? `${resultado.erros.length} erro(s) no servidor`
          : null,
      ].filter(Boolean)

      setSucesso(`Importação concluída: ${partes.join(', ')}.`)
      setPreviewCsv([])
      setNomeArquivoCsv(null)

      if (Array.isArray(resultado.prefixos)) {
        setPrefixos(resultado.prefixos)
        setErro(null)
      } else {
        await carregarPrefixos()
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar prefixos')
    } finally {
      setImportando(false)
    }
  }

  const prefixosPorCategoria = prefixos.reduce(
    (acc, prefixo) => {
      const catId = prefixo.categoria?._id || 'sem-categoria'
      if (!acc[catId]) {
        acc[catId] = []
      }
      acc[catId].push(prefixo)
      return acc
    },
    {} as Record<string, Prefixo[]>,
  )

  const getCategoriaById = (id: string) => {
    return categorias.find((c) => c._id === id)
  }

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Carregando categorias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'max-w-4xl mx-auto p-6'}>
      {!compact && (
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            Categorização de Produtos
          </h1>
          <p className="text-gray-600">
            Cadastre prefixos para categorizar produtos automaticamente
          </p>
        </header>
      )}

      {erro && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {erro}
          <button
            onClick={() => setErro(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {sucesso && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
          {sucesso}
          <button
            onClick={() => setSucesso(null)}
            className="ml-4 text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Editar Prefixo
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Prefixo
                </label>
                <input
                  type="text"
                  value={editPrefixo}
                  onChange={(e) => setEditPrefixo(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Categoria
                </label>
                <select
                  value={editCategoria}
                  onChange={(e) => setEditCategoria(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                >
                  {categorias.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={cancelarEdicao}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={!editPrefixo.trim() || salvando}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Importar prefixos via CSV
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Use o template com as colunas{' '}
          <code className="bg-gray-100 px-1 rounded">prefixo</code> e{' '}
          <code className="bg-gray-100 px-1 rounded">codigo_categoria</code>.
          O prefixo deve ser o início do nome do produto (mínimo 2 caracteres).
          Duplicatas já cadastradas serão ignoradas.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <a
            href="/templates/prefixos-categorias.csv"
            download="prefixos-categorias.csv"
            className="px-4 py-2 border border-green-800 text-green-800 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
          >
            Baixar template CSV
          </a>
          <button
            type="button"
            onClick={() => setMostrarCodigos((v) => !v)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            {mostrarCodigos ? 'Ocultar' : 'Ver'} códigos de categoria
          </button>
        </div>

        {mostrarCodigos && (
          <div className="mb-4 overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-700">
                    codigo_categoria
                  </th>
                  <th className="text-left p-2 font-medium text-gray-700">
                    Nome
                  </th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr key={cat._id} className="border-t border-gray-100">
                    <td className="p-2 font-mono text-xs text-gray-800">
                      {cat.codigo}
                    </td>
                    <td className="p-2 text-gray-600">{cat.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Selecionar arquivo .csv
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleArquivoCsv}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-800 file:text-white file:cursor-pointer hover:file:bg-green-700"
          />
          {nomeArquivoCsv && (
            <p className="text-xs text-gray-500 mt-1">Arquivo: {nomeArquivoCsv}</p>
          )}
        </div>

        {previewCsv.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Linha</th>
                    <th className="text-left p-2">Prefixo</th>
                    <th className="text-left p-2">Código categoria</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewCsv.map((row) => (
                    <tr
                      key={`${row.linha}-${row.prefixo}`}
                      className="border-t border-gray-100"
                    >
                      <td className="p-2 text-gray-500">{row.linha}</td>
                      <td className="p-2 font-mono">{row.prefixo || '—'}</td>
                      <td className="p-2 font-mono text-xs">
                        {row.codigoCategoria || '—'}
                      </td>
                      <td className="p-2">
                        {row.status === 'ok' ? (
                          <span className="text-green-700">OK</span>
                        ) : (
                          <span className="text-red-600" title={row.motivo}>
                            Erro: {row.motivo}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={importarCsv}
              disabled={
                importando ||
                linhasValidas.length === 0 ||
                linhasComErro.length > 0
              }
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importando
                ? 'Importando...'
                : `Importar ${linhasValidas.length} prefixo(s)`}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Cadastrar Novo Prefixo
        </h2>
        <form
          onSubmit={salvarPrefixo}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <label
              htmlFor="prefixo"
              className="block text-sm text-gray-600 mb-1"
            >
              Prefixo (início do nome do produto)
            </label>
            <input
              id="prefixo"
              type="text"
              value={novoPrefixo}
              onChange={(e) => setNovoPrefixo(e.target.value.toUpperCase())}
              placeholder="Ex: LING, LEITE, SABAN"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="categoria"
              className="block text-sm text-gray-600 mb-1"
            >
              Categoria
            </label>
            <select
              id="categoria"
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            >
              {categorias.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!novoPrefixo.trim() || salvando}
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Prefixos Cadastrados ({prefixos.length})
        </h2>

        {prefixos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum prefixo cadastrado ainda. Importe um CSV ou cadastre manualmente.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(prefixosPorCategoria).map(([catId, items]) => {
              const categoria = getCategoriaById(catId)
              return (
                <div key={catId}>
                  <h3
                    className="text-sm font-medium mb-2 border-b pb-1 flex items-center gap-2"
                    style={{
                      color: categoria?.cor || '#666',
                      borderColor: categoria?.cor || '#e5e7eb',
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria?.cor || '#9ca3af' }}
                    />
                    {categoria?.nome || 'Sem categoria'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((prefixo) => (
                      <span
                        key={prefixo._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                      >
                        <span className="font-mono font-medium text-gray-800">
                          {prefixo.prefixo}
                        </span>
                        <button
                          onClick={() => iniciarEdicao(prefixo)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Editar prefixo"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() =>
                            removerPrefixo(prefixo._id, prefixo.prefixo)
                          }
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover prefixo"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
