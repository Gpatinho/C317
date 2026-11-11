import fs from "node:fs/promises";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { PASTA_UPLOADS } from "../../src/routes/relatorios.routes.js";
import { criarEstabelecimento, criarIndicador, criarRegistro, criarUsuario, mesRelativo } from "./helpers.js";

// Fluxos das telas "Lançar valores" e "Publicar relatório" do painel,
// do lançamento até o dado aparecer no site público.

const PDF = Buffer.from("%PDF-1.4\n%teste\n%%EOF");
const arquivosEmUploads = async () => (await fs.readdir(PASTA_UPLOADS)).filter((f) => f.endsWith(".pdf")).length;

let admin: Awaited<ReturnType<typeof criarUsuario>>;
let editor: Awaited<ReturnType<typeof criarUsuario>>;
beforeEach(async () => {
  admin = await criarUsuario("ADMIN");
  editor = await criarUsuario("EDITOR");
});

describe("Lançar valores", () => {
  it("o valor lançado no painel aparece no dashboard público", async () => {
    const visitantes = await criarIndicador({ agregacao: "SOMA" });
    const mes = mesRelativo(-1);

    const lancado = await request(app)
      .post("/api/registros")
      .set(admin.auth)
      .send({ indicadorId: visitantes.id, valor: 1234, periodo: mes });
    expect(lancado.status).toBe(201);

    const res = await request(app).get(`/api/dashboard/resumo?inicio=${mes}&fim=${mes}`);
    const card = res.body.cards.find((c: { indicador: { id: number } }) => c.indicador.id === visitantes.id);
    expect(card.valor).toBe(1234);
  });

  it("EDITOR também pode lançar valores", async () => {
    const indicador = await criarIndicador();
    const res = await request(app)
      .post("/api/registros")
      .set(editor.auth)
      .send({ indicadorId: indicador.id, valor: 10, periodo: mesRelativo(-1) });
    expect(res.status).toBe(201);
    expect(res.body.usuario.id).toBe(editor.usuario.id);
  });

  it("estabelecimento inexistente dá 400", async () => {
    const indicador = await criarIndicador();
    const res = await request(app)
      .post("/api/registros")
      .set(admin.auth)
      .send({ indicadorId: indicador.id, estabelecimentoId: 999999, valor: 10, periodo: mesRelativo(-1) });
    expect(res.status).toBe(400);
  });

  it("não deixa editar um valor para negativo", async () => {
    const indicador = await criarIndicador();
    const registro = await criarRegistro({
      indicadorId: indicador.id,
      usuarioId: admin.usuario.id,
      valor: 50,
      periodo: mesRelativo(-1),
    });

    const res = await request(app).put(`/api/registros/${registro.id}`).set(admin.auth).send({ valor: -5 });
    expect(res.status).toBe(400);
    expect(res.body.detalhes[0].campo).toBe("valor");
  });

  it("filtra os lançamentos por categoria e por estabelecimento", async () => {
    const visitantes = await criarIndicador({ categoria: "Visitantes" });
    const leitos = await criarIndicador({ categoria: "Hospedagem" });
    const hotel = await criarEstabelecimento("Hotel Central");
    const mes = mesRelativo(-1);
    await criarRegistro({ indicadorId: visitantes.id, usuarioId: admin.usuario.id, valor: 1, periodo: mes });
    await criarRegistro({ indicadorId: leitos.id, usuarioId: admin.usuario.id, valor: 2, periodo: mes });
    await criarRegistro({
      indicadorId: leitos.id,
      usuarioId: admin.usuario.id,
      valor: 3,
      periodo: mes,
      estabelecimentoId: hotel.id,
    });

    const porCategoria = await request(app).get("/api/registros?categoria=Hospedagem");
    expect(porCategoria.body.map((r: { valor: number }) => r.valor).sort()).toEqual([2, 3]);

    const porHotel = await request(app).get(`/api/registros?estabelecimentoId=${hotel.id}`);
    expect(porHotel.body).toHaveLength(1);
    expect(porHotel.body[0]).toMatchObject({ valor: 3, estabelecimento: { nome: "Hotel Central" } });
  });
});

describe("Publicar relatório", () => {
  // "EDITOR não pode apagar" já está em relatorios.test.ts
  it("EDITOR também pode publicar, e o relatório aparece na lista pública", async () => {
    const res = await request(app)
      .post("/api/relatorios")
      .set(editor.auth)
      .field("titulo", "Boletim de outubro")
      .attach("arquivo", PDF, { filename: "outubro.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);

    const lista = await request(app).get("/api/relatorios");
    expect(lista.body.map((r: { titulo: string }) => r.titulo)).toContain("Boletim de outubro");
  });

  it("recusa PDF maior que 20 MB e não guarda o arquivo", async () => {
    const antes = await arquivosEmUploads();
    const grande = Buffer.concat([PDF, Buffer.alloc(21 * 1024 * 1024)]);

    const res = await request(app)
      .post("/api/relatorios")
      .set(admin.auth)
      .field("titulo", "Relatório gigante")
      .attach("arquivo", grande, { filename: "grande.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe("Arquivo maior que o limite permitido.");
    expect(await arquivosEmUploads()).toBe(antes);
  });

  it("título curto demais dá 400 ao editar", async () => {
    const publicado = await request(app)
      .post("/api/relatorios")
      .set(admin.auth)
      .field("titulo", "Boletim anual")
      .attach("arquivo", PDF, { filename: "anual.pdf", contentType: "application/pdf" });

    const res = await request(app).put(`/api/relatorios/${publicado.body.id}`).set(admin.auth).send({ titulo: "ab" });
    expect(res.status).toBe(400);
  });

  it("editar relatório inexistente dá 404", async () => {
    const res = await request(app).put("/api/relatorios/999999").set(admin.auth).send({ titulo: "Novo título" });
    expect(res.status).toBe(404);
  });
});
