import { AuthGate } from "@/components/AuthGate";
import { MainNav } from "@/components/MainNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <MainNav />
      {children}
    </AuthGate>
  );
}
