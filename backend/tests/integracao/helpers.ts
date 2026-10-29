import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Agregacao, Papel } from "../../src/generated/prisma/enums.js";
import { env } from "../../src/lib/env.js";
import { parseMes } from "../../src/lib/periodo.js";
import { prisma } from "../../src/lib/prisma.js";
import { PASTA_UPLOADS } from "../../src/routes/relatorios.routes.js";

export const SENHA_PADRAO = "senha123";

// Mês relativo ao atual no formato "AAAA-MM" (0 = este mês, 1 = o próximo, -1 = o anterior)
export function mesRelativo(meses: number) {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + meses, 1)).toISOString().slice(0, 7);
}

// Dia relativo a hoje no formato "AAAA-MM-DD"
export function diaRelativo(dias: number) {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Apaga todas as tabelas (filhas antes das mães, por causa das chaves estrangeiras)
// e os PDFs que os testes enviaram para uploads/.
export async function limparBanco() {
  const relatorios = await prisma.relatorio.findMany({ select: { arquivoPath: true } });
  await Promise.all(relatorios.map((r) => fs.rm(path.join(PASTA_UPLOADS, r.arquivoPath), { force: true })));

  await prisma.submissao.deleteMany();
  await prisma.registroIndicador.deleteMany();
  await prisma.relatorio.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.atrativo.deleteMany();
  await prisma.estabelecimento.deleteMany();
  await prisma.indicador.deleteMany();
  await prisma.usuario.deleteMany();
}

let contador = 0;

// Cria um usuário e já devolve o token, sem passar pelo /login
// (assim os testes não esbarram no limite de tentativas de login).
export async function criarUsuario(papel: Papel = "ADMIN") {
  contador++;
  const usuario = await prisma.usuario.create({
    data: {
      nome: `${papel} ${contador}`,
      email: `${papel.toLowerCase()}${contador}@teste.local`,
      senhaHash: await bcrypt.hash(SENHA_PADRAO, 4),
      papel,
    },
  });
  const token = jwt.sign({ id: usuario.id, email: usuario.email, papel }, env.JWT_SECRET);
  return { usuario, token, auth: { Authorization: `Bearer ${token}` } };
}

export function criarIndicador(dados: {
  nome?: string;
  categoria?: string;
  agregacao?: Agregacao;
  ativo?: boolean;
  coletaEstabelecimento?: boolean;
} = {}) {
  contador++;
  return prisma.indicador.create({
    data: { nome: `Indicador ${contador}`, categoria: "Visitantes", unidade: "pessoas", ...dados },
  });
}

export function criarEstabelecimento(nome = "Hotel Teste") {
  return prisma.estabelecimento.create({ data: { nome, categoria: "Hotel" } });
}

// periodo no formato "2026-03"
export function criarRegistro(dados: {
  indicadorId: number;
  usuarioId: number;
  valor: number;
  periodo: string;
  estabelecimentoId?: number | null;
}) {
  return prisma.registroIndicador.create({ data: { ...dados, periodo: parseMes(dados.periodo) } });
}
