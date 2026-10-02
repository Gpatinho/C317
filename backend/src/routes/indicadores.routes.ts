import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { idParam, indicadorSchema } from "../schemas/index.js";
import { HttpError } from "../lib/http-error.js";

export const indicadoresRoutes = Router();

// GET /api/indicadores?categoria=Hospedagem&todos=true
indicadoresRoutes.get("/", async (req, res) => {
  const categoria = typeof req.query.categoria === "string" ? req.query.categoria : undefined;
  const incluirInativos = req.query.todos === "true";

  const indicadores = await prisma.indicador.findMany({
    where: { categoria, ...(incluirInativos ? {} : { ativo: true }) },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  });
  res.json(indicadores);
});

// GET /api/indicadores/categorias -> ["Empregos", "Hospedagem", ...] (para os filtros do front)
indicadoresRoutes.get("/categorias", async (_req, res) => {
  const linhas = await prisma.indicador.findMany({
    where: { ativo: true },
    distinct: ["categoria"],
    select: { categoria: true },
    orderBy: { categoria: "asc" },
  });
  res.json(linhas.map((l) => l.categoria));
});

indicadoresRoutes.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const indicador = await prisma.indicador.findUnique({ where: { id } });
  if (!indicador) throw new HttpError(404, "Indicador não encontrado.");
  res.json(indicador);
});

// ---- Rotas protegidas (painel administrativo) ----
indicadoresRoutes.post("/", autenticar, async (req, res) => {
  const dados = indicadorSchema.parse(req.body);
  const indicador = await prisma.indicador.create({ data: dados });
  res.status(201).json(indicador);
});

indicadoresRoutes.put("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const dados = indicadorSchema.partial().parse(req.body);
  const indicador = await prisma.indicador.update({ where: { id }, data: dados });
  res.json(indicador);
});

// Apaga o indicador e TODOS os registros dele. Para só esconder, use PUT { ativo: false }.
indicadoresRoutes.delete("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await prisma.indicador.delete({ where: { id } });
  res.status(204).end();
});
