import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { criarUsuario, SENHA_PADRAO } from "./helpers.js";

// Arquivo separado: depois que o limite estoura, o /login fica bloqueado
// para este IP até o fim do arquivo, o que atrapalharia os outros testes de login.
describe("limite de tentativas de login", () => {
  it("bloqueia depois de 10 erros, mesmo com a senha certa", async () => {
    const { usuario } = await criarUsuario();

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/api/auth/login").send({ email: usuario.email, senha: "errada" });
      expect(res.status).toBe(401);
    }

    const res = await request(app).post("/api/auth/login").send({ email: usuario.email, senha: SENHA_PADRAO });
    expect(res.status).toBe(429);
    expect(res.body.erro).toMatch(/Muitas tentativas/);
  });
});
