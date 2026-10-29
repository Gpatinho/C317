import { afterEach, describe, expect, it, vi } from "vitest";
import { chaveMes, inicioDoMes, parseMes, periodoPadrao, somarMeses } from "../../src/lib/periodo.js";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("parseMes", () => {
  it("transforma AAAA-MM no dia 1 do mês (UTC)", () => {
    expect(parseMes("2026-03")).toEqual(utc("2026-03-01"));
  });

  it("ignora o dia quando vem AAAA-MM-DD", () => {
    expect(parseMes("2026-03-15")).toEqual(utc("2026-03-01"));
  });
});

describe("inicioDoMes", () => {
  it("volta para o dia 1, zerando o horário", () => {
    expect(inicioDoMes(new Date("2026-07-31T23:59:00Z"))).toEqual(utc("2026-07-01"));
  });
});

describe("chaveMes", () => {
  it("formata como AAAA-MM", () => {
    expect(chaveMes(utc("2026-09-01"))).toBe("2026-09");
  });
});

describe("somarMeses", () => {
  it("avança e volta meses atravessando a virada do ano", () => {
    expect(somarMeses(utc("2026-11-01"), 3)).toEqual(utc("2027-02-01"));
    expect(somarMeses(utc("2026-01-01"), -1)).toEqual(utc("2025-12-01"));
  });

  it("-12 dá o mesmo mês do ano anterior (comparação do dashboard)", () => {
    expect(somarMeses(utc("2026-09-01"), -12)).toEqual(utc("2025-09-01"));
  });
});

describe("periodoPadrao", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("vai de janeiro do ano atual até o mês atual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
    expect(periodoPadrao()).toEqual({ inicio: utc("2026-01-01"), fim: utc("2026-10-01") });
  });
});
