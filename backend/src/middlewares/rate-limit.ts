import { rateLimit } from "express-rate-limit";

// Limita tentativas erradas por IP para impedir que alguém fique testando
// senhas ou códigos de acesso em sequência (ataque de força bruta).
// skipSuccessfulRequests: só as tentativas que dão erro contam para o limite.

const QUINZE_MINUTOS = 15 * 60 * 1000;

// POST /api/auth/login: 10 erros a cada 15 minutos
export const limiteLogin = rateLimit({
  windowMs: QUINZE_MINUTOS,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de login. Aguarde 15 minutos e tente de novo." },
});

// /api/coleta: 20 erros a cada 15 minutos (código errado, envio repetido...)
export const limiteColeta = rateLimit({
  windowMs: QUINZE_MINUTOS,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde 15 minutos e tente de novo." },
});