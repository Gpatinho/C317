import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { criarEstabelecimento, criarIndicador, criarRegistro, criarUsuario } from "./helpers.js";

describe("indicadores", () => {
  it("a lista pública esconde os inativos, a não ser com todos=true", async () => {
    const ativo = await criarIndicador();
    const inativo = await criarIndicador({ ativo: false });

    const publica = await request(app).get("/api/indicadores");
    expect(publica.body.map((i: { id: number }) => i.id)).toEqual([ativo.id]);

    const todos = await request(app).get("/api/indicadores?todos=true");
    expect(todos.body.map((i: { id: number }) => i.id).sort()).toEqual([ativo.id, inativo.id].sort());
  });

  it("lista as categorias sem repetir", async () => {
    await criarIndicador({ categoria: "Hospedagem" });
    await criarIndicador({ categoria: "Hospedagem" });
    await criarIndicador({ categoria: "Empregos" });
    const res = await request(app).get("/api/indicadores/categorias");
    expect(res.body).toEqual(["Empregos", "Hospedagem"]);
  });

  it("criar aplica os padrões e exige login", async () => {
    const corpo = { nome: "Ocupação", categoria: "Hospedagem", unidade: "%" };
    expect((await request(app).post("/api/indicadores").send(corpo)).status).toBe(401);

    const { auth } = await criarUsuario("EDITOR");
    const res = await request(app).post("/api/indicadores").set(auth).send(corpo);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...corpo, agregacao: "SOMA", ativo: true, coletaEstabelecimento: false });
  });

  it("nome repetido na mesma categoria dá 409", async () => {
    const { auth } = await criarUsuario();
    const corpo = { nome: "Ocupação", categoria: "Hospedagem", unidade: "%" };
    await request(app).post("/api/indicadores").set(auth).send(corpo);
    expect((await request(app).post("/api/indicadores").set(auth).send(corpo)).status).toBe(409);
  });

  // Regressão: editar só o nome fazia a agregação voltar para SOMA
  it("editar não mexe nos campos que não foram enviados", async () => {
    const { auth } = await criarUsuario();
    const indicador = await criarIndicador({ agregacao: "MEDIA", coletaEstabelecimento: true });

    const res = await request(app).put(`/api/indicadores/${indicador.id}`).set(auth).send({ nome: "Ocupação média" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: "Ocupação média", agregacao: "MEDIA", ativo: true, coletaEstabelecimento: true });
  });

  it("só ADMIN apaga, e os valores do indicador vão junto", async () => {
    const admin = await criarUsuario("ADMIN");
    const editor = await criarUsuario("EDITOR");
    const indicador = await criarIndicador();
    await criarRegistro({ indicadorId: indicador.id, usuarioId: admin.usuario.id, valor: 1, periodo: "2026-01" });

    expect((await request(app).delete(`/api/indicadores/${indicador.id}`).set(editor.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/indicadores/${indicador.id}`).set(admin.auth)).status).toBe(204);
    expect(await prisma.registroIndicador.count()).toBe(0);
  });

  it("busca um indicador pelo id", async () => {
    const indicador = await criarIndicador({ nome: "Taxa de ocupação", categoria: "Hospedagem" });
    const res = await request(app).get(`/api/indicadores/${indicador.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: indicador.id, nome: "Taxa de ocupação", categoria: "Hospedagem" });
  });

  it("id inexistente dá 404 e id inválido dá 400", async () => {
    expect((await request(app).get("/api/indicadores/999999")).status).toBe(404);
    expect((await request(app).get("/api/indicadores/abc")).status).toBe(400);
  });
});

describe("estabelecimentos", () => {
  it("cria, edita e lista", async () => {
    const { auth } = await criarUsuario("EDITOR");
    const criado = await request(app).post("/api/estabelecimentos").set(auth).send({ nome: "Pousada da Serra", categoria: "Pousada" });
    expect(criado.status).toBe(201);

    const editado = await request(app).put(`/api/estabelecimentos/${criado.body.id}`).set(auth).send({ regiao: "Zona rural" });
    expect(editado.body).toMatchObject({ nome: "Pousada da Serra", categoria: "Pousada", regiao: "Zona rural" });

    const lista = await request(app).get("/api/estabelecimentos?categoria=Pousada");
    expect(lista.body).toHaveLength(1);
  });

  it("busca um pelo id, diz se tem código de acesso e nunca devolve o hash", async () => {
    const admin = await criarUsuario("ADMIN");
    const hotel = await criarEstabelecimento("Hotel Central");

    const antes = await request(app).get(`/api/estabelecimentos/${hotel.id}`);
    expect(antes.status).toBe(200);
    expect(antes.body).toMatchObject({ nome: "Hotel Central", temCodigo: false });
    expect(antes.body).not.toHaveProperty("codigoAcessoHash");

    await request(app).post(`/api/estabelecimentos/${hotel.id}/codigo`).set(admin.auth);
    const depois = await request(app).get(`/api/estabelecimentos/${hotel.id}`);
    expect(depois.body.temCodigo).toBe(true);
    expect(depois.body).not.toHaveProperty("codigoAcessoHash");

    expect((await request(app).get("/api/estabelecimentos/999999")).status).toBe(404);
  });

  it("não apaga estabelecimento com valores publicados", async () => {
    const { usuario, auth } = await criarUsuario("ADMIN");
    const comValores = await criarEstabelecimento("Hotel A");
    const semValores = await criarEstabelecimento("Hotel B");
    const indicador = await criarIndicador();
    await criarRegistro({ indicadorId: indicador.id, usuarioId: usuario.id, valor: 1, periodo: "2026-01", estabelecimentoId: comValores.id });

    expect((await request(app).delete(`/api/estabelecimentos/${comValores.id}`).set(auth)).status).toBe(409);
    expect((await request(app).delete(`/api/estabelecimentos/${semValores.id}`).set(auth)).status).toBe(204);
  });
});

describe("usuários (/api/usuarios)", () => {
  it("é só para ADMIN", async () => {
    const editor = await criarUsuario("EDITOR");
    expect((await request(app).get("/api/usuarios").set(editor.auth)).status).toBe(403);
    expect((await request(app).get("/api/usuarios")).status).toBe(401);
  });

  it("cria como EDITOR por padrão e nunca devolve o hash da senha", async () => {
    const { auth } = await criarUsuario("ADMIN");
    const res = await request(app)
      .post("/api/usuarios")
      .set(auth)
      .send({ nome: "Ana", email: "Ana@Teste.local", senha: "123456" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: "Ana", email: "ana@teste.local", papel: "EDITOR" });
    expect(res.body).not.toHaveProperty("senhaHash");

    const lista = await request(app).get("/api/usuarios").set(auth);
    expect(JSON.stringify(lista.body)).not.toContain("senhaHash");
  });

  it("e-mail repetido dá 409", async () => {
    const { usuario, auth } = await criarUsuario("ADMIN");
    const res = await request(app).post("/api/usuarios").set(auth).send({ nome: "Outro", email: usuario.email, senha: "123456" });
    expect(res.status).toBe(409);
  });

  it("trocar a senha faz o login funcionar com a nova", async () => {
    const admin = await criarUsuario("ADMIN");
    const editor = await criarUsuario("EDITOR");

    const res = await request(app).put(`/api/usuarios/${editor.usuario.id}`).set(admin.auth).send({ senha: "nova-senha" });
    expect(res.body.papel).toBe("EDITOR"); // editar a senha não muda o papel

    const login = await request(app).post("/api/auth/login").send({ email: editor.usuario.email, senha: "nova-senha" });
    expect(login.status).toBe(200);
  });

  it("ninguém muda o próprio papel nem remove a si mesmo", async () => {
    const { usuario, auth } = await criarUsuario("ADMIN");
    expect((await request(app).put(`/api/usuarios/${usuario.id}`).set(auth).send({ papel: "EDITOR" })).status).toBe(400);
    expect((await request(app).delete(`/api/usuarios/${usuario.id}`).set(auth)).status).toBe(400);
  });

  it("não remove quem tem lançamentos; remove quem não tem", async () => {
    const admin = await criarUsuario("ADMIN");
    const comLancamento = await criarUsuario("EDITOR");
    const semLancamento = await criarUsuario("EDITOR");
    const indicador = await criarIndicador();
    await criarRegistro({ indicadorId: indicador.id, usuarioId: comLancamento.usuario.id, valor: 1, periodo: "2026-01" });

    expect((await request(app).delete(`/api/usuarios/${comLancamento.usuario.id}`).set(admin.auth)).status).toBe(409);
    expect((await request(app).delete(`/api/usuarios/${semLancamento.usuario.id}`).set(admin.auth)).status).toBe(204);
  });
});
