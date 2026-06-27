import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error("Uso: tsx prisma/create-user.ts <nombre> <email> <contraseña>");
  process.exit(1);
}

async function main() {
  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("users")
    .upsert({ name, email, password_hash }, { onConflict: "email" })
    .select("id, name, email")
    .single();

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log(`✓ Usuario "${data.name}" (${data.email}) creado correctamente.`);
}

main();
