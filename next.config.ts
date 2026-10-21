import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Renderização de PDF e códigos de barras no servidor (Node), fora do bundle.
  serverExternalPackages: ["@react-pdf/renderer", "bwip-js"],
};

export default nextConfig;
