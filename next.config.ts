import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Há outro package-lock.json numa pasta acima: fixa a raiz do projecto (silencia o aviso do Next).
  outputFileTracingRoot: path.join(__dirname),
  // Renderização de PDF e códigos de barras no servidor (Node), fora do bundle.
  serverExternalPackages: ["@react-pdf/renderer", "bwip-js"],
  // Fotos de não conformidades (comprimidas no cliente) seguem nas server actions.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  // Aliases curtos usados nas apresentações.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/producao", permanent: false },
      { source: "/scan", destination: "/producao/scan", permanent: false },
      { source: "/obras/:id/layout", destination: "/obras/:id/layout-visual", permanent: false },
    ];
  },
};

export default nextConfig;
