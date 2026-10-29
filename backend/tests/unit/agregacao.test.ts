import { describe, expect, it } from "vitest";
import { agregar, serieMensal, variacaoPercentual } from "../../src/lib/agregacao.js";

// Atalho para montar registros: estabelecimentoId null = valor do município
const reg = (periodo: string, valor: number, estabelecimentoId: number | null = null) => ({
  periodo: new Date(`${periodo}-01T00:00:00Z`),
  valor,
  estabelecimentoId,
});

describe("serieMensal", () => {
  it("devolve um ponto por mês, em ordem cronológica", () => {
    const serie = serieMensal([reg("2026-03", 30), reg("2026-01", 10), reg("2026-02", 20)], "SOMA");
    expect(serie).toEqual([
      { periodo: "2026-01", valor: 10 },
      { periodo: "2026-02", valor: 20 },
      { periodo: "2026-03", valor: 30 },
    ]);
  });

  it("soma os estabelecimentos quando não há valor do município (ex.: leitos)", () => {
    const serie = serieMensal([reg("2026-01", 40, 1), reg("2026-01", 60, 2)], "SOMA");
    expect(serie).toEqual([{ periodo: "2026-01", valor: 100 }]);
  });

  it("tira a média dos estabelecimentos para taxas (MEDIA)", () => {
    const serie = serieMensal([reg("2026-01", 70, 1), reg("2026-01", 80, 2), reg("2026-01", 81, 3)], "MEDIA");
    expect(serie).toEqual([{ periodo: "2026-01", valor: 77 }]);
  });

  it("dá prioridade ao valor do município sobre os estabelecimentos no mesmo mês", () => {
    const serie = serieMensal([reg("2026-01", 40, 1), reg("2026-01", 500), reg("2026-01", 60, 2)], "SOMA");
    expect(serie).toEqual([{ periodo: "2026-01", valor: 500 }]);
  });

  it("aceita o Decimal do Prisma (vem como texto)", () => {
    const serie = serieMensal([{ ...reg("2026-01", 0), valor: "12.50" }], "SOMA");
    expect(serie).toEqual([{ periodo: "2026-01", valor: 12.5 }]);
  });

  it("sem registros, devolve série vazia", () => {
    expect(serieMensal([], "SOMA")).toEqual([]);
  });
});

describe("agregar", () => {
  const serie = [{ valor: 10 }, { valor: 20 }, { valor: 35 }];

  it("SOMA soma os meses (ex.: visitantes no período)", () => {
    expect(agregar(serie, "SOMA")).toBe(65);
  });

  it("MEDIA tira a média com 2 casas (ex.: ocupação)", () => {
    expect(agregar(serie, "MEDIA")).toBe(21.67);
  });

  it("ULTIMO pega o mês mais recente (ex.: leitos existentes)", () => {
    expect(agregar(serie, "ULTIMO")).toBe(35);
  });

  it("série vazia dá null (card sem dados), e não zero", () => {
    expect(agregar([], "SOMA")).toBeNull();
  });
});

describe("variacaoPercentual", () => {
  it("calcula a variação com 1 casa decimal", () => {
    expect(variacaoPercentual(110, 100)).toBe(10);
    expect(variacaoPercentual(90, 120)).toBe(-25);
    expect(variacaoPercentual(1124, 1000)).toBe(12.4);
  });

  it("devolve null quando não dá para comparar", () => {
    expect(variacaoPercentual(null, 100)).toBeNull();
    expect(variacaoPercentual(100, null)).toBeNull();
    expect(variacaoPercentual(100, 0)).toBeNull(); // evita divisão por zero
  });
});
