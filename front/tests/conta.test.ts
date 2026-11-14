import { describe, expect, it } from "vitest";
import { validar } from "../app/admin/conta/validacao";

// Troca da própria senha (/admin/conta)

const campos = (senhaAtual: string, novaSenha: string, confirmar = novaSenha) => ({ senhaAtual, novaSenha, confirmar });

describe("validar (troca de senha)", () => {
  it("aceita uma troca válida", () => {
    expect(validar(campos("admin123", "nova-senha"))).toEqual({});
  });

  it("exige a senha atual", () => {
    expect(validar(campos("", "nova-senha")).senhaAtual).toBe("Informe a senha atual.");
  });

  it("a nova senha precisa ter pelo menos 6 caracteres", () => {
    expect(validar(campos("admin123", "12345")).novaSenha).toBe("A nova senha precisa ter pelo menos 6 caracteres.");
    expect(validar(campos("admin123", "123456"))).toEqual({});
  });

  it("a nova senha precisa ser diferente da atual", () => {
    expect(validar(campos("admin123", "admin123")).novaSenha).toBe("A nova senha precisa ser diferente da atual.");
  });

  it("a confirmação precisa ser igual à nova senha", () => {
    expect(validar(campos("admin123", "nova-senha", "nova-senh")).confirmar).toBe("As senhas não são iguais.");
  });

  it("com a nova senha inválida, não cobra a confirmação ainda", () => {
    const erros = validar(campos("admin123", "123", "456"));
    expect(erros.novaSenha).toBeDefined();
    expect(erros.confirmar).toBeUndefined();
  });
});
