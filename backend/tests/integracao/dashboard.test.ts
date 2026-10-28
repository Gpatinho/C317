import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { criarEstabelecimento, criarIndicador, criarRegistro, criarUsuario } from "./helpers.js";

let usuarioId: number;
beforeEach(async () => {
  usuarioId = (await criarUsuario()).usuario.id;
});

// Lança vários meses de uma vez: { "2026-01": 100, "2026-02": 120 }
async function lancar(indicadorId: number, valores: Record<string, number>, estabelecimentoId?: number) {
  for (const [periodo, valor] of Object.entries(valores)) {
    await criarRegistro({ indicadorId, usuarioId, valor, periodo, estabelecimentoId });
  }
}

type Card = { indicador: { id: number }; valor: number | null };
const cardDe = (body: { cards: Card[] }, id: number) => body.cards.find((c) => c.indicador.id === id);

describe("GET /api/dashboard/resumo", () => {
  it("compara com o mesmo período do ano anterior", async () => {
    const visitantes = await criarIndicador({ agregacao: "SOMA" });
    await lancar(visitantes.id, { "2025-01": 100, "2025-02": 100, "2025-03": 100, "2025-04": 999 });
    await lancar(visitantes.id, { "2026-01": 110, "2026-02": 110, "2026-03": 110 });

    const res = await request(app).get("/api/dashboard/resumo?inicio=2026-01&fim=2026-06");
    expect(res.status).toBe(200);
    expect(res.body.periodo).toEqual({ inicio: "2026-01", fim: "2026-06" });
    expect(cardDe(res.body, visitantes.id)).toMatchObject({
      valor: 330,
      valorAnterior: 300, // abril/2025 fica de fora: 2026 só tem dados até março
      variacao: 10,
      periodo: { inicio: "2026-01", fim: "2026-03" },
      periodoAnterior: { inicio: "2025-01", fim: "2025-03" },
    });
  });

  it("usa o tipo de agregação de cada indicador", async () => {
    const leitos = await criarIndicador({ agregacao: "ULTIMO" });
    const ocupacao = await criarIndicador({ agregacao: "MEDIA" });
    await lancar(leitos.id, { "2026-01": 500, "2026-02": 520 });
    await lancar(ocupacao.id, { "2026-01": 60, "2026-02": 70 });

    const res = await request(app).get("/api/dashboard/resumo?inicio=2026-01&fim=2026-02");
    expect(cardDe(res.body, leitos.id)?.valor).toBe(520);
    expect(cardDe(res.body, ocupacao.id)?.valor).toBe(65);
  });

  it("indicador sem dados aparece com valor null e sem comparação", async () => {
    const indicador = await criarIndicador();
    const res = await request(app).get("/api/dashboard/resumo?inicio=2026-01&fim=2026-03");
    expect(cardDe(res.body, indicador.id)).toMatchObject({
      valor: null,
      valorAnterior: null,
      variacao: null,
      periodo: null,
      periodoAnterior: null,
    });
  });

  it("sem dados do ano anterior, a variação é null", async () => {
    const indicador = await criarIndicador();
    await lancar(indicador.id, { "2026-01": 10 });
    const res = await request(app).get("/api/dashboard/resumo?inicio=2026-01&fim=2026-01");
    expect(cardDe(res.body, indicador.id)).toMatchObject({ valor: 10, variacao: null, periodoAnterior: null });
  });

  it("filtra por categoria e esconde indicadores inativos", async () => {
    const hospedagem = await criarIndicador({ categoria: "Hospedagem" });
    await criarIndicador({ categoria: "Empregos" });
    await criarIndicador({ categoria: "Hospedagem", ativo: false });

    const res = await request(app).get("/api/dashboard/resumo?categoria=Hospedagem&inicio=2026-01&fim=2026-01");
    expect(res.body.cards.map((c: Card) => c.indicador.id)).toEqual([hospedagem.id]);
  });

  it("informa quando houve a última atualização", async () => {
    const indicador = await criarIndicador();
    const vazio = await request(app).get("/api/dashboard/resumo");
    expect(vazio.body.atualizadoEm).toBeNull();

    await lancar(indicador.id, { "2026-01": 10 });
    const res = await request(app).get("/api/dashboard/resumo");
    expect(res.body.atualizadoEm).toEqual(expect.any(String));
  });

  it("início depois do fim dá 400", async () => {
    const res = await request(app).get("/api/dashboard/resumo?inicio=2026-05&fim=2026-01");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/dashboard/serie", () => {
  it("devolve todos os meses do período, com null onde não há dado", async () => {
    const indicador = await criarIndicador();
    await lancar(indicador.id, { "2026-01": 10, "2026-03": 30 });

    const res = await request(app).get(`/api/dashboard/serie?indicadorId=${indicador.id}&inicio=2026-01&fim=2026-04`);
    expect(res.status).toBe(200);
    expect(res.body.indicador.id).toBe(indicador.id);
    expect(res.body.serie).toEqual([
      { periodo: "2026-01", valor: 10 },
      { periodo: "2026-02", valor: null },
      { periodo: "2026-03", valor: 30 },
      { periodo: "2026-04", valor: null },
    ]);
  });

  it("combina estabelecimentos, mas o valor do município tem prioridade", async () => {
    const indicador = await criarIndicador({ agregacao: "SOMA" });
    const a = await criarEstabelecimento("Hotel A");
    const b = await criarEstabelecimento("Hotel B");
    await lancar(indicador.id, { "2026-01": 40, "2026-02": 40 }, a.id);
    await lancar(indicador.id, { "2026-01": 60, "2026-02": 60 }, b.id);
    await lancar(indicador.id, { "2026-02": 1000 }); // município

    const res = await request(app).get(`/api/dashboard/serie?indicadorId=${indicador.id}&inicio=2026-01&fim=2026-02`);
    expect(res.body.serie).toEqual([
      { periodo: "2026-01", valor: 100 },
      { periodo: "2026-02", valor: 1000 },
    ]);
  });

  it("indicador inexistente dá 404 e sem indicadorId dá 400", async () => {
    expect((await request(app).get("/api/dashboard/serie?indicadorId=999999")).status).toBe(404);
    expect((await request(app).get("/api/dashboard/serie")).status).toBe(400);
  });
});
