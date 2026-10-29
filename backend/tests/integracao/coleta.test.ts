import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { criarEstabelecimento, criarIndicador, criarUsuario, mesRelativo } from "./helpers.js";

// Fluxo do item 6 da proposta: a SMCELT gera o código, o estabelecimento envia
// o valor, a equipe aprova ou rejeita, e só o aprovado vai para o dashboard.

let admin: Awaited<ReturnType<typeof criarUsuario>>;
let estabelecimentoId: number;
let indicadorId: number;
let codigo: string;

beforeEach(async () => {
  admin = await criarUsuario("ADMIN");
  estabelecimentoId = (await criarEstabelecimento("Hotel Central")).id;
  indicadorId = (await criarIndicador({ nome: "Hóspedes", coletaEstabelecimento: true })).id;
  const res = await request(app).post(`/api/estabelecimentos/${estabelecimentoId}/codigo`).set(admin.auth);
  codigo = res.body.codigo;
});

const enviar = (dados: Record<string, unknown> = {}) =>
  request(app)
    .post("/api/coleta/envios")
    .send({ codigo, indicadorId, valor: 320, periodo: "2026-09", ...dados });

describe("código de acesso", () => {
  it("é gerado no formato XXXX-XXXX e aparece só na resposta", async () => {
    expect(codigo).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const lista = await request(app).get("/api/estabelecimentos");
    expect(JSON.stringify(lista.body)).not.toContain("codigoAcessoHash");
    expect(JSON.stringify(lista.body)).not.toContain(codigo);
  });

  it("só ADMIN pode gerar", async () => {
    const editor = await criarUsuario("EDITOR");
    const res = await request(app).post(`/api/estabelecimentos/${estabelecimentoId}/codigo`).set(editor.auth);
    expect(res.status).toBe(403);
  });

  it("gerar um novo código invalida o anterior", async () => {
    const novo = await request(app).post(`/api/estabelecimentos/${estabelecimentoId}/codigo`).set(admin.auth);
    expect((await request(app).post("/api/coleta/acesso").send({ codigo })).status).toBe(401);
    expect((await request(app).post("/api/coleta/acesso").send({ codigo: novo.body.codigo })).status).toBe(200);
  });
});

describe("POST /api/coleta/acesso", () => {
  it("aceita o código em minúsculas e mostra só os indicadores abertos para coleta", async () => {
    await criarIndicador({ nome: "Fechado" });
    await criarIndicador({ nome: "Inativo", coletaEstabelecimento: true, ativo: false });

    const res = await request(app).post("/api/coleta/acesso").send({ codigo: codigo.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body.estabelecimento).toEqual({ id: estabelecimentoId, nome: "Hotel Central", categoria: "Hotel" });
    expect(res.body.indicadores.map((i: { id: number }) => i.id)).toEqual([indicadorId]);
    expect(res.body.envios).toEqual([]);
  });

  it("código errado dá 401", async () => {
    const res = await request(app).post("/api/coleta/acesso").send({ codigo: "ZZZZ-ZZZZ" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/coleta/envios", () => {
  it("cria o envio como PENDENTE, sem publicar no dashboard", async () => {
    const res = await enviar();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ valor: 320, periodo: "2026-09", status: "PENDENTE" });
    expect(await prisma.registroIndicador.count()).toBe(0);
  });

  it("não aceita dois envios pendentes do mesmo mês", async () => {
    expect((await enviar()).status).toBe(201);
    expect((await enviar({ valor: 400 })).status).toBe(409);
  });

  it("recusa indicador que não está aberto para coleta", async () => {
    const fechado = await criarIndicador();
    expect((await enviar({ indicadorId: fechado.id })).status).toBe(400);
  });

  it("recusa mês que ainda não começou", async () => {
    expect((await enviar({ periodo: mesRelativo(1) })).status).toBe(400);
  });

  it("recusa código errado", async () => {
    expect((await enviar({ codigo: "ZZZZ-ZZZZ" })).status).toBe(401);
  });
});

describe("análise dos envios (/api/submissoes)", () => {
  it("exige login", async () => {
    expect((await request(app).get("/api/submissoes")).status).toBe(401);
  });

  it("conta os envios por status", async () => {
    await enviar({ periodo: "2026-08" });
    await enviar({ periodo: "2026-09" });
    const res = await request(app).get("/api/submissoes/contagem").set(admin.auth);
    expect(res.body).toEqual({ PENDENTE: 2, APROVADA: 0, REJEITADA: 0 });
  });

  it("aprovar publica o valor (cria o registro) em nome de quem aprovou", async () => {
    const editor = await criarUsuario("EDITOR");
    const envio = await enviar();

    const res = await request(app).post(`/api/submissoes/${envio.body.id}/aprovar`).set(editor.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "APROVADA", analisadoPor: { id: editor.usuario.id } });

    const registro = await prisma.registroIndicador.findUniqueOrThrow({ where: { id: res.body.registroId } });
    expect(registro).toMatchObject({ indicadorId, estabelecimentoId, usuarioId: editor.usuario.id });
    expect(Number(registro.valor)).toBe(320);

    const serie = await request(app).get(`/api/dashboard/serie?indicadorId=${indicadorId}&inicio=2026-09&fim=2026-09`);
    expect(serie.body.serie).toEqual([{ periodo: "2026-09", valor: 320 }]);
  });

  it("não deixa aprovar duas vezes, nem enviar de novo um mês já publicado", async () => {
    const envio = await enviar();
    await request(app).post(`/api/submissoes/${envio.body.id}/aprovar`).set(admin.auth);

    expect((await request(app).post(`/api/submissoes/${envio.body.id}/aprovar`).set(admin.auth)).status).toBe(409);
    expect((await enviar()).status).toBe(409);
  });

  it("rejeitar exige motivo, e o estabelecimento vê o motivo e pode reenviar", async () => {
    const envio = await enviar();

    const semMotivo = await request(app).post(`/api/submissoes/${envio.body.id}/rejeitar`).set(admin.auth).send({});
    expect(semMotivo.status).toBe(400);

    const res = await request(app)
      .post(`/api/submissoes/${envio.body.id}/rejeitar`)
      .set(admin.auth)
      .send({ motivo: "Valor muito acima dos meses anteriores" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJEITADA");

    const acesso = await request(app).post("/api/coleta/acesso").send({ codigo });
    expect(acesso.body.envios[0]).toMatchObject({
      status: "REJEITADA",
      motivoRejeicao: "Valor muito acima dos meses anteriores",
    });

    expect((await enviar({ valor: 32 })).status).toBe(201);
  });

  it("lista a fila de pendentes do mais antigo para o mais novo", async () => {
    const primeiro = await enviar({ periodo: "2026-07" });
    const segundo = await enviar({ periodo: "2026-08" });

    const res = await request(app).get("/api/submissoes?status=PENDENTE").set(admin.auth);
    expect(res.body.map((s: { id: number }) => s.id)).toEqual([primeiro.body.id, segundo.body.id]);
  });

  it("envio inexistente dá 404", async () => {
    expect((await request(app).post("/api/submissoes/999999/aprovar").set(admin.auth)).status).toBe(404);
  });
});
