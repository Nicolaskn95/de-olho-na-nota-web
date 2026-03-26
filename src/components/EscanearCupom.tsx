"use client";

import { NotaFiscalResponse } from "@/interface/NotaFiscal/INotaFiscal";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { getAccessToken, getAuthHeaders } from "@/lib/auth-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function EscanearCupom() {
  const [conteudoLido, setConteudoLido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [urlManual, setUrlManual] = useState("");
  const [modoManual, setModoManual] = useState(false);
  const [carregandoImagem, setCarregandoImagem] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [notaProcessada, setNotaProcessada] =
    useState<NotaFiscalResponse | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      // Não faz sentido rodar scanner quando:
      // - o usuário ativou o modo manual
      // - já foi lido um QR
      // - existe erro exibido
      if (modoManual || !!conteudoLido || !!erro) return;

      // Para (limpa) qualquer instância anterior
      try {
        await scannerRef.current?.stop();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;

      const scanner = new Html5Qrcode("qr-reader-live", {
        verbose: false,
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          undefined,
          (decodedText) => {
            if (cancelled) return;
            setConteudoLido(decodedText);
            setErro(null);
            // Após detectar, para a câmera.
            scanner.stop().catch(() => {});
          },
          () => {
            // Erros normais de "não encontrou código" podem ocorrer enquanto
            // a câmera analisa. Mantém silencioso.
          },
        );
      } catch (e) {
        if (cancelled) return;
        setErro("Não foi possível acessar a câmera. Verifique permissões.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [modoManual, conteudoLido, erro]);

  const recomecar = () => {
    setConteudoLido(null);
    setErro(null);
    setNotaProcessada(null);
    setModoManual(false);
    setUrlManual("");
  };

  const enviarParaProcessar = async () => {
    if (!conteudoLido) return;

    setProcessando(true);
    setErro(null);
    console.log(API_URL);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Faça login para processar notas fiscais.");
      }
      const response = await fetch(`${API_URL}/notas-fiscais/processar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ url: conteudoLido }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      const nota: NotaFiscalResponse = await response.json();
      setNotaProcessada(nota);
    } catch (e) {
      console.error("Erro ao processar nota:", e);
      setErro(e instanceof Error ? e.message : "Erro ao processar nota fiscal");
    } finally {
      setProcessando(false);
    }
  };

  const enviarUrlManual = () => {
    const url = urlManual.trim();
    if (url) {
      setConteudoLido(url);
      setModoManual(false);
      setErro(null);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCarregandoImagem(true);
    setErro(null);

    try {
      const scanner = new Html5Qrcode("qr-reader-hidden", { verbose: false });
      const result = await scanner.scanFileV2(file, true);
      setConteudoLido(result.decodedText);
      setErro(null);
    } catch (e) {
      console.error("Erro ao ler imagem:", e);
      setErro(
        "Não foi possível ler o QR code da imagem. Tente uma foto com melhor qualidade ou use a opção manual.",
      );
    } finally {
      setCarregandoImagem(false);
      event.target.value = "";
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <div id="qr-reader-hidden" className="hidden" aria-hidden="true" />
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-2">
          De Olho na Nota
        </h1>
        <p className="text-gray-600">
          Use a câmera, envie uma foto do QR code ou insira a URL manualmente
          para extrair os produtos
        </p>
      </header>

      {erro && !conteudoLido && (
        <div
          className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-center"
          role="alert"
        >
          <p className="mb-3">{erro}</p>
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={recomecar}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!conteudoLido && !modoManual && !erro && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full rounded-xl overflow-hidden border border-green-500 bg-black">
            <div
              id="qr-reader-live"
              className="w-full h-72 bg-black"
              aria-label="Área do scanner"
            />
          </div>

          <div className="flex items-center w-full gap-4 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-200" />
            <span>ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="w-full">
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-green-500 rounded-xl bg-green-50 cursor-pointer hover:bg-green-100 hover:border-green-600 transition-all">
              <div className="text-4xl mb-3">📷</div>
              <span className="text-base font-medium text-green-800 mb-1">
                {carregandoImagem ? "Processando..." : "Enviar foto do QR code"}
              </span>
              <span className="text-sm text-gray-500">
                ou arraste a imagem aqui
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={carregandoImagem}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center w-full gap-4 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-200" />
            <span>ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            className="px-6 py-3 border border-green-800 text-green-800 rounded-lg hover:bg-green-50 transition-colors"
            onClick={() => setModoManual(true)}
          >
            Inserir URL manualmente
          </button>
        </div>
      )}

      {modoManual && !conteudoLido && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Inserir URL do cupom
          </h3>
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

      {conteudoLido && !notaProcessada && (
        <section className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <h2 className="text-xl font-semibold text-green-800 mb-3">
            QR code lido com sucesso!
          </h2>
          <p className="text-sm text-green-700 bg-green-100 p-3 rounded-lg break-all font-mono mb-4">
            {conteudoLido}
          </p>
          {erro && (
            <div
              className="bg-red-50 text-red-700 p-3 rounded-lg mt-3"
              role="alert"
            >
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
              className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={enviarParaProcessar}
              disabled={processando}
            >
              {processando ? "Processando..." : "Processar nota"}
            </button>
          </div>
        </section>
      )}

      {notaProcessada && (
        <section className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-green-600 mb-4">
            Nota Fiscal Processada
          </h2>
          <div className="grid gap-2 mb-6">
            <p className="text-sm">
              <strong className="text-gray-700">Estabelecimento:</strong>{" "}
              {notaProcessada.estabelecimento}
            </p>
            <p className="text-sm">
              <strong className="text-gray-700">Número:</strong>{" "}
              {notaProcessada.numero}
            </p>
            <p className="text-sm">
              <strong className="text-gray-700">Valor Total:</strong> R${" "}
              {notaProcessada.valorTotal.toFixed(2)}
            </p>
            <p className="text-sm">
              <strong className="text-gray-700">Valor Pago:</strong> R${" "}
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
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Processar outro cupom
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
