import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { hashCodigo } from "../../src/lib/codigo-acesso.js";
import { prisma } from "../../src/lib/prisma.js";

// Arquivo separado: depois que o limite estoura, a /api/coleta fica bloqueada
// para este IP até o fim do arquivo, o que atrapalharia os outros testes de coleta.
describe("limite de tentativas da coleta", () => {
  it("bloqueia depois de 20 códigos errados, mesmo com o código certo", async () => {
    await prisma.estabelecimento.create({
      data: { nome: "Hotel Teste", categoria: "Hotel", codigoAcessoHash: hashCodigo("CERT-2026") },
    });

    for (let i = 0; i < 20; i++) {
      const res = await request(app).post("/api/coleta/acesso").send({ codigo: "ERRA-0000" });
      expect(res.status).toBe(401);
    }

    const res = await request(app).post("/api/coleta/acesso").send({ codigo: "CERT-2026" });
    expect(res.status).toBe(429);
    expect(res.body.erro).toMatch(/Muitas tentativas/);
  });
});
