import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";
import { parseMes } from "../lib/periodo.js";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { filtroRegistrosSchema, idParam, registroSchema } from "../schemas/index.js";

export const registrosRoutes = Router();

// Decimal do Prisma -> number, para o front receber JSON simples
function formatar<T extends { valor: unknown; periodo: Date }>(r: T) {
  return { ...r, valor: Number(r.valor), periodo: r.periodo.toISOString().slice(0, 7) };
}

const incluir = {
  indicador: { select: { id: true, nome: true, categoria: true, unidade: true } },
  estabelecimento: { select: { id: true, nome: true } },
  usuario: { select: { id: true, nome: true } },
} satisfies Prisma.RegistroIndicadorInclude;

// GET /api/registros?indicadorId=1&categoria=Hospedagem&inicio=2026-01&fim=2026-06
registrosRoutes.get("/", async (req, res) => {
  const f = filtroRegistrosSchema.parse(req.query);
  const registros = await prisma.registroIndicador.findMany({
    where: {
      indicadorId: f.indicadorId,
      estabelecimentoId: f.estabelecimentoId,
      indicador: f.categoria ? { categoria: f.categoria } : undefined,
      periodo: {
        gte: f.inicio ? parseMes(f.inicio) : undefined,
        lte: f.fim ? parseMes(f.fim) : undefined,
      },
    },
    include: incluir,
    orderBy: [{ periodo: "desc" }, { indicadorId: "asc" }],
    take: 500,
  });
  res.json(registros.map(formatar));
});

// Impede dois lançamentos do mesmo indicador, no mesmo mês, para o mesmo estabelecimento
// (ou dois valores municipais no mesmo mês). Fazemos no código porque o MySQL
// não considera NULLs repetidos como duplicados em índices únicos.
async function garantirSemDuplicado(
  dados: { indicadorId: number; estabelecimentoId: number | null; periodo: Date },
  ignorarId?: number,
) {
  const existente = await prisma.registroIndicador.findFirst({
    where: { ...dados, NOT: ignorarId ? { id: ignorarId } : undefined },
  });
  if (existente) {
    throw new HttpError(
      409,
      `Já existe um valor para este indicador neste mês (registro #${existente.id}). Edite-o em vez de criar outro.`,
    );
  }
}

// POST /api/registros  { indicadorId, estabelecimentoId?, valor, periodo: "2026-03" }
registrosRoutes.post("/", autenticar, async (req, res) => {
  const d = registroSchema.parse(req.body);
  const dados = {
    indicadorId: d.indicadorId,
    estabelecimentoId: d.estabelecimentoId ?? null,
    periodo: parseMes(d.periodo),
  };
  await garantirSemDuplicado(dados);

  const registro = await prisma.registroIndicador.create({
    data: { ...dados, valor: d.valor, usuarioId: req.usuario!.id },
    include: incluir,
  });
  res.status(201).json(formatar(registro));
});

registrosRoutes.put("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const atual = await prisma.registroIndicador.findUnique({ where: { id } });
  if (!atual) throw new HttpError(404, "Registro não encontrado.");

  const d = registroSchema.partial().parse(req.body);
  const dados = {
    indicadorId: d.indicadorId ?? atual.indicadorId,
    estabelecimentoId: d.estabelecimentoId !== undefined ? d.estabelecimentoId : atual.estabelecimentoId,
    periodo: d.periodo ? parseMes(d.periodo) : atual.periodo,
  };
  await garantirSemDuplicado(dados, id);

  const registro = await prisma.registroIndicador.update({
    where: { id },
    // quem editou por último fica registrado como responsável
    data: { ...dados, valor: d.valor ?? atual.valor, usuarioId: req.usuario!.id },
    include: incluir,
  });
  res.json(formatar(registro));
});

registrosRoutes.delete("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await prisma.registroIndicador.delete({ where: { id } });
  res.status(204).end();
});
