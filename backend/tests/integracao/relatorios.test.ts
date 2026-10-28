import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { PASTA_UPLOADS } from "../../src/routes/relatorios.routes.js";
import { criarUsuario } from "./helpers.js";

const PDF = Buffer.from("%PDF-1.4\n%conteúdo de teste\n%%EOF");

let admin: Awaited<ReturnType<typeof criarUsuario>>;
beforeEach(async () => {
  admin = await criarUsuario("ADMIN");
});

function publicar(opcoes: { titulo?: string; ano?: string; arquivo?: Buffer; nome?: string; tipo?: string } = {}) {
  return request(app)
    .post("/api/relatorios")
    .set(admin.auth)
    .field("titulo", opcoes.titulo ?? "Boletim do 1º semestre")
    .field("ano", opcoes.ano ?? "2026")
    .attach("arquivo", opcoes.arquivo ?? PDF, {
      filename: opcoes.nome ?? "boletim.pdf",
      contentType: opcoes.tipo ?? "application/pdf",
    });
}

const arquivosEmUploads = async () => (await fs.readdir(PASTA_UPLOADS)).filter((f) => f.endsWith(".pdf")).length;

describe("POST /api/relatorios", () => {
  it("publica o PDF e guarda o nome original (com acentos)", async () => {
    const res = await publicar({ nome: "Relatório Turismo 2026.pdf" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      titulo: "Boletim do 1º semestre",
      ano: 2026,
      arquivoNome: "Relatório Turismo 2026.pdf",
      tamanhoBytes: PDF.length,
    });
    expect(res.body).not.toHaveProperty("arquivoPath"); // caminho interno não sai na API
  });

  it("exige login", async () => {
    const res = await request(app).post("/api/relatorios").field("titulo", "Teste").attach("arquivo", PDF, "a.pdf");
    expect(res.status).toBe(401);
  });

  it("sem arquivo dá 400", async () => {
    const res = await request(app).post("/api/relatorios").set(admin.auth).field("titulo", "Sem arquivo");
    expect(res.status).toBe(400);
  });

  it("recusa arquivo que não é PDF", async () => {
    const res = await publicar({ nome: "planilha.xlsx", tipo: "application/vnd.ms-excel" });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/PDF/);
  });

  it("recusa arquivo com nome .pdf mas sem conteúdo de PDF, e não deixa o arquivo para trás", async () => {
    const antes = await arquivosEmUploads();
    const res = await publicar({ arquivo: Buffer.from("isto não é um pdf") });
    expect(res.status).toBe(400);
    expect(await arquivosEmUploads()).toBe(antes);
  });

  it("dados inválidos também apagam o arquivo enviado", async () => {
    const antes = await arquivosEmUploads();
    const res = await publicar({ titulo: "a" });
    expect(res.status).toBe(400);
    expect(await arquivosEmUploads()).toBe(antes);
  });
});

describe("GET /api/relatorios", () => {
  it("lista sem login, do mais recente para o mais antigo, filtrando por ano", async () => {
    const antigo = await publicar({ titulo: "Boletim 2025", ano: "2025" });
    const novo = await publicar({ titulo: "Boletim 2026", ano: "2026" });

    const todos = await request(app).get("/api/relatorios");
    expect(todos.body.map((r: { id: number }) => r.id)).toEqual([novo.body.id, antigo.body.id]);

    const de2025 = await request(app).get("/api/relatorios?ano=2025");
    expect(de2025.body.map((r: { id: number }) => r.id)).toEqual([antigo.body.id]);
  });
});

describe("GET /api/relatorios/:id/download", () => {
  it("baixa o PDF com o nome original", async () => {
    const { body } = await publicar({ nome: "boletim.pdf" });
    const res = await request(app)
      .get(`/api/relatorios/${body.id}/download`)
      .buffer(true)
      .parse((resposta, cb) => {
        const partes: Buffer[] = [];
        resposta.on("data", (p: Buffer) => partes.push(p));
        resposta.on("end", () => cb(null, Buffer.concat(partes)));
      });

    expect(res.status).toBe(200);
    // O Express só põe aspas no nome quando precisa (espaços, acentos...)
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="?boletim\.pdf"?$/);
    expect(Buffer.from(res.body).equals(PDF)).toBe(true);
  });

  it("com inline=1, abre no navegador", async () => {
    const { body } = await publicar();
    const res = await request(app).get(`/api/relatorios/${body.id}/download?inline=1`);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  it("arquivo apagado do servidor dá 410", async () => {
    const { body } = await publicar();
    const { arquivoPath } = await prisma.relatorio.findUniqueOrThrow({ where: { id: body.id } });
    await fs.rm(path.join(PASTA_UPLOADS, arquivoPath));

    expect((await request(app).get(`/api/relatorios/${body.id}/download`)).status).toBe(410);
  });

  it("relatório inexistente dá 404", async () => {
    expect((await request(app).get("/api/relatorios/999999/download")).status).toBe(404);
  });
});

describe("PUT e DELETE /api/relatorios/:id", () => {
  it("edita o título sem mexer no resto", async () => {
    const { body } = await publicar();
    const res = await request(app).put(`/api/relatorios/${body.id}`).set(admin.auth).send({ titulo: "Novo título" });
    expect(res.body).toMatchObject({ titulo: "Novo título", ano: 2026, arquivoNome: "boletim.pdf" });
  });

  it("só ADMIN apaga, e o arquivo some junto", async () => {
    const editor = await criarUsuario("EDITOR");
    const { body } = await publicar();
    const { arquivoPath } = await prisma.relatorio.findUniqueOrThrow({ where: { id: body.id } });

    expect((await request(app).delete(`/api/relatorios/${body.id}`).set(editor.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/relatorios/${body.id}`).set(admin.auth)).status).toBe(204);
    await expect(fs.access(path.join(PASTA_UPLOADS, arquivoPath))).rejects.toThrow();
  });
});
