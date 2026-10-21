"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type EstadoLogin = { erro?: string } | undefined;

export async function entrar(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("redirectTo") as string) || "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return error.type === "CredentialsSignin"
        ? { erro: "Email ou palavra-passe incorrectos." }
        : { erro: "Não foi possível iniciar sessão. Tente novamente." };
    }
    throw error; // o redirect do Next.js é lançado como excepção
  }
}

export async function sair() {
  await signOut({ redirectTo: "/login" });
}
