import { Router } from "express";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { estabelecimentoSchema, idParam } from "../schemas/index.js";

export const estabelecimentosRoutes = Router();

// GET /api/estabelecimentos?categoria=Hotel
estabelecimentosRoutes.get("/", async (req, res) => {
  const categoria = typeof req.query.categoria === "string" ? req.query.categoria : undefined;
  const estabelecimentos = await prisma.estabelecimento.findMany({
    where: { categoria },
    orderBy: { nome: "asc" },
  });
  res.json(estabelecimentos);
});

estabelecimentosRoutes.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const estabelecimento = await prisma.estabelecimento.findUnique({ where: { id } });
  if (!estabelecimento) throw new HttpError(404, "Estabelecimento não encontrado.");
  res.json(estabelecimento);
});

estabelecimentosRoutes.post("/", autenticar, async (req, res) => {
  const dados = estabelecimentoSchema.parse(req.body);
  res.status(201).json(await prisma.estabelecimento.create({ data: dados }));
});

estabelecimentosRoutes.put("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const dados = estabelecimentoSchema.partial().parse(req.body);
  res.json(await prisma.estabelecimento.update({ where: { id }, data: dados }));
});

estabelecimentosRoutes.delete("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await prisma.estabelecimento.delete({ where: { id } });
  res.status(204).end();
});
