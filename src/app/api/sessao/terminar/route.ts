import { signOut } from "@/auth";

/** Termina uma sessão inválida (utilizador removido/desactivado) e volta ao login. */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
