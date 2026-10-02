import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";

// Express 5 já encaminha erros de funções async para cá automaticamente.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erro: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: "Dados inválidos.",
      detalhes: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
    });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Arquivo maior que o limite permitido." : err.message;
    return res.status(400).json({ erro: msg });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ erro: "Registro duplicado." });
    if (err.code === "P2025") return res.status(404).json({ erro: "Registro não encontrado." });
    if (err.code === "P2003") {
      return res.status(400).json({ erro: "Referência inválida (verifique os IDs informados)." });
    }
  }

  console.error(err);
  return res.status(500).json({ erro: "Erro interno do servidor." });
}
