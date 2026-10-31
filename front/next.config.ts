import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera em .next/standalone um servidor que roda sozinho (node server.js), usado pela
  // imagem Docker do front (front/Dockerfile). Na Vercel e no npm run dev não muda nada.
  output: "standalone",
};

export default nextConfig;
