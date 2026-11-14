import { describe, expect, it } from "vitest";
import { validarCodigo, validarEnvio } from "../app/coleta/validacao";

// Formulário público de coleta (/coleta): entrada com o código e envio do valor do mês

describe("validarCodigo", () => {
  it("aceita o código completo, com ou sem hífen", () => {
    expect(validarCodigo("CENT-2026")).toBeUndefined();
    expect(validarCodigo("CENT2026")).toBeUndefined();
    expect(validarCodigo("  SERR-2026  ")).toBeUndefined();
  });

  it("recusa código vazio ou incompleto", () => {
    expect(validarCodigo("")).toBe("Digite o código completo, como CENT-2026.");
    expect(validarCodigo("CENT-20")).toBeDefined();
  });

  it("hífen, espaços e símbolos não contam como caracteres do código", () => {
    expect(validarCodigo("CE-NT 20-2")).toBeDefined(); // só 7 letras e números
    expect(validarCodigo("--------")).toBeDefined();
  });
});

describe("validarEnvio", () => {
  const hospedes = { unidade: "hóspedes" };
  const ocupacao = { unidade: "%" };

  it("aceita um valor válido e já devolve o número convertido", () => {
    expect(validarEnvio(hospedes, "1.234")).toEqual({ erros: {}, numero: 1234 });
    expect(validarEnvio(ocupacao, "83,5")).toEqual({ erros: {}, numero: 83.5 });
  });

  it("exige escolher o indicador", () => {
    expect(validarEnvio(undefined, "10").erros.indicador).toBe("Escolha o que você vai informar.");
  });

  it("recusa valor vazio ou com letras", () => {
    expect(validarEnvio(hospedes, "").erros.valor).toBe("Informe o valor, só com números.");
    expect(validarEnvio(hospedes, "dez").erros.valor).toBe("Informe o valor, só com números.");
  });

  it("recusa valor negativo", () => {
    expect(validarEnvio(hospedes, "-5").erros.valor).toBe("O valor não pode ser negativo.");
  });

  it("porcentagem não passa de 100, mas 100 é aceito", () => {
    expect(validarEnvio(ocupacao, "108").erros.valor).toBe("Uma porcentagem não pode passar de 100.");
    expect(validarEnvio(ocupacao, "100").erros).toEqual({});
  });

  it("o limite de 100 vale só para porcentagem", () => {
    expect(validarEnvio(hospedes, "250").erros).toEqual({});
  });

  it("mostra os erros dos dois campos de uma vez", () => {
    expect(Object.keys(validarEnvio(undefined, "").erros).sort()).toEqual(["indicador", "valor"]);
  });
});
