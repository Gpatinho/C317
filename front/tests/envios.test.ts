import { describe, expect, it } from "vitest";
import { validarMotivo } from "../app/admin/envios/validacao";

// Análise dos envios (/admin/envios): o motivo da rejeição volta para o estabelecimento

describe("validarMotivo", () => {
  it("aceita um motivo com pelo menos 3 caracteres", () => {
    expect(validarMotivo("A taxa de ocupação não pode passar de 100%.")).toBeUndefined();
    expect(validarMotivo("Erro")).toBeUndefined();
  });

  it("recusa motivo vazio ou curto demais", () => {
    expect(validarMotivo("")).toBe("Explique o motivo da rejeição.");
    expect(validarMotivo("ok")).toBe("Explique o motivo da rejeição.");
  });

  it("espaços nas pontas não contam", () => {
    expect(validarMotivo("   ab   ")).toBeDefined();
  });
});
