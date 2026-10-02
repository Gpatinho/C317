import "dotenv/config";

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida. Veja o .env.example.`);
  return valor;
}

export const env = {
  DATABASE_URL: obrigatoria("DATABASE_URL"),
  JWT_SECRET: obrigatoria("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "8h",
  PORT: Number(process.env.PORT ?? 3333),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
};
