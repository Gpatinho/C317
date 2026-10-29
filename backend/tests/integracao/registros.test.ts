import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { criarEstabelecimento, criarIndicador, criarRegistro, criarUsuario, mesRelativo } from "./helpers.js";

describe("POST /api/registros", () => {
  it("lança um valor do município", async () => {
    const { usuario, auth } = await criarUsuario("EDITOR");
    const indicador = await criarIndicador();

    const res = await request(app)
      .post("/api/registros")
      .set(auth)
      .send({ indicadorId: indicador.id, valor: 1520.5, periodo: "2026-03" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      indicadorId: indicador.id,
      estabelecimentoId: null,
      valor: 1520.5, // número, e não o texto do Decimal
      periodo: "2026-03",
      usuario: { id: usuario.id },
    });
  });

  it("exige login", async () => {
    const indicador = await criarIndicador();
    const res = await request(app).post("/api/registros").send({ indicadorId: indicador.id, valor: 1, periodo: "2026-03" });
    expect(res.status).toBe(401);
  });

  it("recusa um segundo valor do município no mesmo mês (409)", async () => {
    const { auth } = await criarUsuario();
    const indicador = await criarIndicador();
    const corpo = { indicadorId: indicador.id, valor: 10, periodo: "2026-03" };

    expect((await request(app).post("/api/registros").set(auth).send(corpo)).status).toBe(201);
    const res = await request(app).post("/api/registros").set(auth).send({ ...corpo, valor: 20 });
    expect(res.status).toBe(409);
    expect(res.body.erro).toMatch(/Já existe um valor/);
  });

  it("aceita o mesmo mês para estabelecimentos diferentes", async () => {
    const { auth } = await criarUsuario();
    const indicador = await criarIndicador();
    const a = await criarEstabelecimento("Hotel A");
    const b = await criarEstabelecimento("Hotel B");

    for (const e of [a, b]) {
      const res = await request(app)
        .post("/api/registros")
        .set(auth)
        .send({ indicadorId: indicador.id, valor: 10, periodo: "2026-03", estabelecimentoId: e.id });
      expect(res.status).toBe(201);
    }
  });

  it("recusa lançamento de um mês que ainda não começou", async () => {
    const { auth } = await criarUsuario();
    const indicador = await criarIndicador();
    const res = await request(app)
      .post("/api/registros")
      .set(auth)
      .send({ indicadorId: indicador.id, valor: 10, periodo: mesRelativo(1) });
    expect(res.status).toBe(400);
  });

  it("aceita o mês atual", async () => {
    const { auth } = await criarUsuario();
    const indicador = await criarIndicador();
    const res = await request(app)
      .post("/api/registros")
      .set(auth)
      .send({ indicadorId: indicador.id, valor: 10, periodo: mesRelativo(0) });
    expect(res.status).toBe(201);
  });

  it("indicador inexistente dá 400", async () => {
    const { auth } = await criarUsuario();
    const res = await request(app).post("/api/registros").set(auth).send({ indicadorId: 999999, valor: 1, periodo: "2026-03" });
    expect(res.status).toBe(400);
  });

  it("valor negativo dá 400 com o campo do erro", async () => {
    const { auth } = await criarUsuario();
    const indicador = await criarIndicador();
    const res = await request(app).post("/api/registros").set(auth).send({ indicadorId: indicador.id, valor: -5, periodo: "2026-03" });
    expect(res.status).toBe(400);
    expect(res.body.detalhes).toEqual([expect.objectContaining({ campo: "valor" })]);
  });
});

describe("GET /api/registros", () => {
  it("filtra por indicador e período, do mês mais recente para o mais antigo", async () => {
    const { usuario } = await criarUsuario();
    const visitantes = await criarIndicador();
    const leitos = await criarIndicador();
    for (const periodo of ["2026-01", "2026-02", "2026-03", "2026-04"]) {
      await criarRegistro({ indicadorId: visitantes.id, usuarioId: usuario.id, valor: 1, periodo });
    }
    await criarRegistro({ indicadorId: leitos.id, usuarioId: usuario.id, valor: 1, periodo: "2026-02" });

    const res = await request(app).get(`/api/registros?indicadorId=${visitantes.id}&inicio=2026-02&fim=2026-03`);
    expect(res.status).toBe(200);
    expect(res.body.map((r: { periodo: string }) => r.periodo)).toEqual(["2026-03", "2026-02"]);
  });
});

describe("PUT /api/registros/:id", () => {
  it("altera só o que foi enviado e registra quem editou", async () => {
    const autor = await criarUsuario("ADMIN");
    const editor = await criarUsuario("EDITOR");
    const indicador = await criarIndicador();
    const registro = await criarRegistro({ indicadorId: indicador.id, usuarioId: autor.usuario.id, valor: 10, periodo: "2026-03" });

    const res = await request(app).put(`/api/registros/${registro.id}`).set(editor.auth).send({ valor: 99 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ valor: 99, periodo: "2026-03", indicadorId: indicador.id, usuario: { id: editor.usuario.id } });
  });

  it("não deixa mudar o mês para um que já tem valor", async () => {
    const { usuario, auth } = await criarUsuario();
    const indicador = await criarIndicador();
    await criarRegistro({ indicadorId: indicador.id, usuarioId: usuario.id, valor: 10, periodo: "2026-03" });
    const abril = await criarRegistro({ indicadorId: indicador.id, usuarioId: usuario.id, valor: 20, periodo: "2026-04" });

    const res = await request(app).put(`/api/registros/${abril.id}`).set(auth).send({ periodo: "2026-03" });
    expect(res.status).toBe(409);
  });

  it("não deixa mudar o mês para um que ainda não começou", async () => {
    const { usuario, auth } = await criarUsuario();
    const indicador = await criarIndicador();
    const registro = await criarRegistro({ indicadorId: indicador.id, usuarioId: usuario.id, valor: 10, periodo: "2026-03" });

    const res = await request(app).put(`/api/registros/${registro.id}`).set(auth).send({ periodo: mesRelativo(1) });
    expect(res.status).toBe(400);
  });

  it("registro inexistente dá 404", async () => {
    const { auth } = await criarUsuario();
    const res = await request(app).put("/api/registros/999999").set(auth).send({ valor: 1 });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/registros/:id", () => {
  it("EDITOR não pode apagar (403)", async () => {
    const { usuario, auth } = await criarUsuario("EDITOR");
    const indicador = await criarIndicador();
    const registro = await criarRegistro({ indicadorId: indicador.id, usuarioId: usuario.id, valor: 10, periodo: "2026-03" });

    expect((await request(app).delete(`/api/registros/${registro.id}`).set(auth)).status).toBe(403);
    expect(await prisma.registroIndicador.count()).toBe(1);
  });

  it("ADMIN apaga (204)", async () => {
    const { usuario, auth } = await criarUsuario("ADMIN");
    const indicador = await criarIndicador();
    const registro = await criarRegistro({ indicadorId: indicador.id, usuarioId: usuario.id, valor: 10, periodo: "2026-03" });

    expect((await request(app).delete(`/api/registros/${registro.id}`).set(auth)).status).toBe(204);
    expect(await prisma.registroIndicador.count()).toBe(0);
  });

  it("apagar de novo dá 404", async () => {
    const { auth } = await criarUsuario("ADMIN");
    expect((await request(app).delete("/api/registros/999999").set(auth)).status).toBe(404);
  });
});
