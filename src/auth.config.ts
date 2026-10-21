import type { NextAuthConfig } from "next-auth";
import type { Perfil } from "@/lib/dominio";

// Configuração compatível com o runtime edge (usada pelo middleware).
// Os providers com acesso à BD ficam em src/auth.ts.
const ROTAS_PUBLICAS = ["/login", "/rastreabilidade"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // um turno
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const publica = ROTAS_PUBLICAS.some((r) => nextUrl.pathname.startsWith(r));
      const autenticado = !!auth?.user;
      if (nextUrl.pathname === "/login" && autenticado) {
        return Response.redirect(new URL("/obras", nextUrl));
      }
      return publica || autenticado;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.perfil = user.perfil;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.perfil = token.perfil as Perfil;
      return session;
    },
  },
} satisfies NextAuthConfig;
