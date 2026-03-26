import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { ProfileMenu } from "@/components/ProfileMenu";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <nav className="bg-green-800 text-white">
        <div className="max-w-4xl mx-auto px-6 py-3 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-6 items-center">
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
              href="/financeiro"
              className="hover:text-green-200 transition-colors"
            >
              Financeiro
            </Link>
          </div>
          <ProfileMenu />
        </div>
      </nav>
      {children}
    </AuthGate>
  );
}
