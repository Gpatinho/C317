import bcrypt from "bcryptjs";
import { Router } from "express";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { autenticar, exigirPapel } from "../middlewares/auth.js";
import { idParam, usuarioSchema } from "../schemas/index.js";

export const usuariosRoutes = Router();

// Todas as rotas daqui são só para administradores
usuariosRoutes.use(autenticar, exigirPapel("ADMIN"));

// Nunca devolve o hash da senha
const campos = { id: true, nome: true, email: true, papel: true, criadoEm: true } as const;

// GET /api/usuarios
usuariosRoutes.get("/", async (_req, res) => {
  res.json(await prisma.usuario.findMany({ select: campos, orderBy: { nome: "asc" } }));
});

// POST /api/usuarios  { nome, email, senha, papel? }  (papel padrão: EDITOR)
usuariosRoutes.post("/", async (req, res) => {
  const { senha, ...dados } = usuarioSchema.parse(req.body);
  const usuario = await prisma.usuario.create({
    data: { ...dados, email: dados.email.toLowerCase(), senhaHash: await bcrypt.hash(senha, 10) },
    select: campos,
  });
  res.status(201).json(usuario); // e-mail repetido cai no erro P2002 -> 409
});

// PUT /api/usuarios/:id  (envie só o que mudar; "senha" troca a senha)
usuariosRoutes.put("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { senha, ...dados } = usuarioSchema.partial().parse(req.body);
  if (id === req.usuario!.id && dados.papel && dados.papel !== req.usuario!.papel) {
    throw new HttpError(400, "Você não pode alterar o seu próprio papel.");
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: {
      ...dados,
      email: dados.email?.toLowerCase(),
      senhaHash: senha ? await bcrypt.hash(senha, 10) : undefined,
    },
    select: campos,
  });
  res.json(usuario);
});

usuariosRoutes.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (id === req.usuario!.id) throw new HttpError(400, "Você não pode remover a si mesmo.");

  // Lançamentos e relatórios guardam quem os criou, então o usuário não pode sumir
  const [registros, relatorios] = await Promise.all([
    prisma.registroIndicador.count({ where: { usuarioId: id } }),
    prisma.relatorio.count({ where: { usuarioId: id } }),
  ]);
  if (registros + relatorios > 0) {
    throw new HttpError(409, "Este usuário tem lançamentos ou relatórios publicados e não pode ser removido.");
  }

  await prisma.usuario.delete({ where: { id } });
  res.status(204).end();
});