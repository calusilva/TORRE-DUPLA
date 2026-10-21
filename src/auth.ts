import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { utilizadores } from "@/db/schema";

const credenciaisSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credenciaisSchema.safeParse(raw);
        if (!parsed.success) return null;

        const utilizador = await db.query.utilizadores.findFirst({
          where: eq(utilizadores.email, parsed.data.email.toLowerCase()),
        });
        if (!utilizador || !utilizador.ativo) return null;

        const valida = await bcrypt.compare(parsed.data.password, utilizador.passwordHash);
        if (!valida) return null;

        return {
          id: utilizador.id,
          name: utilizador.nome,
          email: utilizador.email,
          perfil: utilizador.perfil,
        };
      },
    }),
  ],
});
