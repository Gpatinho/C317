import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { limiteLogin } from "../middlewares/rate-limit.js";
import { loginSchema, trocarSenhaSchema } from "../schemas/index.js";

export const authRoutes = Router();

// POST /api/auth/login  { email, senha }  ->  { token, usuario }
authRoutes.post("/login", limiteLogin, async (req, res) => {
  const { email, senha } = loginSchema.parse(req.body);

  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  // Mesma mensagem para e-mail ou senha errados (não revela qual dos dois falhou)
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    throw new HttpError(401, "E-mail ou senha incorretos.");
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, papel: usuario.papel },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions,
  );

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  });
});

// GET /api/auth/me  -> dados do usuário logado (o front usa para validar o token salvo)
authRoutes.get("/me", autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.id },
    select: { id: true, nome: true, email: true, papel: true },
  });
  if (!usuario) throw new HttpError(404, "Usuário não encontrado.");
  res.json(usuario);
});

// PUT /api/auth/senha  { senhaAtual, novaSenha }  -> 204
// O usuário logado troca a própria senha. Quem esqueceu a senha pede a um ADMIN,
// que define uma nova pela rota PUT /api/usuarios/:id.
// Usa o mesmo limite do login: impede ficar testando a senha atual em sequência.
authRoutes.put("/senha", limiteLogin, autenticar, async (req, res) => {
  const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body);

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } });
  if (!usuario || !(await bcrypt.compare(senhaAtual, usuario.senhaHash))) {
    throw new HttpError(400, "A senha atual está incorreta.");
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: await bcrypt.hash(novaSenha, 10) },
  });
  res.status(204).end();
});
