import { describe, expect, it } from "vitest";
import { limpar, validar } from "../app/admin/estabelecimentos/validacao";

// Cadastro de estabelecimentos (/admin/estabelecimentos)

describe("validar", () => {
  it("aceita nome e categoria preenchidos", () => {
    expect(validar({ nome: "Hotel Central", categoria: "Hotel" })).toEqual({});
  });

  it("exige nome e categoria com pelo menos 2 letras", () => {
    expect(validar({ nome: "H", categoria: "" })).toEqual({
      nome: "Informe o nome do estabelecimento.",
      categoria: "Informe a categoria (ex.: Hotel).",
    });
  });

  it("um nome só com espaços conta como vazio", () => {
    expect(validar({ nome: "    ", categoria: "Pousada" }).nome).toBeDefined();
  });
});

describe("limpar", () => {
  it("tira os espaços das pontas", () => {
    expect(limpar({ nome: "  Pousada Serra  ", categoria: " Pousada ", endereco: " Rua A, 10 ", regiao: " Centro " }))
      .toEqual({ nome: "Pousada Serra", categoria: "Pousada", endereco: "Rua A, 10", regiao: "Centro" });
  });

  it("endereço e região vazios viram null (apaga o valor no banco)", () => {
    expect(limpar({ nome: "Hotel", categoria: "Hotel", endereco: "   ", regiao: "" })).toMatchObject({
      endereco: null,
      regiao: null,
    });
    expect(limpar({ nome: "Hotel", categoria: "Hotel" })).toMatchObject({ endereco: null, regiao: null });
  });
});
