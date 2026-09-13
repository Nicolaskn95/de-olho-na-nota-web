'use client'

import {
  Categoria,
  CsvPreviewRow,
  ImportarPrefixosResult,
  Prefixo,
} from '@/interface/Prefixo/IPrefixo'
import { getAuthHeaders } from '@/lib/auth-api'
import { useState, useEffect, useCallback, useRef } from 'react'
import { GripVertical, Search, Pencil, Trash2, Tag, Sparkles, FolderInput, MoreVertical, ShoppingBag, ChevronRight, ChevronUp, X } from 'lucide-react'
import { ModalPesquisaProdutosNota } from '@/components/ModalPesquisaProdutosNota'
import { Loader } from '@/components/Loader'

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
  const [draggedPrefixo, setDraggedPrefixo] = useState<Prefixo | null>(null)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)
  const [buscaPrefixo, setBuscaPrefixo] = useState('')
  const [menuDropdownAbertoId, setMenuDropdownAbertoId] = useState<string | null>(null)
  const [subCategoryMenuAbertoId, setSubCategoryMenuAbertoId] = useState<string | null>(null)
  const [prefixoPesquisa, setPrefixoPesquisa] = useState<Prefixo | null>(null)
  const [modalPesquisaAberto, setModalPesquisaAberto] = useState(false)
  const categoriasRef = useRef<Categoria[]>([])

  useEffect(() => {
    categoriasRef.current = categorias
  }, [categorias])

  useEffect(() => {
    const fecharMenus = () => {
      setMenuDropdownAbertoId(null)
      setSubCategoryMenuAbertoId(null)
    }
    window.addEventListener('click', fecharMenus)
    return () => window.removeEventListener('click', fecharMenus)
  }, [])

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

  const getCategoriaById = useCallback(
    (id: string) => {
      return categorias.find((c) => c._id === id)
    },
    [categorias],
  )

  const moverPrefixoParaCategoria = async (
    prefixoId: string,
    novaCategoriaId: string,
  ) => {
    const pref = prefixos.find((p) => p._id === prefixoId)
    if (!pref) return
    const catAntiga = pref.categoria
    if (catAntiga?._id === novaCategoriaId) return

    const catNova = getCategoriaById(novaCategoriaId)
    if (!catNova) return

    setPrefixos((prev) =>
      prev.map((p) =>
        p._id === prefixoId ? { ...p, categoria: catNova } : p,
      ),
    )
    setSucesso(`Prefixo "${pref.prefixo}" movido para "${catNova.nome}"!`)
    setErro(null)

    try {
      const response = await fetch(
        `${API_URL}/categorias/prefixos/${prefixoId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            prefixo: pref.prefixo,
            categoriaId: novaCategoriaId,
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
          .map((p) => (p._id === prefixoId ? prefixoAtualizado : p))
          .sort((a, b) => a.prefixo.localeCompare(b.prefixo)),
      )
    } catch (e) {
      setPrefixos((prev) =>
        prev.map((p) =>
          p._id === prefixoId ? { ...p, categoria: catAntiga } : p,
        ),
      )
      setErro(
        e instanceof Error
          ? e.message
          : `Erro ao mover prefixo "${pref.prefixo}" para "${catNova.nome}"`,
      )
      setSucesso(null)
    }
  }

  const handleDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCatId !== catId) {
      setDragOverCatId(catId)
    }
  }

  const handleDragLeave = (e: React.DragEvent, catId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (dragOverCatId === catId) {
      setDragOverCatId(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, catId: string) => {
    e.preventDefault()
    setDragOverCatId(null)
    const prefixoId =
      e.dataTransfer.getData('text/plain') || draggedPrefixo?._id
    if (prefixoId) {
      await moverPrefixoParaCategoria(prefixoId, catId)
    }
    setDraggedPrefixo(null)
  }

  const prefixosFiltrados = prefixos.filter((p) => {
    if (!buscaPrefixo.trim()) return true
    const termo = buscaPrefixo.toLowerCase().trim()
    return (
      p.prefixo.toLowerCase().includes(termo) ||
      p.categoria?.nome?.toLowerCase().includes(termo) ||
      p.categoria?.codigo?.toLowerCase().includes(termo)
    )
  })

  const todasCategorias = [...categorias]
  prefixos.forEach((p) => {
    if (
      p.categoria &&
      !todasCategorias.some((c) => c._id === p.categoria._id)
    ) {
      todasCategorias.push(p.categoria)
    }
  })

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Prefixos Cadastrados
              <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                {prefixos.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              💡 <strong>Arraste e solte</strong> qualquer prefixo para mover de categoria.
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={buscaPrefixo}
              onChange={(e) => setBuscaPrefixo(e.target.value)}
              placeholder="Buscar prefixo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

        {prefixos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <Tag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Nenhum prefixo cadastrado ainda.</p>
            <p className="text-xs text-gray-400 mt-1">
              Importe um CSV acima ou cadastre um prefixo manualmente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todasCategorias.map((cat) => {
              const items = prefixosFiltrados.filter(
                (p) => p.categoria?._id === cat._id,
              )
              const isOver = dragOverCatId === cat._id
              const isDraggingSome = Boolean(draggedPrefixo)
              const isOrigem = draggedPrefixo?.categoria?._id === cat._id

              return (
                <div
                  key={cat._id}
                  onDragOver={(e) => handleDragOver(e, cat._id)}
                  onDragLeave={(e) => handleDragLeave(e, cat._id)}
                  onDrop={(e) => handleDrop(e, cat._id)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    isOver
                      ? 'border-green-500 bg-green-50/90 shadow-md ring-2 ring-green-500/30 scale-[1.01]'
                      : isDraggingSome && !isOrigem
                      ? 'border-dashed border-green-400 bg-green-50/30 hover:border-green-500'
                      : 'border-gray-100 bg-gray-50/40 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-200/60">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-xs border border-white shrink-0"
                        style={{ backgroundColor: cat.cor || '#10B981' }}
                      />
                      <h3
                        className="font-bold text-sm tracking-tight truncate"
                        style={{ color: cat.cor || '#1F2937' }}
                        title={cat.nome}
                      >
                        {cat.nome}
                      </h3>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 bg-gray-200/60 text-gray-600 rounded shrink-0">
                        {cat.codigo}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600 shadow-xs shrink-0">
                      {items.length} {items.length === 1 ? 'prefixo' : 'prefixos'}
                    </span>
                  </div>

                  {isOver && (
                    <div className="mb-2 py-1.5 px-3 bg-green-600 text-white text-xs font-medium rounded-lg text-center shadow-sm animate-pulse flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      Solte para mover &quot;{draggedPrefixo?.prefixo}&quot; para {cat.nome}
                    </div>
                  )}

                  {items.length === 0 ? (
                    <div className="py-5 text-center border-2 border-dashed border-gray-200 rounded-lg bg-white/50 text-xs text-gray-400">
                      Nenhum prefixo. Arraste um prefixo aqui para categorizar.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
                      {items.map((prefixo) => {
                        const isBeingDragged =
                          draggedPrefixo?._id === prefixo._id

                        return (
                          <div
                            key={prefixo._id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedPrefixo(prefixo)
                              e.dataTransfer.setData('text/plain', prefixo._id)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => {
                              setDraggedPrefixo(null)
                              setDragOverCatId(null)
                            }}
                            className={`inline-flex max-w-full items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm shadow-xs select-none cursor-grab active:cursor-grabbing hover:border-green-500 hover:shadow-sm transition-all group ${
                              isBeingDragged
                                ? 'opacity-40 ring-2 ring-green-500 scale-95'
                                : ''
                            }`}
                          >
                            <GripVertical className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover:text-green-600 transition-colors" />
                            <span className="font-mono font-bold text-gray-800 tracking-wide truncate min-w-0 max-w-[130px] sm:max-w-[200px]" title={prefixo.prefixo}>
                              {prefixo.prefixo}
                            </span>

                            <div className="flex items-center gap-1 ml-0.5 sm:ml-1 shrink-0 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 transition-opacity">
                              {/* Menu Suspenso Agrupado (Três Pontos) */}
                              <div className={`relative ${menuDropdownAbertoId === prefixo._id ? 'z-50' : ''}`}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSubCategoryMenuAbertoId(null)
                                    setMenuDropdownAbertoId(
                                      menuDropdownAbertoId === prefixo._id
                                        ? null
                                        : prefixo._id,
                                    )
                                  }}
                                  className={`p-1 rounded-md transition-colors ${
                                    menuDropdownAbertoId === prefixo._id
                                      ? 'text-gray-800 bg-gray-200'
                                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                  }`}
                                  title="Opções do prefixo"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {menuDropdownAbertoId === prefixo._id && (
                                  <>
                                    {/* Backdrop para fechar ao clicar fora no mobile/desktop */}
                                    <div
                                      className="fixed inset-0 bg-black/40 sm:bg-transparent z-40"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setMenuDropdownAbertoId(null)
                                        setSubCategoryMenuAbertoId(null)
                                      }}
                                    />

                                    {/* Menu Dropdown: Bottom Sheet em Mobile (<640px) e Popover Flutuante em Desktop (>=640px) */}
                                    <div
                                      className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-4 sm:p-1 max-h-[85vh] overflow-y-auto sm:overflow-visible sm:max-h-none sm:absolute sm:top-full sm:right-0 sm:left-auto sm:bottom-auto sm:w-60 sm:rounded-xl sm:border sm:border-gray-200 text-sm sm:text-xs animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Cabeçalho do Menu */}
                                      <div className="flex items-center justify-between pb-3 sm:pb-1.5 mb-2 sm:mb-0 border-b border-gray-100 sm:px-3 sm:pt-1.5">
                                        <span className="font-bold text-gray-800 sm:text-gray-400 uppercase tracking-wider text-xs sm:text-[10px]">
                                          Prefixo: {prefixo.prefixo}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuDropdownAbertoId(null)
                                            setSubCategoryMenuAbertoId(null)
                                          }}
                                          className="sm:hidden text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      </div>

                                      <div className="space-y-1 sm:space-y-0">
                                        {/* 1. Pesquisar nas Notas Fiscais */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuDropdownAbertoId(null)
                                            setSubCategoryMenuAbertoId(null)
                                            setPrefixoPesquisa(prefixo)
                                            setModalPesquisaAberto(true)
                                          }}
                                          className="w-full text-left px-3.5 py-3 sm:py-2 hover:bg-green-50 active:bg-green-100 text-gray-700 hover:text-green-800 flex items-center gap-2.5 transition-colors rounded-xl sm:rounded-none font-medium sm:font-normal"
                                        >
                                          <ShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-green-600 shrink-0" />
                                          <span>Pesquisar produtos nas Notas Fiscais</span>
                                        </button>

                                        {/* 2. Trocar de Categoria */}
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSubCategoryMenuAbertoId(
                                                subCategoryMenuAbertoId === prefixo._id
                                                  ? null
                                                  : prefixo._id,
                                              )
                                            }}
                                            className="w-full text-left px-3.5 py-3 sm:py-2 hover:bg-green-50 active:bg-green-100 text-gray-700 hover:text-green-800 flex items-center justify-between gap-2 transition-colors border-t border-gray-100 sm:border-gray-50 rounded-xl sm:rounded-none font-medium sm:font-normal"
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <FolderInput className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
                                              <span>Trocar de Categoria</span>
                                            </div>
                                            {subCategoryMenuAbertoId === prefixo._id ? (
                                              <ChevronUp className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 shrink-0" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 shrink-0" />
                                            )}
                                          </button>

                                          {subCategoryMenuAbertoId === prefixo._id && (
                                            <div className="max-h-60 sm:max-h-48 overflow-y-auto bg-gray-50/90 border-t border-b border-gray-200/80 py-1.5 my-1 sm:my-0.5 rounded-xl sm:rounded-none space-y-0.5 sm:space-y-0">
                                              {todasCategorias.map((c) => {
                                                const isAtual =
                                                  c._id === prefixo.categoria?._id
                                                return (
                                                  <button
                                                    key={c._id}
                                                    type="button"
                                                    onClick={() => {
                                                      moverPrefixoParaCategoria(
                                                        prefixo._id,
                                                        c._id,
                                                      )
                                                      setMenuDropdownAbertoId(null)
                                                      setSubCategoryMenuAbertoId(null)
                                                    }}
                                                    className={`w-full text-left pl-8 pr-3.5 py-2.5 sm:py-1.5 hover:bg-green-100/80 active:bg-green-200 flex items-center gap-2.5 transition-colors text-xs ${
                                                      isAtual
                                                        ? 'bg-green-100 font-bold text-green-900'
                                                        : 'text-gray-700'
                                                    }`}
                                                  >
                                                    <span
                                                      className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 border border-white"
                                                      style={{
                                                        backgroundColor:
                                                          c.cor || '#9ca3af',
                                                      }}
                                                    />
                                                    <span className="truncate flex-1">
                                                      {c.nome}
                                                    </span>
                                                    {isAtual && (
                                                      <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-medium">
                                                        Atual
                                                      </span>
                                                    )}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>

                                        {/* 3. Editar Prefixo */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuDropdownAbertoId(null)
                                            setSubCategoryMenuAbertoId(null)
                                            iniciarEdicao(prefixo)
                                          }}
                                          className="w-full text-left px-3.5 py-3 sm:py-2 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-700 flex items-center gap-2.5 transition-colors border-t border-gray-100 sm:border-gray-50 rounded-xl sm:rounded-none font-medium sm:font-normal"
                                        >
                                          <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0" />
                                          <span>Editar Prefixo</span>
                                        </button>

                                        {/* 4. Remover Prefixo */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuDropdownAbertoId(null)
                                            setSubCategoryMenuAbertoId(null)
                                            removerPrefixo(prefixo._id, prefixo.prefixo)
                                          }}
                                          className="w-full text-left px-3.5 py-3 sm:py-2 hover:bg-red-50 active:bg-red-100 text-red-600 hover:text-red-700 flex items-center gap-2.5 transition-colors border-t border-gray-100 font-semibold sm:font-medium rounded-xl sm:rounded-none"
                                        >
                                          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-red-500 shrink-0" />
                                          <span>Remover Prefixo</span>
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <ModalPesquisaProdutosNota
        open={modalPesquisaAberto}
        onClose={() => setModalPesquisaAberto(false)}
        prefixo={prefixoPesquisa}
      />
    </div>
  )
}
