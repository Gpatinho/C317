import { defineConfig } from "vitest/config";

// Testes de funções puras do front (formatação, leitura de números...).
// Não precisam de navegador nem da API: rodam direto no Node.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
