import { AuthGate } from "@/components/AuthGate";
import { MainNav } from "@/components/MainNav";
import { BottomNav } from "@/components/BottomNav";
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
        <div className="pb-20 md:pb-6">
          {children}
        </div>
        <BottomNav />
      </SessionThemeProvider>
    </AuthGate>
  );
}
