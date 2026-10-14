import { Router } from "express";
import { hashCodigo } from "../lib/codigo-acesso.js";
import { HttpError } from "../lib/http-error.js";
import { inicioDoMes, parseMes } from "../lib/periodo.js";
import { prisma } from "../lib/prisma.js";
import { acessoColetaSchema, envioColetaSchema } from "../schemas/index.js";

// Rotas PÚBLICAS do formulário de autopreenchimento (item 6 da proposta).
// O estabelecimento se identifica pelo código de acesso gerado pela SMCELT.
// Nada daqui vai direto para o dashboard: todo envio entra como PENDENTE.
export const coletaRoutes = Router();

function formatar<T extends { valor: unknown; periodo: Date }>(s: T) {
  return { ...s, valor: Number(s.valor), periodo: s.periodo.toISOString().slice(0, 7) };
}

async function estabelecimentoPeloCodigo(codigo: string) {
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { codigoAcessoHash: hashCodigo(codigo) },
  });
  if (!estabelecimento) throw new HttpError(401, "Código de acesso inválido.");
  return estabelecimento;
}

// POST /api/coleta/acesso  { codigo }
// -> o estabelecimento, os indicadores que ele pode enviar e os últimos envios dele
coletaRoutes.post("/acesso", async (req, res) => {
  const { codigo } = acessoColetaSchema.parse(req.body);
  const estabelecimento = await estabelecimentoPeloCodigo(codigo);

  const [indicadores, envios] = await Promise.all([
    prisma.indicador.findMany({
      where: { ativo: true, coletaEstabelecimento: true },
      select: { id: true, nome: true, unidade: true, descricao: true },
      orderBy: { nome: "asc" },
    }),
    prisma.submissao.findMany({
      where: { estabelecimentoId: estabelecimento.id },
      select: {
        id: true, valor: true, periodo: true, status: true, motivoRejeicao: true, enviadoEm: true,
        indicador: { select: { nome: true, unidade: true } },
      },
      orderBy: { enviadoEm: "desc" },
      take: 20,
    }),
  ]);

  res.json({
    estabelecimento: { id: estabelecimento.id, nome: estabelecimento.nome, categoria: estabelecimento.categoria },
    indicadores,
    envios: envios.map(formatar),
  });
});

// POST /api/coleta/envios  { codigo, indicadorId, valor, periodo: "2026-10", observacao? }
coletaRoutes.post("/envios", async (req, res) => {
  const d = envioColetaSchema.parse(req.body);
  const estabelecimento = await estabelecimentoPeloCodigo(d.codigo);

  const periodo = parseMes(d.periodo);
  if (periodo > inicioDoMes(new Date())) {
    throw new HttpError(400, "Não é possível enviar dados de um mês que ainda não começou.");
  }

  const indicador = await prisma.indicador.findFirst({
    where: { id: d.indicadorId, ativo: true, coletaEstabelecimento: true },
  });
  if (!indicador) throw new HttpError(400, "Este indicador não está aberto para envio pelos estabelecimentos.");

  // Mesmo estabelecimento + indicador + mês
  const chave = { estabelecimentoId: estabelecimento.id, indicadorId: indicador.id, periodo };
  const [publicado, pendente] = await Promise.all([
    prisma.registroIndicador.findFirst({ where: chave }),
    prisma.submissao.findFirst({ where: { ...chave, status: "PENDENTE" } }),
  ]);
  if (publicado) throw new HttpError(409, "Já existe um valor publicado para este mês. Fale com a SMCELT para corrigir.");
  if (pendente) throw new HttpError(409, "Já existe um envio deste mês aguardando análise da SMCELT.");

  const envio = await prisma.submissao.create({
    data: { ...chave, valor: d.valor, observacao: d.observacao },
    select: {
      id: true, valor: true, periodo: true, status: true, enviadoEm: true,
      indicador: { select: { nome: true, unidade: true } },
    },
  });
  res.status(201).json(formatar(envio));
});