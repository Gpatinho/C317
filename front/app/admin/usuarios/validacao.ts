import type { Papel } from "@/lib/api";

// Regras do cadastro de usuários da equipe, separadas da tela para poderem ser testadas.

export type CamposUsuario = { nome: string; email: string; papel: Papel; senha: string };
export type ErrosUsuario = Partial<Record<keyof CamposUsuario, string>>;

// Mesmas regras do back-end (usuarioSchema). Na edição (novo = false) a senha é opcional:
// em branco mantém a atual; preenchida, precisa ter pelo menos 6 caracteres.
export function validar(c: CamposUsuario, novo: boolean) {
  const erros: ErrosUsuario = {};
  if (c.nome.trim().length < 2) erros.nome = "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) erros.email = "Informe um e-mail válido.";
  if ((novo || c.senha) && c.senha.length < 6) erros.senha = "A senha precisa ter pelo menos 6 caracteres.";
  return erros;
}
