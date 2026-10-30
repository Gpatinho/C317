import { Router } from "express";
import { gerarCodigo, hashCodigo } from "../lib/codigo-acesso.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar, exigirPapel } from "../middlewares/auth.js";
import { estabelecimentoSchema, idParam } from "../schemas/index.js";

export const estabelecimentosRoutes = Router();

// O hash do código de acesso nunca sai da API. No lugar dele, a resposta diz só
// se o estabelecimento já tem um código (temCodigo), para a tela do painel saber
// se mostra "Gerar código" ou "Gerar novo código".
function comTemCodigo<T extends { codigoAcessoHash: string | null }>(e: T) {
  const { codigoAcessoHash, ...resto } = e;
  return { ...resto, temCodigo: codigoAcessoHash !== null };
}

// GET /api/estabelecimentos?categoria=Hotel
estabelecimentosRoutes.get("/", async (req, res) => {
  const categoria = typeof req.query.categoria === "string" ? req.query.categoria : undefined;
  const estabelecimentos = await prisma.estabelecimento.findMany({
    where: { categoria },
    orderBy: { nome: "asc" },
    omit: { codigoAcessoHash: false }, // lê o hash só para calcular temCodigo
  });
  res.json(estabelecimentos.map(comTemCodigo));
});

estabelecimentosRoutes.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { id },
    omit: { codigoAcessoHash: false },
  });
  if (!estabelecimento) throw new HttpError(404, "Estabelecimento não encontrado.");
  res.json(comTemCodigo(estabelecimento));
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

estabelecimentosRoutes.delete("/:id", autenticar, exigirPapel("ADMIN"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const registros = await prisma.registroIndicador.count({ where: { estabelecimentoId: id } });
  if (registros > 0) {
    throw new HttpError(409, "Este estabelecimento tem valores publicados e não pode ser removido.");
  }
  await prisma.estabelecimento.delete({ where: { id } });
  res.status(204).end();
});

// POST /api/estabelecimentos/:id/codigo  (só ADMIN)
// Gera um novo código de acesso para o formulário de coleta. O código só aparece
// nesta resposta: anote e repasse ao estabelecimento. Gerar outro invalida o anterior.
estabelecimentosRoutes.post("/:id/codigo", autenticar, exigirPapel("ADMIN"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const codigo = gerarCodigo();
  const estabelecimento = await prisma.estabelecimento.update({
    where: { id },
    data: { codigoAcessoHash: hashCodigo(codigo) },
  });
  res.json({ estabelecimento: { id: estabelecimento.id, nome: estabelecimento.nome }, codigo });
});