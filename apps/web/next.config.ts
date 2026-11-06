import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Export estático não tem servidor de otimização: as imagens já vão otimizadas.
  images: { unoptimized: true },
};

export default nextConfig;
