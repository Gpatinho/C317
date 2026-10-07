import { Router } from "express";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { eventoSchema, idParam } from "../schemas/index.js";

export const eventosRoutes = Router();

// "2026-07-12" -> Date; null/undefined passam direto (null apaga a data final)
const data = (valor: string | null | undefined) => (valor ? new Date(valor) : (valor as null | undefined));

function validarDatas(inicio: Date, fim: Date | null | undefined) {
  if (fim && fim < inicio) throw new HttpError(400, "A data final deve ser igual ou posterior à inicial.");
}

// GET /api/eventos?futuros=true&limite=4
// futuros=true -> só eventos que ainda não terminaram, do mais próximo ao mais distante
eventosRoutes.get("/", async (req, res) => {
  const futuros = req.query.futuros === "true";
  const limite = Number(req.query.limite) || undefined;
  const hoje = new Date(new Date().toISOString().slice(0, 10)); // hoje, 00:00 UTC

  const eventos = await prisma.evento.findMany({
    where: futuros
      ? { OR: [{ dataFim: { gte: hoje } }, { dataFim: null, dataInicio: { gte: hoje } }] }
      : undefined,
    orderBy: { dataInicio: futuros ? "asc" : "desc" },
    take: limite,
  });
  res.json(eventos);
});

eventosRoutes.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) throw new HttpError(404, "Evento não encontrado.");
  res.json(evento);
});

// ---- Rotas protegidas (painel administrativo) ----
eventosRoutes.post("/", autenticar, async (req, res) => {
  const d = eventoSchema.parse(req.body);
  const dados = { ...d, dataInicio: new Date(d.dataInicio), dataFim: data(d.dataFim) };
  validarDatas(dados.dataInicio, dados.dataFim);
  res.status(201).json(await prisma.evento.create({ data: dados }));
});

eventosRoutes.put("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const atual = await prisma.evento.findUnique({ where: { id } });
  if (!atual) throw new HttpError(404, "Evento não encontrado.");

  const d = eventoSchema.partial().parse(req.body);
  const dados = { ...d, dataInicio: data(d.dataInicio) ?? undefined, dataFim: data(d.dataFim) };
  validarDatas(dados.dataInicio ?? atual.dataInicio, dados.dataFim === undefined ? atual.dataFim : dados.dataFim);
  res.json(await prisma.evento.update({ where: { id }, data: dados }));
});

eventosRoutes.delete("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await prisma.evento.delete({ where: { id } });
  res.status(204).end();
});