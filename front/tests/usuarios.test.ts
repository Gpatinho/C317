import { describe, expect, it } from "vitest";
import { validar } from "../app/admin/usuarios/validacao";

// Cadastro e edição dos usuários da equipe (/admin/usuarios)

const usuario = (dados: Partial<{ nome: string; email: string; senha: string }> = {}) => ({
  nome: "Ana Editora",
  email: "ana@observatorio.local",
  papel: "EDITOR" as const,
  senha: "senha123",
  ...dados,
});

describe("validar (usuários)", () => {
  it("aceita um usuário novo completo", () => {
    expect(validar(usuario(), true)).toEqual({});
  });

  it("exige nome com pelo menos 2 letras, sem contar espaços", () => {
    expect(validar(usuario({ nome: "A" }), true).nome).toBe("Informe o nome.");
    expect(validar(usuario({ nome: "   " }), true).nome).toBe("Informe o nome.");
  });

  it("recusa e-mails inválidos", () => {
    for (const email of ["", "ana", "ana@", "ana@observatorio", "ana @x.com", "@x.com"]) {
      expect(validar(usuario({ email }), true).email, email).toBe("Informe um e-mail válido.");
    }
  });

  it("aceita e-mail com espaços nas pontas", () => {
    expect(validar(usuario({ email: "  ana@observatorio.local  " }), true)).toEqual({});
  });

  it("usuário novo precisa de senha com pelo menos 6 caracteres", () => {
    expect(validar(usuario({ senha: "" }), true).senha).toBe("A senha precisa ter pelo menos 6 caracteres.");
    expect(validar(usuario({ senha: "12345" }), true).senha).toBeDefined();
    expect(validar(usuario({ senha: "123456" }), true)).toEqual({});
  });

  it("na edição, senha em branco mantém a atual", () => {
    expect(validar(usuario({ senha: "" }), false)).toEqual({});
  });

  it("na edição, uma senha nova também precisa de 6 caracteres", () => {
    expect(validar(usuario({ senha: "123" }), false).senha).toBeDefined();
  });

  it("mostra todos os erros de uma vez", () => {
    expect(Object.keys(validar({ nome: "", email: "x", papel: "ADMIN", senha: "" }, true)).sort()).toEqual([
      "email",
      "nome",
      "senha",
    ]);
  });
});
