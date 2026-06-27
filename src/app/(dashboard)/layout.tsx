import Link from "next/link";
import { BarChart3, Download, Megaphone, UsersRound } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/exports", label: "Exportar", icon: Download },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/dashboard" className="brand-logo shrink-0" aria-label="LeadForge - Inicio">
            <img src="/leadforge-logo.png" alt="LeadForge" />
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-1 overflow-x-auto py-2 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 font-medium text-muted-foreground hover:bg-muted hover:text-primary">
                <item.icon className="h-4 w-4" /> <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>
    </div>
  );
}
