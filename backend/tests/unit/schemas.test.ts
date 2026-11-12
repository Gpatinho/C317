import { describe, expect, it } from "vitest";
import { envioColetaSchema, registroSchema, usuarioSchema } from "../../src/schemas/index.js";

describe("registroSchema", () => {
  it("aceita números e IDs vindos como texto", () => {
    expect(registroSchema.parse({ indicadorId: "3", valor: "12.5", periodo: "2026-09" })).toEqual({
      indicadorId: 3,
      valor: 12.5,
      periodo: "2026-09",
    });
  });

  it.each(["2026-13", "2026-00", "2026-9", "09/2026", "2026"])("recusa o período %s", (periodo) => {
    expect(registroSchema.safeParse({ indicadorId: 1, valor: 1, periodo }).success).toBe(false);
  });
});

// Valor negativo, e-mail inválido no login e os padrões de criar × editar
// (indicador e evento) são testados pela API em registros, auth, cadastros e eventos-inventario.

describe("usuarioSchema", () => {
  it("papel padrão é EDITOR", () => {
    const d = usuarioSchema.parse({ nome: "Ana", email: "ana@teste.local", senha: "123456" });
    expect(d.papel).toBe("EDITOR");
  });

  it("exige senha com pelo menos 6 caracteres", () => {
    expect(usuarioSchema.safeParse({ nome: "Ana", email: "ana@teste.local", senha: "123" }).success).toBe(false);
  });
});

describe("envioColetaSchema", () => {
  it("tira os espaços do código antes de validar", () => {
    const d = envioColetaSchema.parse({ codigo: "  CENT-2026  ", indicadorId: 1, valor: 10, periodo: "2026-09" });
    expect(d.codigo).toBe("CENT-2026");
  });

  it("recusa código curto demais", () => {
    expect(envioColetaSchema.safeParse({ codigo: "ABC", indicadorId: 1, valor: 10, periodo: "2026-09" }).success).toBe(false);
  });
});
