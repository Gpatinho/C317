import type { DadosEstabelecimento } from "@/lib/api";

// Regras do cadastro de estabelecimentos, separadas da tela para poderem ser testadas.

export type ErrosEstabelecimento = { nome?: string; categoria?: string };

// Mesmas regras do back-end (estabelecimentoSchema)
export function validar(d: DadosEstabelecimento) {
  const erros: ErrosEstabelecimento = {};
  if (d.nome.trim().length < 2) erros.nome = "Informe o nome do estabelecimento.";
  if (d.categoria.trim().length < 2) erros.categoria = "Informe a categoria (ex.: Hotel).";
  return erros;
}

// Tira os espaços das pontas; campos opcionais vazios viram null para apagar o valor no banco
export const limpar = (d: DadosEstabelecimento): DadosEstabelecimento => ({
  nome: d.nome.trim(),
  categoria: d.categoria.trim(),
  endereco: d.endereco?.trim() || null,
  regiao: d.regiao?.trim() || null,
});
