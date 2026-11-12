import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatarMes,
  formatarValor,
  lerNumero,
  numeroParaCampo,
  ultimosMeses,
} from "../app/admin/_componentes/formato";

describe("lerNumero", () => {
  it("entende o ponto como separador de milhar", () => {
    expect(lerNumero("29.600")).toBe(29600);
    expect(lerNumero("1.234.567")).toBe(1234567);
  });

  it("entende a vírgula como separador decimal", () => {
    expect(lerNumero("83,5")).toBe(83.5);
    expect(lerNumero("1.234,5")).toBe(1234.5);
  });

  it("aceita ponto decimal quando não parece milhar", () => {
    expect(lerNumero("83.5")).toBe(83.5);
    expect(lerNumero("0.75")).toBe(0.75);
  });

  it("aceita números simples e negativos", () => {
    expect(lerNumero("42")).toBe(42);
    expect(lerNumero("-1.500")).toBe(-1500);
  });

  it("ignora espaços em volta e no meio", () => {
    expect(lerNumero("  29 600 ")).toBe(29600);
  });

  it("devolve null para campo vazio", () => {
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("   ")).toBeNull();
  });

  it("devolve null para texto inválido", () => {
    expect(lerNumero("abc")).toBeNull();
    expect(lerNumero("12,5,3")).toBeNull();
    expect(lerNumero("Infinity")).toBeNull();
  });
});

describe("numeroParaCampo", () => {
  it("é o caminho de volta do lerNumero (usado ao editar um valor)", () => {
    for (const n of [29600, 83.5, 1234.5, 0, 1234567]) {
      expect(lerNumero(numeroParaCampo(n))).toBe(n);
    }
  });
});

describe("formatarMes", () => {
  it("converte AAAA-MM em Mês/Ano", () => {
    expect(formatarMes("2026-09")).toBe("Set/2026");
  });

  it("acerta o primeiro e o último mês do ano", () => {
    expect(formatarMes("2026-01")).toBe("Jan/2026");
    expect(formatarMes("2025-12")).toBe("Dez/2025");
  });
});

describe("formatarValor", () => {
  it("usa o separador de milhar brasileiro e a unidade", () => {
    expect(formatarValor(29600, "pessoas")).toBe("29.600 pessoas");
    expect(formatarValor(1120, "leitos")).toBe("1.120 leitos");
  });

  it("cola o % no número", () => {
    expect(formatarValor(83, "%")).toBe("83%");
    expect(formatarValor(83.5, "%")).toBe("83,5%");
  });

  it("arredonda para no máximo 2 casas decimais", () => {
    expect(formatarValor(1234.567, "leitos")).toBe("1.234,57 leitos");
  });

  it("mostra o zero", () => {
    expect(formatarValor(0, "empresas")).toBe("0 empresas");
  });
});

describe("ultimosMeses", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa no mês atual e volta no tempo, sem meses futuros", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14)); // 14/10/2026

    expect(ultimosMeses(3)).toEqual(["2026-10", "2026-09", "2026-08"]);
  });

  it("atravessa a virada do ano", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 31)); // 31/01/2026

    expect(ultimosMeses(3)).toEqual(["2026-01", "2025-12", "2025-11"]);
  });

  it("por padrão traz 10 anos (120 meses), sem repetir nenhum", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14));

    const meses = ultimosMeses();
    expect(meses).toHaveLength(120);
    expect(new Set(meses).size).toBe(120);
    expect(meses.at(-1)).toBe("2016-11");
  });
});
