import { describe, expect, it } from "vitest";
import { gerarCodigo, hashCodigo } from "../../src/lib/codigo-acesso.js";

describe("gerarCodigo", () => {
  it("gera no formato XXXX-XXXX sem 0, O, 1 e I", () => {
    for (let i = 0; i < 200; i++) {
      expect(gerarCodigo()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });

  it("não repete códigos", () => {
    const codigos = new Set(Array.from({ length: 200 }, gerarCodigo));
    expect(codigos.size).toBe(200);
  });
});

describe("hashCodigo", () => {
  it("gera um SHA-256 (64 caracteres hexadecimais)", () => {
    expect(hashCodigo("7KQ2-M9PX")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignora maiúsculas, espaços e o traço", () => {
    const esperado = hashCodigo("7KQ2-M9PX");
    expect(hashCodigo("7kq2-m9px")).toBe(esperado);
    expect(hashCodigo(" 7KQ2 M9PX ")).toBe(esperado);
    expect(hashCodigo("7KQ2M9PX")).toBe(esperado);
  });

  it("códigos diferentes geram hashes diferentes", () => {
    expect(hashCodigo("7KQ2-M9PX")).not.toBe(hashCodigo("7KQ2-M9PY"));
  });
});
