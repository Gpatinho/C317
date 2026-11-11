import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Prisma } from "../../src/generated/prisma/client.js";
import { HttpError } from "../../src/lib/http-error.js";
import { exigirPapel, type UsuarioToken } from "../../src/middlewares/auth.js";
import { errorHandler } from "../../src/middlewares/error-handler.js";

// Os middlewares importam o env.ts, que exige estas variáveis. Nenhum teste daqui
// conecta no banco: os valores só precisam existir (inclusive no CI, sem .env).
vi.hoisted(() => {
  process.env.DATABASE_URL ??= "mysql://root:root@localhost:3306/observatorio";
  process.env.JWT_SECRET ??= "segredo-so-para-testes";
});

// Passa o erro pelo errorHandler com uma resposta falsa e devolve o que seria enviado
function tratar(erro: unknown) {
  const enviado = { status: 0, corpo: undefined as unknown };
  const res = {
    status(codigo: number) {
      enviado.status = codigo;
      return this;
    },
    json(corpo: unknown) {
      enviado.corpo = corpo;
      return this;
    },
  };
  errorHandler(erro, {} as Request, res as unknown as Response, vi.fn());
  return enviado;
}

const erroPrisma = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("erro do banco", { code, clientVersion: "teste" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("errorHandler", () => {
  it("HttpError usa o status e a mensagem do próprio erro", () => {
    expect(tratar(new HttpError(409, "Já existe."))).toEqual({ status: 409, corpo: { erro: "Já existe." } });
  });

  it("erro de validação (Zod) dá 400 e diz qual campo está errado", () => {
    const schema = z.object({ valor: z.number().nonnegative("O valor não pode ser negativo") });
    const resultado = schema.safeParse({ valor: -1 });
    if (resultado.success) throw new Error("o schema deveria ter recusado o valor");

    expect(tratar(resultado.error)).toEqual({
      status: 400,
      corpo: { erro: "Dados inválidos.", detalhes: [{ campo: "valor", mensagem: "O valor não pode ser negativo" }] },
    });
  });

  it("arquivo grande demais (multer) dá 400 com mensagem em português", () => {
    expect(tratar(new multer.MulterError("LIMIT_FILE_SIZE"))).toEqual({
      status: 400,
      corpo: { erro: "Arquivo maior que o limite permitido." },
    });
  });

  it("traduz os erros conhecidos do Prisma", () => {
    expect(tratar(erroPrisma("P2002"))).toEqual({ status: 409, corpo: { erro: "Registro duplicado." } });
    expect(tratar(erroPrisma("P2025"))).toEqual({ status: 404, corpo: { erro: "Registro não encontrado." } });
    expect(tratar(erroPrisma("P2003")).status).toBe(400);
  });

  it("erro inesperado dá 500 sem mostrar detalhes internos para quem chamou", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, corpo } = tratar(new Error("senha do banco: root"));
    expect(status).toBe(500);
    expect(corpo).toEqual({ erro: "Erro interno do servidor." });
    expect(JSON.stringify(corpo)).not.toContain("root");
    expect(console.error).toHaveBeenCalled(); // mas fica registrado no log do servidor
  });

  it("erro do Prisma sem tratamento específico também vira 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(tratar(erroPrisma("P1001")).status).toBe(500);
  });
});

describe("exigirPapel", () => {
  const usuario = (papel: UsuarioToken["papel"]): UsuarioToken => ({ id: 1, email: "a@b.c", papel });

  function chamar(middleware: ReturnType<typeof exigirPapel>, u?: UsuarioToken) {
    const next = vi.fn() as unknown as NextFunction;
    middleware({ usuario: u } as Request, {} as Response, next);
    return next;
  }

  it("deixa passar quem tem o papel exigido", () => {
    expect(chamar(exigirPapel("ADMIN"), usuario("ADMIN"))).toHaveBeenCalledOnce();
  });

  it("EDITOR não passa em rota só de ADMIN (403)", () => {
    expect(() => chamar(exigirPapel("ADMIN"), usuario("EDITOR"))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("sem usuário na requisição também dá 403", () => {
    expect(() => chamar(exigirPapel("ADMIN"))).toThrow(HttpError);
  });

  it("aceita mais de um papel", () => {
    const qualquerUm = exigirPapel("ADMIN", "EDITOR");
    expect(chamar(qualquerUm, usuario("EDITOR"))).toHaveBeenCalledOnce();
    expect(chamar(qualquerUm, usuario("ADMIN"))).toHaveBeenCalledOnce();
  });
});
