import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

// Initialize once at module level — not inside the callback
const sql = neon(
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ""
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const rows = await sql`
            SELECT id, email, name, password_hash
            FROM users
            WHERE email = ${email}
              AND approved = true
            LIMIT 1
          `;

          const user = rows[0];
          if (!user?.password_hash) return null;

          const valid = await bcrypt.compare(password, user.password_hash as string);
          if (!valid) return null;

          return {
            id: user.id as string,
            email: user.email as string,
            name: (user.name as string) || (user.email as string),
          };
        } catch (err) {
          console.error("[auth] DB error:", err);
          return null;
        }
      },
    }),
  ],
});
