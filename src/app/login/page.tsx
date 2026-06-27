import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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
      if (err instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw err; // rethrow redirect (NEXT_REDIRECT)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-background p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold">LeadForge</h1>
        <p className="text-sm text-muted-foreground">Internal sign in</p>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Usuario o contraseña incorrectos
          </p>
        )}
        <input
          name="email"
          type="text"
          placeholder="Usuario"
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
