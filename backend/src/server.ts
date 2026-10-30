import fs from "node:fs";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { PASTA_UPLOADS } from "./routes/relatorios.routes.js";

fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const servidor = app.listen(env.PORT, () => {
  console.log(`API do Observatório rodando em http://localhost:${env.PORT}/api`);
});

// Desligamento limpo: quando o Docker ou a plataforma de deploy pede para parar
// (SIGTERM), termina as requisições em andamento e fecha a conexão com o banco.
for (const sinal of ["SIGTERM", "SIGINT"] as const) {
  process.once(sinal, () => {
    console.log(`${sinal} recebido, encerrando a API...`);
    servidor.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // não fica preso para sempre
  });
}
