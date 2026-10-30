import { Router } from "express";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar, exigirPapel } from "../middlewares/auth.js";
import { atrativoSchema, buscaAtrativoSchema, idParam } from "../schemas/index.js";

export const atrativosRoutes = Router();

// Depois de quantos meses sem conferencia, quando deve revisar
const REVISAO_MESES = 12;


// ?busca=cruzeiro procura no nome, na categoria e no endereço (sem diferenciar
// maiúsculas nem acentos, pela collation do MySQL). Filtros tipo e categoria opcionais.
atrativosRoutes.get("/", async (req, res) => {
  const { busca, tipo, categoria } = buscaAtrativoSchema.parse(req.query);
  const atrativos = await prisma.atrativo.findMany({
    where: {
      tipo,
      categoria,
      ...(busca && {
        OR: [{ nome: { contains: busca } }, { categoria: { contains: busca } }, { endereco: { contains: busca } }],
      }),
    },
    orderBy: [{ tipo: "asc" }, { categoria: "asc" }, { nome: "asc" }],
  });
  res.json(atrativos);
});


atrativosRoutes.get("/categorias", async (req, res) => {
  const { tipo } = atrativoSchema.pick({ tipo: true }).partial().parse(req.query);
  const linhas = await prisma.atrativo.findMany({
    where: { tipo },
    distinct: ["categoria"],
    select: { categoria: true },
    orderBy: { categoria: "asc" },
  });
  res.json(linhas.map((l) => l.categoria));
});

atrativosRoutes.get("/revisao-pendente", autenticar, async (_req, res) => {
  const limite = new Date();
  limite.setMonth(limite.getMonth() - REVISAO_MESES);
  const pendentes = await prisma.atrativo.findMany({
    where: { revisadoEm: { lt: limite } },
    orderBy: { revisadoEm: "asc" }, // ascendentes, os mais atrasados 1º
  });
  res.json({ meses: REVISAO_MESES, total: pendentes.length, atrativos: pendentes });
});

atrativosRoutes.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const atrativo = await prisma.atrativo.findUnique({ where: { id } });
  if (!atrativo) throw new HttpError(404, "Item do inventário não encontrado.");
  res.json(atrativo);
});


atrativosRoutes.post("/", autenticar, async (req, res) => {
  const dados = atrativoSchema.parse(req.body);
  res.status(201).json(await prisma.atrativo.create({ data: dados }));
});

// Editar conta como revisão: quem editou conferiu os dados
atrativosRoutes.put("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const dados = atrativoSchema.partial().parse(req.body);
  res.json(await prisma.atrativo.update({ where: { id }, data: { ...dados, revisadoEm: new Date() } }));
});


atrativosRoutes.post("/:id/revisar", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await prisma.atrativo.update({ where: { id }, data: { revisadoEm: new Date() } }));
});

atrativosRoutes.delete("/:id", autenticar, exigirPapel("ADMIN"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  await prisma.atrativo.delete({ where: { id } });
  res.status(204).end();
});