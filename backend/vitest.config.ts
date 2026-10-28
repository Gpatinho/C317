import "dotenv/config";
import { defineConfig } from "vitest/config";

// Os testes de integração usam um banco SEPARADO (observatorio_test), que é apagado
// e recriado a cada execução. Por padrão é o mesmo MySQL do .env com outro nome de banco;
// para usar outro servidor, defina DATABASE_URL_TEST.
function urlBancoTeste() {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  const url = new URL(process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/observatorio");
  url.pathname = "/observatorio_test";
  return url.toString();
}

const DATABASE_URL = urlBancoTeste();
if (!new URL(DATABASE_URL).pathname.endsWith("_test")) {
  // Proteção: nunca rodar os testes (que apagam tudo) no banco de desenvolvimento
  throw new Error("O banco dos testes precisa terminar em _test (ex.: observatorio_test).");
}

export default defineConfig({
  test: {
    projects: [
      {
        // Funções puras: não precisam de banco
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        // Chamadas HTTP de verdade na API, com o MySQL
        test: {
          name: "integracao",
          include: ["tests/integracao/**/*.test.ts"],
          env: { DATABASE_URL, JWT_SECRET: "segredo-so-para-testes" },
          globalSetup: ["tests/integracao/global-setup.ts"],
          setupFiles: ["tests/integracao/setup.ts"],
          // Todos os arquivos usam o mesmo banco: um de cada vez para não se atrapalharem
          fileParallelism: false,
          testTimeout: 15000,
        },
      },
    ],
  },
});
