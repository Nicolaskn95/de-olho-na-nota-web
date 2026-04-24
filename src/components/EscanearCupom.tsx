'use client'

import { NotaFiscalResponse } from '@/interface/NotaFiscal/INotaFiscal'
import { useMemo, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { getAccessToken, getAuthHeaders } from '@/lib/auth-api'
import dynamic from 'next/dynamic'
import {
  ACTIONS,
  EventData,
  EVENTS,
  Joyride,
  STATUS,
  Step,
} from 'react-joyride'
import {
  Camera,
  ImagePlus,
  Link2,
  Barcode,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ScanLine,
} from 'lucide-react'

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false },
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ModoScanner = 'selecao' | 'camera' | 'imagem' | 'url' | 'chave';

export function EscanearCupom() {
  const [conteudoLido, setConteudoLido] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [urlManual, setUrlManual] = useState('')
  const [chaveManual, setChaveManual] = useState('')
  const [modo, setModo] = useState<ModoScanner>('selecao')
  const [carregandoImagem, setCarregandoImagem] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [notaProcessada, setNotaProcessada] =
    useState<NotaFiscalResponse | null>(null)
  const [rodandoTour, setRodandoTour] = useState(false)
  const [passoTour, setPassoTour] = useState(0)
  /** Indica que a nota veio via chave (barcode) e não via URL */
  const [processadoViaChave, setProcessadoViaChave] = useState(false)

  const passosTour = useMemo<Step[]>(
    () => [
      {
        target: '[data-tour="modos-escanear"]',
        content:
          'Aqui voce escolhe como quer capturar o cupom: camera, foto, URL manual ou chave de acesso.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '[data-tour="modo-camera"]',
        content:
          'Camera: leitura ao vivo de QR code e tambem do codigo de barras da chave.',
      },
      {
        target: '[data-tour="modo-imagem"]',
        content:
          'Enviar foto: use uma imagem que ja tenha o QR code do cupom fiscal.',
      },
      {
        target: '[data-tour="modo-url"]',
        content:
          'URL manual: cole o link da NFC-e quando nao conseguir escanear.',
      },
      {
        target: '[data-tour="modo-chave"]',
        content:
          'Codigo de barras: use quando nao funcionar com QR code. Aqui voce consulta pela chave de acesso com 44 digitos.',
      },
      {
        target: '[data-tour="botao-processar"]',
        content:
          'Depois da leitura, clique em Processar nota para extrair estabelecimento, valores e produtos.',
      },
      {
        target: '[data-tour="resultado-nota"]',
        content:
          'Resultado final: voce confere os dados da nota e a lista de produtos encontrados.',
      },
      {
        target: '[data-tour="recomecar"]',
        content:
          'Use este botao para limpar tudo e iniciar o processamento de outro cupom.',
      },
    ],
    [],
  )

  const recomecar = () => {
    setConteudoLido(null)
    setErro(null)
    setNotaProcessada(null)
    setModo('selecao')
    setUrlManual('')
    setChaveManual('')
    setProcessadoViaChave(false)
  }

  const iniciarTour = () => {
    if (modo !== 'selecao' || conteudoLido || notaProcessada) {
      recomecar()
      setTimeout(() => {
        setPassoTour(0)
        setRodandoTour(true)
      }, 0)
      return
    }

    setPassoTour(0)
    setRodandoTour(true)
  }

  const onJoyrideCallback = (data: EventData) => {
    const { action, index, status, type } = data

    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE
    ) {
      setRodandoTour(false)
      setPassoTour(0)
      return
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setPassoTour(index + 1)
      return
    }

    if (type === EVENTS.STEP_AFTER) {
      setPassoTour(index + (action === ACTIONS.PREV ? -1 : 1))
    }
  }

  /* ── Processar nota por URL (QR Code / URL manual) ──────────── */
  const enviarParaProcessar = async () => {
    if (!conteudoLido) return

    setProcessando(true)
    setErro(null)
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Faça login para processar notas fiscais.')
      }
      const response = await fetch(`${API_URL}/notas-fiscais/processar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ url: conteudoLido }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      const nota: NotaFiscalResponse = await response.json()
      setNotaProcessada(nota)
    } catch (e) {
      console.error('Erro ao processar nota:', e)
      setErro(e instanceof Error ? e.message : 'Erro ao processar nota fiscal')
    } finally {
      setProcessando(false)
    }
  }

  /* ── Processar nota por Chave de Acesso (barcode) ───────────── */
  const enviarChaveParaProcessar = async (chave?: string) => {
    const chaveAcesso = (chave || chaveManual).replace(/\D/g, '').trim()

    if (!chaveAcesso || chaveAcesso.length !== 44) {
      setErro('A chave de acesso deve conter exatamente 44 dígitos numéricos.')
      return
    }

    setProcessando(true)
    setErro(null)
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Faça login para processar notas fiscais.')
      }
      const response = await fetch(
        `${API_URL}/notas-fiscais/processar-chave`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ chaveAcesso }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      const nota: NotaFiscalResponse = await response.json()
      setNotaProcessada(nota)
      setProcessadoViaChave(true)
      setConteudoLido(chaveAcesso)
    } catch (e) {
      console.error('Erro ao processar via chave:', e)
      setErro(
        e instanceof Error ? e.message : 'Erro ao processar nota via chave de acesso',
      )
    } finally {
      setProcessando(false)
    }
  }

  const enviarUrlManual = () => {
    const url = urlManual.trim()
    if (url) {
      setConteudoLido(url)
      setModo('selecao')
      setErro(null)
    }
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCarregandoImagem(true)
    setErro(null)

    try {
      const scanner = new Html5Qrcode('qr-reader-hidden', { verbose: false })
      const result = await scanner.scanFileV2(file, true)
      setConteudoLido(result.decodedText)
      setErro(null)
      setModo('selecao')
    } catch (e) {
      console.error('Erro ao ler imagem:', e)
      setErro(
        'Não foi possível ler o QR code da imagem. Tente uma foto com melhor qualidade ou use a opção manual.',
      )
    } finally {
      setCarregandoImagem(false)
      event.target.value = ''
    }
  }

  /** Tenta detectar se o scan da câmera leu um barcode numérico (chave) ou URL */
  const handleScan = (detectedCodes: { rawValue?: string }[]) => {
    const value = detectedCodes?.[0]?.rawValue?.trim()
    if (!value) return

    // Se for 44 dígitos numéricos, é uma chave de acesso (barcode)
    const apenasDigitos = value.replace(/\D/g, '')
    if (/^\d{44}$/.test(apenasDigitos)) {
      setChaveManual(apenasDigitos)
      setModo('chave')
      setConteudoLido(null)
      return
    }

    // Caso contrário é URL (QR code)
    setConteudoLido(value)
    setErro(null)
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <Joyride
        run={rodandoTour}
        steps={passosTour}
        stepIndex={passoTour}
        onEvent={onJoyrideCallback}
        continuous
        scrollToFirstStep
        locale={{
          back: 'Voltar',
          close: 'Fechar',
          last: 'Finalizar',
          next: 'Proximo',
          skip: 'Pular',
        }}
        options={{
          buttons: ['back', 'close', 'primary', 'skip'],
          primaryColor: '#166534',
          skipScroll: true,
          zIndex: 10000,
        }}
      />
      <div id="qr-reader-hidden" className="hidden" aria-hidden="true" />
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">
          De Olho na Nota
        </h1>
        <p className="text-gray-600">
          Escaneie o QR code, leia o código de barras ou insira manualmente para
          extrair os produtos
        </p>
        <button
          type="button"
          onClick={iniciarTour}
          className="mt-4 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
        >
          Como funciona?
        </button>
      </header>

      {/* ─── Erro global (quando nada foi lido ainda) ─────────── */}
      {erro && !conteudoLido && modo !== 'chave' && (
        <div
          className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-center flex flex-col items-center gap-3"
          role="alert"
        >
          <AlertCircle className="h-5 w-5" />
          <p>{erro}</p>
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={recomecar}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TELA DE SELEÇÃO: modos de escanear                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!conteudoLido && modo === 'selecao' && !erro && (
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-2 gap-3 w-full" data-tour="modos-escanear">
            {/* Câmera */}
            <button
              type="button"
              data-tour="modo-camera"
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-500 hover:bg-green-100 transition-all group"
              onClick={() => setModo('camera')}
            >
              <Camera className="h-8 w-8 text-green-700 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-green-800">
                Câmera
              </span>
              <span className="text-xs text-gray-500">QR code ao vivo</span>
            </button>

            {/* Upload imagem */}
            <label
              data-tour="modo-imagem"
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-500 hover:bg-green-100 transition-all cursor-pointer group"
            >
              <ImagePlus className="h-8 w-8 text-green-700 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-green-800">
                {carregandoImagem ? 'Processando...' : 'Enviar Foto'}
              </span>
              <span className="text-xs text-gray-500">QR code em imagem</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={carregandoImagem}
                className="hidden"
              />
            </label>

            {/* URL Manual */}
            <button
              type="button"
              data-tour="modo-url"
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-500 hover:bg-blue-100 transition-all group"
              onClick={() => setModo('url')}
            >
              <Link2 className="h-8 w-8 text-blue-700 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-blue-800">
                URL Manual
              </span>
              <span className="text-xs text-gray-500">Colar link da nota</span>
            </button>

            {/* Código de Barras / Chave de Acesso */}
            <button
              type="button"
              data-tour="modo-chave"
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-500 hover:bg-amber-100 transition-all group"
              onClick={() => setModo('chave')}
            >
              <Barcode className="h-8 w-8 text-amber-700 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-amber-800">
                Cód. de Barras
              </span>
              <span className="text-xs text-gray-500">
                Chave de 44 dígitos
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODO: Câmera (QR Code ao vivo)                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!conteudoLido && modo === 'camera' && !erro && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full rounded-xl overflow-hidden border border-green-500 bg-black">
            <Scanner
              onScan={handleScan}
              onError={() => {
                setErro(
                  'Não foi possível acessar a câmera. Verifique permissões.',
                )
              }}
              paused={!!conteudoLido || !!erro}
              constraints={{ facingMode: 'environment' }}
              components={{ finder: true }}
              classNames={{
                container: 'w-full h-72 bg-black',
                video: 'w-full h-full object-cover',
              }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Aponte para um QR code ou código de barras do cupom fiscal
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            onClick={recomecar}
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODO: URL Manual                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {modo === 'url' && !conteudoLido && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Inserir URL do cupom
            </h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Cole a URL que está no QR code do cupom fiscal:
          </p>
          <input
            type="url"
            className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            placeholder="https://www.nfce.fazenda.sp.gov.br/..."
            value={urlManual}
            onChange={(e) => setUrlManual(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={recomecar}
            >
              Voltar
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={enviarUrlManual}
              disabled={!urlManual.trim()}
            >
              Usar esta URL
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODO: Chave de Acesso / Código de Barras               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {modo === 'chave' && !notaProcessada && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <ScanLine className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Chave de Acesso
            </h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Digite ou escaneie os 44 dígitos do código de barras do cupom
            fiscal. A consulta será feita automaticamente no site da SEFAZ.
          </p>

          <div className="relative mb-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={53}
              className="w-full p-3 pr-16 border border-amber-300 rounded-lg font-mono text-sm tracking-wider focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white"
              placeholder="3526 0349 0923 9800 1609 6549 4000 1607 9963 2146 8000"
              value={chaveManual
                .replace(/\D/g, '')
                .replace(/(\d{4})(?=\d)/g, '$1 ')}
              onChange={(e) =>
                setChaveManual(e.target.value.replace(/\D/g, '').slice(0, 44))
              }
            />
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                chaveManual.replace(/\D/g, '').length === 44
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              {chaveManual.replace(/\D/g, '').length}/44
            </span>
          </div>

          {/* Barra de progresso visual */}
          <div className="h-1.5 w-full bg-gray-200 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((chaveManual.replace(/\D/g, '').length / 44) * 100, 100)}%`,
                background:
                  chaveManual.replace(/\D/g, '').length === 44
                    ? '#16a34a'
                    : '#f59e0b',
              }}
            />
          </div>

          {erro && (
            <div
              className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{erro}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              onClick={recomecar}
            >
              Voltar
            </button>
            <button
              type="button"
              className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              onClick={() => enviarChaveParaProcessar()}
              disabled={
                processando ||
                chaveManual.replace(/\D/g, '').length !== 44
              }
            >
              {processando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando SEFAZ...
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4" />
                  Consultar Nota
                </>
              )}
            </button>
          </div>

          {processando && (
            <div className="mt-4 p-3 bg-amber-100 border border-amber-200 rounded-lg text-center">
              <p className="text-sm text-amber-800 font-medium">
                Acessando o site da SEFAZ e resolvendo CAPTCHA...
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CONTEÚDO LIDO (URL via QR/manual) — aguardando envio  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {conteudoLido && !notaProcessada && !processadoViaChave && (
        <section className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-green-800">
              QR code lido com sucesso!
            </h2>
          </div>
          <p className="text-sm text-green-700 bg-green-100 p-3 rounded-lg break-all font-mono mb-4">
            {conteudoLido}
          </p>
          {erro && (
            <div
              className="bg-red-50 text-red-700 p-3 rounded-lg mt-3 flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{erro}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <button
              type="button"
              onClick={recomecar}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              data-tour="botao-processar"
              className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={enviarParaProcessar}
              disabled={processando}
            >
              {processando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Processar nota'
              )}
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NOTA PROCESSADA — resultado final                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      {notaProcessada && (
        <section
          className="bg-white rounded-xl p-6 shadow-lg"
          data-tour="resultado-nota"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-semibold text-green-600">
              Nota Fiscal Processada
            </h2>
          </div>

          {processadoViaChave && (
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <Barcode className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Consultada via chave de acesso
              </p>
            </div>
          )}

          <div className="grid gap-2 mb-6">
            <p className="text-sm">
              <strong className="text-gray-700">Estabelecimento:</strong>{' '}
              {notaProcessada.estabelecimento}
            </p>
            <p className="text-sm">
              <strong className="text-gray-700">Número:</strong>{' '}
              {notaProcessada.numero}
            </p>
            <p className="text-sm">
              <strong className="text-gray-700">Valor Total:</strong> R${' '}
              {notaProcessada.valorTotal.toFixed(2)}
            </p>
            <p className="text-sm">
              <strong className="text-gray-700">Valor Pago:</strong> R${' '}
              {notaProcessada.valorPago.toFixed(2)}
            </p>
          </div>

          <h3 className="text-base font-medium text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Produtos ({notaProcessada.produtos.length})
          </h3>
          <ul className="max-h-72 overflow-y-auto">
            {notaProcessada.produtos.map((produto, index) => (
              <li
                key={index}
                className="grid grid-cols-[1fr_auto_auto] gap-2 py-3 border-b border-gray-100 last:border-0 text-sm"
              >
                <span className="font-medium text-gray-800">
                  {produto.nome}
                </span>
                <span className="text-gray-500 text-right">
                  {produto.quantidade} {produto.unidade}
                </span>
                <span className="font-semibold text-green-600 text-right min-w-[80px]">
                  R$ {produto.valorTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={recomecar}
              data-tour="recomecar"
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Processar outro cupom
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
