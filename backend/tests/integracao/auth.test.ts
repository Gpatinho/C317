import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { env } from "../../src/lib/env.js";
import { prisma } from "../../src/lib/prisma.js";
import { criarUsuario, SENHA_PADRAO } from "./helpers.js";

describe("GET /api/health", () => {
  it("responde que a API está online", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "online" });
  });
});

describe("rota inexistente", () => {
  it("devolve 404 no formato padrão de erro", async () => {
    const res = await request(app).get("/api/nao-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: "Rota não encontrada." });
  });
});

describe("POST /api/auth/login", () => {
  it("devolve o token e o usuário, sem o hash da senha", async () => {
    const { usuario } = await criarUsuario("ADMIN");
    const res = await request(app).post("/api/auth/login").send({ email: usuario.email, senha: SENHA_PADRAO });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toEqual({ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: "ADMIN" });
    expect(JSON.stringify(res.body)).not.toContain("senhaHash");
  });

  it("aceita o e-mail com letras maiúsculas", async () => {
    const { usuario } = await criarUsuario();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: usuario.email.toUpperCase(), senha: SENHA_PADRAO });
    expect(res.status).toBe(200);
  });

  it("senha errada e e-mail inexistente dão a mesma mensagem", async () => {
    const { usuario } = await criarUsuario();
    const senhaErrada = await request(app).post("/api/auth/login").send({ email: usuario.email, senha: "errada" });
    const emailErrado = await request(app).post("/api/auth/login").send({ email: "ninguem@teste.local", senha: "x" });

    expect(senhaErrada.status).toBe(401);
    expect(emailErrado.status).toBe(401);
    expect(senhaErrada.body.erro).toBe(emailErrado.body.erro);
  });

  it("valida o corpo da requisição", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nao-e-email" });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("Dados inválidos.");
    expect(res.body.detalhes.map((d: { campo: string }) => d.campo)).toEqual(
      expect.arrayContaining(["email", "senha"]),
    );
  });
});

describe("GET /api/auth/me", () => {
  it("devolve o usuário do token", async () => {
    const { usuario, auth } = await criarUsuario("EDITOR");
    const res = await request(app).get("/api/auth/me").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: "EDITOR" });
  });

  it("sem token devolve 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("token assinado com outro segredo devolve 401", async () => {
    const falso = jwt.sign({ id: 1, email: "x@x.com", papel: "ADMIN" }, "outro-segredo");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${falso}`);
    expect(res.status).toBe(401);
  });

  it("token expirado devolve 401", async () => {
    const { usuario } = await criarUsuario();
    const expirado = jwt.sign({ id: usuario.id, email: usuario.email, papel: "ADMIN" }, env.JWT_SECRET, {
      expiresIn: -10,
    });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expirado}`);
    expect(res.status).toBe(401);
  });

  it("token de um usuário removido perde o acesso na hora", async () => {
    const { usuario, auth } = await criarUsuario();
    await prisma.usuario.delete({ where: { id: usuario.id } });

    const res = await request(app).get("/api/auth/me").set(auth);
    expect(res.status).toBe(401);
  });
});

describe("permissões", () => {
  it("quem perdeu o papel de ADMIN perde o acesso de ADMIN com o mesmo token", async () => {
    const { usuario, auth } = await criarUsuario("ADMIN");
    expect((await request(app).get("/api/usuarios").set(auth)).status).toBe(200);

    await prisma.usuario.update({ where: { id: usuario.id }, data: { papel: "EDITOR" } });
    expect((await request(app).get("/api/usuarios").set(auth)).status).toBe(403);
  });
});
