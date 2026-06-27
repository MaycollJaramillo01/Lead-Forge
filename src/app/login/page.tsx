import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";
import { ArrowRight, CheckCircle2, LockKeyhole, UserRound } from "lucide-react";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session) redirect("/leads");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/leads",
      });
    } catch (err) {
      if (err instanceof AuthError) redirect("/login?error=1");
      throw err;
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#102aa8] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-28 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        <div className="brand-logo rounded-lg bg-white" aria-label="LeadForge">
          <img src="/leadforge-logo.png" alt="LeadForge" />
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Inteligencia comercial</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] xl:text-5xl">Convierte mercados locales en oportunidades reales.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/90">Descubre, valida y organiza prospectos desde un solo panel de trabajo.</p>
          <div className="mt-10 grid max-w-md gap-4 text-sm text-blue-50">
            <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-200" /> Datos listos para prospectar</p>
            <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-200" /> Seguimiento claro por campaña</p>
          </div>
        </div>
        <p className="relative text-xs text-blue-200">Plataforma privada de LeadForge</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f8faff] px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="brand-logo brand-logo-large mb-10 lg:hidden" aria-label="LeadForge">
            <img src="/leadforge-logo.png" alt="LeadForge" />
          </div>
          <div className="mb-8">
            <p className="text-sm font-semibold text-primary">Bienvenido</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground">Inicia sesión en tu cuenta</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Usa tus credenciales para acceder al panel de LeadForge.</p>
          </div>

          <form action={login} className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-[0_20px_60px_-36px_rgba(15,35,95,0.35)] sm:p-8">
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">Usuario o contraseña incorrectos. Verifica los datos e inténtalo de nuevo.</p>}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Usuario</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input id="email" name="email" type="text" autoComplete="username" placeholder="mike" required className="h-12 w-full rounded-lg border border-border bg-white pl-12 pr-4 text-base placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required className="h-12 w-full rounded-lg border border-border bg-white pl-12 pr-4 text-base placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
              </div>
            </div>
            <button type="submit" className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#102baf] active:opacity-90">Entrar al panel <ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
      </section>
    </main>
  );
}
