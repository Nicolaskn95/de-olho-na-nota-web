import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "De Olho na Nota",
  description: "Escaneie QR codes de cupons fiscais e extraia os produtos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <nav className="bg-green-800 text-white">
          <div className="max-w-4xl mx-auto px-6 py-3 flex gap-6">
            <Link href="/" className="hover:text-green-200 transition-colors">
              Escanear Cupom
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-green-200 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/categorias"
              className="hover:text-green-200 transition-colors"
            >
              Categorias
            </Link>
            <Link
              href="/financeiro"
              className="hover:text-green-200 transition-colors"
            >
              Financeiro
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
