import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/http-error.js";

export type UsuarioToken = { id: number; email: string; papel: "ADMIN" | "EDITOR" };

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

/** Exige header "Authorization: Bearer <token>". */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = req.headers.authorization?.split(" ") ?? [];
  if (tipo !== "Bearer" || !token) throw new HttpError(401, "Token não informado.");

  try {
    req.usuario = jwt.verify(token, env.JWT_SECRET) as UsuarioToken;
  } catch {
    throw new HttpError(401, "Token inválido ou expirado.");
  }
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
