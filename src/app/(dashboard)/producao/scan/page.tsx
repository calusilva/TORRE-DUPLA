import type { Metadata } from "next";
import { ScanApp } from "@/components/scan/scan-app";
import { exigirSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Scan QR" };

export default async function ScanPage() {
  const user = await exigirSessao();
  return <ScanApp perfil={user.perfil} />;
}
