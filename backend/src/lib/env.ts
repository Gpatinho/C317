import "dotenv/config";

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida. Veja o .env.example.`);
  return valor;
}

const producao = process.env.NODE_ENV === "production";

export const env = {
  DATABASE_URL: obrigatoria("DATABASE_URL"),
  JWT_SECRET: obrigatoria("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "8h",
  PORT: Number(process.env.PORT ?? 3333),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
  // Pasta dos PDFs dos relatórios. Em produção, aponte para um volume persistente,
  // senão os arquivos somem a cada novo deploy.
  UPLOADS_DIR: process.env.UPLOADS_DIR ?? "uploads",
  PRODUCAO: producao,
};

// Em produção, recusa subir com o segredo de exemplo ou um segredo curto:
// com ele, qualquer pessoa conseguiria gerar um token de administrador.
if (producao && (env.JWT_SECRET === "troque-este-segredo" || env.JWT_SECRET.length < 32)) {
  throw new Error(
    "JWT_SECRET fraco para produção. Gere um com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
}
