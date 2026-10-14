import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { filtroSubmissoesSchema, idParam, rejeicaoSchema } from "../schemas/index.js";

// Análise dos envios dos estabelecimentos pela equipe da SMCELT (ADMIN e EDITOR).
export const submissoesRoutes = Router();
submissoesRoutes.use(autenticar);

const incluir = {
  estabelecimento: { select: { id: true, nome: true, categoria: true } },
  indicador: { select: { id: true, nome: true, unidade: true } },
  analisadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.SubmissaoInclude;

function formatar<T extends { valor: unknown; periodo: Date }>(s: T) {
  return { ...s, valor: Number(s.valor), periodo: s.periodo.toISOString().slice(0, 7) };
}

async function buscarPendente(id: number) {
  const submissao = await prisma.submissao.findUnique({ where: { id } });
  if (!submissao) throw new HttpError(404, "Envio não encontrado.");
  if (submissao.status !== "PENDENTE") throw new HttpError(409, "Este envio já foi analisado.");
  return submissao;
}

// GET /api/submissoes?status=PENDENTE&estabelecimentoId=1
// Pendentes vêm dos mais antigos para os mais novos (fila de análise)
submissoesRoutes.get("/", async (req, res) => {
  const f = filtroSubmissoesSchema.parse(req.query);
  const submissoes = await prisma.submissao.findMany({
    where: { status: f.status, estabelecimentoId: f.estabelecimentoId },
    include: incluir,
    orderBy: { enviadoEm: f.status === "PENDENTE" ? "asc" : "desc" },
    take: 200,
  });
  res.json(submissoes.map(formatar));
});

// GET /api/submissoes/contagem -> { PENDENTE: 3, APROVADA: 10, REJEITADA: 1 }
// Serve para o aviso de "envios aguardando análise" no painel administrativo
submissoesRoutes.get("/contagem", async (_req, res) => {
  const grupos = await prisma.submissao.groupBy({ by: ["status"], _count: { _all: true } });
  const contagem = { PENDENTE: 0, APROVADA: 0, REJEITADA: 0 };
  for (const g of grupos) contagem[g.status] = g._count._all;
  res.json(contagem);
});

// POST /api/submissoes/:id/aprovar
// Cria o registro_indicador (o valor passa a contar no dashboard) e marca o envio como APROVADA,
// tudo numa transação: ou as duas coisas acontecem, ou nenhuma.
submissoesRoutes.post("/:id/aprovar", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const s = await buscarPendente(id);

  const existente = await prisma.registroIndicador.findFirst({
    where: { indicadorId: s.indicadorId, estabelecimentoId: s.estabelecimentoId, periodo: s.periodo },
  });
  if (existente) {
    throw new HttpError(409, `Já existe um valor publicado para este estabelecimento neste mês (registro #${existente.id}).`);
  }

  const aprovada = await prisma.$transaction(async (tx) => {
    const registro = await tx.registroIndicador.create({
      data: {
        indicadorId: s.indicadorId,
        estabelecimentoId: s.estabelecimentoId,
        periodo: s.periodo,
        valor: s.valor,
        usuarioId: req.usuario!.id, // quem aprovou é o responsável pela publicação
      },
    });
    return tx.submissao.update({
      where: { id },
      data: { status: "APROVADA", analisadoEm: new Date(), analisadoPorId: req.usuario!.id, registroId: registro.id },
      include: incluir,
    });
  });
  res.json(formatar(aprovada));
});

// POST /api/submissoes/:id/rejeitar  { motivo }
// O motivo aparece para o estabelecimento, que pode corrigir e enviar de novo
submissoesRoutes.post("/:id/rejeitar", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { motivo } = rejeicaoSchema.parse(req.body);
  await buscarPendente(id);

  const rejeitada = await prisma.submissao.update({
    where: { id },
    data: { status: "REJEITADA", motivoRejeicao: motivo, analisadoEm: new Date(), analisadoPorId: req.usuario!.id },
    include: incluir,
  });
  res.json(formatar(rejeitada));
});