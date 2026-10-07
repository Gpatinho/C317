import { z } from "zod";

// Mensagens de validação em português
z.config(z.locales.ptBR());

const mes = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/, "Use o formato AAAA-MM ou AAAA-MM-DD");

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

export const indicadorSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  categoria: z.string().trim().min(2).max(60),
  unidade: z.string().trim().min(1).max(30),
  descricao: z.string().trim().max(255).nullish(),
  agregacao: z.enum(["SOMA", "ULTIMO", "MEDIA"]).default("SOMA"),
  ativo: z.boolean().default(true),
});

export const estabelecimentoSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  categoria: z.string().trim().min(2).max(60),
  endereco: z.string().trim().max(255).nullish(),
  regiao: z.string().trim().max(80).nullish(),
});

export const registroSchema = z.object({
  indicadorId: z.coerce.number().int().positive(),
  estabelecimentoId: z.coerce.number().int().positive().nullish(),
  valor: z.coerce.number().nonnegative("O valor não pode ser negativo"),
  periodo: mes,
});

export const filtroRegistrosSchema = z.object({
  indicadorId: z.coerce.number().int().positive().optional(),
  estabelecimentoId: z.coerce.number().int().positive().optional(),
  categoria: z.string().optional(),
  inicio: mes.optional(),
  fim: mes.optional(),
});

export const filtroDashboardSchema = z.object({
  categoria: z.string().optional(),
  inicio: mes.optional(),
  fim: mes.optional(),
});

export const serieSchema = filtroDashboardSchema.extend({
  indicadorId: z.coerce.number().int().positive(),
});

export const relatorioSchema = z.object({
  titulo: z.string().trim().min(3).max(200),
  descricao: z.string().trim().max(5000).optional(),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
});


export const eventoSchema = z.object({
  nome: z.string().trim().min(3).max(160),
  dataInicio: z.iso.date("Use o formato AAAA-MM-DD"),
  dataFim: z.iso.date("Use o formato AAAA-MM-DD").nullish(),
  local: z.string().trim().min(2).max(160),
  contato: z.string().trim().max(120).nullish(),
  gratuito: z.boolean().default(true),
  icone: z.string().trim().max(8).nullish(),
  descricao: z.string().trim().max(5000).nullish(),
});

export const usuarioSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
  papel: z.enum(["ADMIN", "EDITOR"]).default("EDITOR"),
});