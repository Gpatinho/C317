import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/auth.js";
import { idParam, relatorioSchema } from "../schemas/index.js";

export const relatoriosRoutes = Router();

export const PASTA_UPLOADS = path.resolve("uploads");
const LIMITE_MB = 20;

const upload = multer({
  storage: multer.diskStorage({
    destination: PASTA_UPLOADS,
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.pdf`),
  }),
  limits: { fileSize: LIMITE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new HttpError(400, "Apenas arquivos PDF são aceitos."));
    }
    cb(null, true);
  },
});

async function pareceSerPdf(caminho: string) {
  const arquivo = await fs.open(caminho, "r");
  const { buffer } = await arquivo.read(Buffer.alloc(5), 0, 5, 0);
  await arquivo.close();
  return buffer.toString() === "%PDF-";
}

const camposPublicos = {
  id: true,
  titulo: true,
  descricao: true,
  ano: true,
  arquivoNome: true,
  tamanhoBytes: true,
  publicadoEm: true,
} as const;

// GET /api/relatorios?ano=2025
relatoriosRoutes.get("/", async (req, res) => {
  const ano = req.query.ano ? Number(req.query.ano) : undefined;
  const relatorios = await prisma.relatorio.findMany({
    where: { ano: Number.isInteger(ano) ? ano : undefined },
    select: camposPublicos,
    orderBy: { publicadoEm: "desc" },
  });
  res.json(relatorios);
});

// GET /api/relatorios/:id/download  -> o PDF em si
relatoriosRoutes.get("/:id/download", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const relatorio = await prisma.relatorio.findUnique({ where: { id } });
  if (!relatorio) throw new HttpError(404, "Relatório não encontrado.");

  const caminho = path.join(PASTA_UPLOADS, relatorio.arquivoPath);
  try {
    await fs.access(caminho);
  } catch {
    throw new HttpError(410, "O arquivo deste relatório não está mais disponível no servidor.");
  }
  // inline=1 abre no navegador; sem ele, força o download
  if (req.query.inline === "1") {
    res.type("application/pdf").sendFile(caminho);
  } else {
    res.download(caminho, relatorio.arquivoNome);
  }
});

// POST /api/relatorios  (multipart/form-data: arquivo, titulo, descricao?, ano?)
relatoriosRoutes.post("/", autenticar, upload.single("arquivo"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Envie o PDF no campo 'arquivo'.");

  try {
    const dados = relatorioSchema.parse(req.body);
    if (!(await pareceSerPdf(req.file.path))) {
      throw new HttpError(400, "O arquivo enviado não é um PDF válido.");
    }
    const relatorio = await prisma.relatorio.create({
      data: {
        ...dados,
        arquivoNome: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        arquivoPath: req.file.filename,
        tamanhoBytes: req.file.size,
        usuarioId: req.usuario!.id,
      },
      select: camposPublicos,
    });
    res.status(201).json(relatorio);
  } catch (erro) {
    await fs.rm(req.file.path, { force: true }); // não deixa arquivo órfão em uploads/
    throw erro;
  }
});

relatoriosRoutes.put("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const dados = relatorioSchema.partial().parse(req.body);
  res.json(await prisma.relatorio.update({ where: { id }, data: dados, select: camposPublicos }));
});

relatoriosRoutes.delete("/:id", autenticar, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const relatorio = await prisma.relatorio.delete({ where: { id } });
  await fs.rm(path.join(PASTA_UPLOADS, relatorio.arquivoPath), { force: true });
  res.status(204).end();
});
