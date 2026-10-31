import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { criarUsuario, SENHA_PADRAO } from "./helpers.js";

// Arquivo separado: o PUT /api/auth/senha usa o mesmo limite de tentativas do login,
// e os erros daqui somariam com os do auth.test.ts.
describe("PUT /api/auth/senha", () => {
  it("troca a própria senha: a nova funciona no login e a antiga não", async () => {
    const { usuario, auth } = await criarUsuario("EDITOR");

    const res = await request(app).put("/api/auth/senha").set(auth).send({ senhaAtual: SENHA_PADRAO, novaSenha: "novaSenha456" });
    expect(res.status).toBe(204);

    const nova = await request(app).post("/api/auth/login").send({ email: usuario.email, senha: "novaSenha456" });
    expect(nova.status).toBe(200);
    const antiga = await request(app).post("/api/auth/login").send({ email: usuario.email, senha: SENHA_PADRAO });
    expect(antiga.status).toBe(401);
  });

  it("recusa a senha atual errada", async () => {
    const { auth } = await criarUsuario();
    const res = await request(app).put("/api/auth/senha").set(auth).send({ senhaAtual: "errada", novaSenha: "novaSenha456" });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("A senha atual está incorreta.");
  });

  it("valida a nova senha: mínimo de 6 caracteres e diferente da atual", async () => {
    const { auth } = await criarUsuario();
    const curta = await request(app).put("/api/auth/senha").set(auth).send({ senhaAtual: SENHA_PADRAO, novaSenha: "123" });
    expect(curta.status).toBe(400);
    const igual = await request(app).put("/api/auth/senha").set(auth).send({ senhaAtual: SENHA_PADRAO, novaSenha: SENHA_PADRAO });
    expect(igual.status).toBe(400);
  });

  it("exige login", async () => {
    const res = await request(app).put("/api/auth/senha").send({ senhaAtual: SENHA_PADRAO, novaSenha: "novaSenha456" });
    expect(res.status).toBe(401);
  });
});
