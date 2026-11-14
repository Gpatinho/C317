// Regras da troca de senha (Minha conta), separadas da tela para poderem ser testadas.

export type CamposSenha = { senhaAtual: string; novaSenha: string; confirmar: string };
export type ErrosSenha = Partial<Record<keyof CamposSenha, string>>;

// Mesmas regras do back-end (trocarSenhaSchema), mais a confirmação
export function validar(c: CamposSenha) {
  const erros: ErrosSenha = {};
  if (!c.senhaAtual) erros.senhaAtual = "Informe a senha atual.";
  if (c.novaSenha.length < 6) erros.novaSenha = "A nova senha precisa ter pelo menos 6 caracteres.";
  else if (c.novaSenha === c.senhaAtual) erros.novaSenha = "A nova senha precisa ser diferente da atual.";
  if (!erros.novaSenha && c.confirmar !== c.novaSenha) erros.confirmar = "As senhas não são iguais.";
  return erros;
}
