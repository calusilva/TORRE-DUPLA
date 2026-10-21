import type { DefaultSession } from "next-auth";
import type { Perfil } from "@/lib/dominio";

declare module "next-auth" {
  interface User {
    perfil: Perfil;
  }
  interface Session {
    user: { id: string; perfil: Perfil } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    perfil: Perfil;
  }
}
