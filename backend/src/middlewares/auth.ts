import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

export type UsuarioToken = { id: number; email: string; papel: "ADMIN" | "EDITOR" };

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

/** Exige header "Authorization: Bearer <token>". */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = req.headers.authorization?.split(" ") ?? [];
  if (tipo !== "Bearer" || !token) throw new HttpError(401, "Token não informado.");

  let id: number;
  try {
    id = (jwt.verify(token, env.JWT_SECRET) as UsuarioToken).id;
  } catch {
    throw new HttpError(401, "Token inválido ou expirado.");
  }

  // Confere o usuário no banco a cada requisição, em vez de confiar no que foi
  // gravado no token no momento do login. Assim, se alguém for removido ou mudar
  // de papel (ADMIN -> EDITOR), o token antigo perde o acesso na hora, e não só
  // quando expirar.
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, email: true, papel: true },
  });
  if (!usuario) throw new HttpError(401, "Sessão inválida. Faça login novamente.");

  req.usuario = usuario;
  next();
}

/** Use depois de autenticar(). Ex.: exigirPapel("ADMIN") */
export function exigirPapel(...papeis: UsuarioToken["papel"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      throw new HttpError(403, "Sem permissão para esta ação.");
    }
    next();
  };
}