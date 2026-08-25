import { AuthGate } from "@/components/AuthGate";
import { MainNav } from "@/components/MainNav";
import { SessionThemeProvider } from "@/components/SessionThemeProvider";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <SessionThemeProvider>
        <MainNav />
        {children}
      </SessionThemeProvider>
    </AuthGate>
  );
}
