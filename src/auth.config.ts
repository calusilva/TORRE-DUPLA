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
    authorized({ auth, request: { nextUrl, headers } }) {
      // Atrás de "-H 0.0.0.0" ou de um proxy, nextUrl.host não é o endereço que o browser usou.
      const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? nextUrl.host;
      const proto = headers.get("x-forwarded-proto") ?? nextUrl.protocol.replace(":", "");
      const url = (caminho: string) => new URL(caminho, `${proto}://${host}`);
      const publica = ROTAS_PUBLICAS.some((r) => nextUrl.pathname.startsWith(r));
      const autenticado = !!auth?.user;
      if (nextUrl.pathname === "/login" && autenticado) {
        return Response.redirect(url("/"));
      }
      if (publica || autenticado) return true;
      const destino = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return Response.redirect(url(`/login?callbackUrl=${destino}`));
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
