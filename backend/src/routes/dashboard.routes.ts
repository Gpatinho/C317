import { Router } from "express";
import { agregar, serieMensal, variacaoPercentual } from "../lib/agregacao.js";
import { HttpError } from "../lib/http-error.js";
import { chaveMes, parseMes, periodoPadrao, somarMeses } from "../lib/periodo.js";
import { prisma } from "../lib/prisma.js";
import { filtroDashboardSchema, serieSchema } from "../schemas/index.js";

export const dashboardRoutes = Router();

function lerPeriodo(inicio?: string, fim?: string) {
  const padrao = periodoPadrao();
  const i = inicio ? parseMes(inicio) : padrao.inicio;
  const f = fim ? parseMes(fim) : padrao.fim;
  if (i > f) throw new HttpError(400, "A data inicial deve ser anterior à final.");
  return { inicio: i, fim: f };
}

/**
 * GET /api/dashboard/resumo?inicio=2026-01&fim=2026-09&categoria=Hospedagem
 * Um card por indicador: valor no período + variação em relação ao MESMO período
 * do ano anterior (o turismo é sazonal, então jan–set/2026 se compara com jan–set/2025).
 *
 * Cada card usa só os meses que têm lançamento: se o período pedido vai até outubro
 * mas o último dado é de setembro, o card cobre jan–set e compara com jan–set do ano
 * anterior. Sem isso, um mês ainda não lançado contaria como zero na soma.
 * Os meses realmente usados voltam em card.periodo e card.periodoAnterior.
 */
dashboardRoutes.get("/resumo", async (req, res) => {
  const f = filtroDashboardSchema.parse(req.query);
  const { inicio, fim } = lerPeriodo(f.inicio, f.fim);

  const indicadores = await prisma.indicador.findMany({
    where: { ativo: true, categoria: f.categoria },
    include: {
      registros: {
        where: { periodo: { gte: somarMeses(inicio, -12), lte: fim } },
        select: { valor: true, periodo: true, estabelecimentoId: true },
      },
    },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  });

  const cards = indicadores.map(({ registros, ...indicador }) => {
    const serieAtual = serieMensal(
      registros.filter((r) => r.periodo >= inicio),
      indicador.agregacao,
    );
    if (serieAtual.length === 0) {
      return { indicador, valor: null, valorAnterior: null, variacao: null, periodo: null, periodoAnterior: null };
    }

    // Meses com dado dentro do período pedido (a série já vem ordenada)
    const inicioEfetivo = parseMes(serieAtual[0].periodo);
    const fimEfetivo = parseMes(serieAtual[serieAtual.length - 1].periodo);
    const inicioAnterior = somarMeses(inicioEfetivo, -12);
    const fimAnterior = somarMeses(fimEfetivo, -12);

    const serieAnterior = serieMensal(
      registros.filter((r) => r.periodo >= inicioAnterior && r.periodo <= fimAnterior),
      indicador.agregacao,
    );
    const valor = agregar(serieAtual, indicador.agregacao);
    const valorAnterior = agregar(serieAnterior, indicador.agregacao);
    return {
      indicador,
      valor,
      valorAnterior,
      variacao: variacaoPercentual(valor, valorAnterior),
      periodo: { inicio: chaveMes(inicioEfetivo), fim: chaveMes(fimEfetivo) },
      periodoAnterior:
        serieAnterior.length > 0 ? { inicio: chaveMes(inicioAnterior), fim: chaveMes(fimAnterior) } : null,
    };
  });

  const ultima = await prisma.registroIndicador.findFirst({
    orderBy: { atualizadoEm: "desc" },
    select: { atualizadoEm: true },
  });

  res.json({
    periodo: { inicio: chaveMes(inicio), fim: chaveMes(fim) }, // período pedido
    atualizadoEm: ultima?.atualizadoEm ?? null,
    cards,
  });
});

/**
 * GET /api/dashboard/serie?indicadorId=1&inicio=2026-01&fim=2026-12
 * Série mensal pronta para o gráfico (Recharts): [{ periodo: "2026-01", valor: 10500 }, ...]
 * Meses sem dado aparecem com valor null (o gráfico mostra um "buraco").
 */
dashboardRoutes.get("/serie", async (req, res) => {
  const f = serieSchema.parse(req.query);
  const { inicio, fim } = lerPeriodo(f.inicio, f.fim);

  const indicador = await prisma.indicador.findUnique({ where: { id: f.indicadorId } });
  if (!indicador) throw new HttpError(404, "Indicador não encontrado.");

  const registros = await prisma.registroIndicador.findMany({
    where: { indicadorId: indicador.id, periodo: { gte: inicio, lte: fim } },
    select: { valor: true, periodo: true, estabelecimentoId: true },
  });
  const porMes = new Map(serieMensal(registros, indicador.agregacao).map((p) => [p.periodo, p.valor]));

  const serie = [];
  for (let m = inicio; m <= fim; m = somarMeses(m, 1)) {
    const chave = chaveMes(m);
    serie.push({ periodo: chave, valor: porMes.get(chave) ?? null });
  }

  res.json({ indicador, serie });
});
