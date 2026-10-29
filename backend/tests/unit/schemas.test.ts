import { describe, expect, it } from "vitest";
import {
  envioColetaSchema,
  eventoUpdateSchema,
  indicadorSchema,
  indicadorUpdateSchema,
  loginSchema,
  registroSchema,
  usuarioSchema,
} from "../../src/schemas/index.js";

describe("registroSchema", () => {
  it("aceita números e IDs vindos como texto", () => {
    expect(registroSchema.parse({ indicadorId: "3", valor: "12.5", periodo: "2026-09" })).toEqual({
      indicadorId: 3,
      valor: 12.5,
      periodo: "2026-09",
    });
  });

  it("recusa valor negativo", () => {
    expect(registroSchema.safeParse({ indicadorId: 1, valor: -1, periodo: "2026-09" }).success).toBe(false);
  });

  it.each(["2026-13", "2026-00", "2026-9", "09/2026", "2026"])("recusa o período %s", (periodo) => {
    expect(registroSchema.safeParse({ indicadorId: 1, valor: 1, periodo }).success).toBe(false);
  });
});

// Regressão: editar não pode preencher os campos não enviados com o valor padrão
// (ex.: um indicador MEDIA voltando para SOMA só porque o nome foi editado).
describe("schemas de criar × editar", () => {
  it("criar indicador aplica os padrões", () => {
    const d = indicadorSchema.parse({ nome: "Ocupação", categoria: "Hospedagem", unidade: "%" });
    expect(d).toMatchObject({ agregacao: "SOMA", ativo: true, coletaEstabelecimento: false });
  });

  it("editar indicador devolve só o que foi enviado", () => {
    expect(indicadorUpdateSchema.parse({ nome: "Ocupação média" })).toEqual({ nome: "Ocupação média" });
  });

  it("editar evento não força gratuito = true", () => {
    expect(eventoUpdateSchema.parse({ local: "Praça Central" })).toEqual({ local: "Praça Central" });
  });
});

describe("usuarioSchema", () => {
  it("papel padrão é EDITOR", () => {
    const d = usuarioSchema.parse({ nome: "Ana", email: "ana@teste.local", senha: "123456" });
    expect(d.papel).toBe("EDITOR");
  });

  it("exige senha com pelo menos 6 caracteres", () => {
    expect(usuarioSchema.safeParse({ nome: "Ana", email: "ana@teste.local", senha: "123" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("recusa e-mail inválido", () => {
    expect(loginSchema.safeParse({ email: "admin", senha: "x" }).success).toBe(false);
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
