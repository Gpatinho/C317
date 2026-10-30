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

// PUT /api/auth/senha: o usuário logado troca a própria senha
export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z.string().min(6, "A nova senha precisa ter pelo menos 6 caracteres"),
  })
  .refine((d) => d.senhaAtual !== d.novaSenha, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["novaSenha"],
  });

// IMPORTANTE: schemas com .default() têm duas versões.
// - xSchema (criar): aplica os valores padrão nos campos não enviados.
// - xUpdateSchema (editar): SEM padrões. Se usássemos xSchema.partial(), o Zod
//   preencheria os campos não enviados com o padrão e a edição sobrescreveria
//   dados que o usuário não mexeu (ex.: agregação voltando para SOMA).

const indicadorBase = z.object({
  nome: z.string().trim().min(2).max(120),
  categoria: z.string().trim().min(2).max(60),
  unidade: z.string().trim().min(1).max(30),
  descricao: z.string().trim().max(255).nullish(),
  agregacao: z.enum(["SOMA", "ULTIMO", "MEDIA"]),
  ativo: z.boolean(),
  coletaEstabelecimento: z.boolean(),
});
export const indicadorSchema = indicadorBase.extend({
  agregacao: indicadorBase.shape.agregacao.default("SOMA"),
  ativo: indicadorBase.shape.ativo.default(true),
  coletaEstabelecimento: indicadorBase.shape.coletaEstabelecimento.default(false),
});
export const indicadorUpdateSchema = indicadorBase.partial();

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

const eventoBase = z.object({
  nome: z.string().trim().min(3).max(160),
  dataInicio: z.iso.date("Use o formato AAAA-MM-DD"),
  dataFim: z.iso.date("Use o formato AAAA-MM-DD").nullish(),
  local: z.string().trim().min(2).max(160),
  contato: z.string().trim().max(120).nullish(),
  gratuito: z.boolean(),
  icone: z.string().trim().max(8).nullish(),
  descricao: z.string().trim().max(5000).nullish(),
});
export const eventoSchema = eventoBase.extend({
  gratuito: eventoBase.shape.gratuito.default(true),
});
export const eventoUpdateSchema = eventoBase.partial();

const usuarioBase = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
  papel: z.enum(["ADMIN", "EDITOR"]),
});
export const usuarioSchema = usuarioBase.extend({
  papel: usuarioBase.shape.papel.default("EDITOR"),
});
export const usuarioUpdateSchema = usuarioBase.partial();

export const atrativoSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  tipo: z.enum(["ATRATIVO", "EQUIPAMENTO", "SERVICO"]),
  categoria: z.string().trim().min(2).max(60),
  descricao: z.string().trim().max(5000).nullish(),
  endereco: z.string().trim().max(255).nullish(),
  contato: z.string().trim().max(120).nullish(),
});

// ---- Coleta pelos estabelecimentos ----
const codigoAcesso = z.string("Informe o código de acesso").trim().min(8, "Código de acesso inválido").max(12, "Código de acesso inválido");

export const acessoColetaSchema = z.object({ codigo: codigoAcesso });

export const envioColetaSchema = z.object({
  codigo: codigoAcesso,
  indicadorId: z.coerce.number().int().positive(),
  valor: z.coerce.number().nonnegative("O valor não pode ser negativo"),
  periodo: mes,
  observacao: z.string().trim().max(1000).nullish(),
});

export const filtroSubmissoesSchema = z.object({
  status: z.enum(["PENDENTE", "APROVADA", "REJEITADA"]).optional(),
  estabelecimentoId: z.coerce.number().int().positive().optional(),
});

export const rejeicaoSchema = z.object({
  motivo: z.string("Informe o motivo da rejeição").trim().min(3, "Explique o motivo da rejeição").max(255),
});