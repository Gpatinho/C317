import { lerNumero } from "../admin/_componentes/formato";

// Regras do formulário público de coleta, separadas da tela para poderem ser testadas.

// O código tem 8 letras ou números (ex.: CENT-2026); hífen e espaços não contam
export function validarCodigo(codigo: string): string | undefined {
  if (codigo.trim().replace(/[^a-z0-9]/gi, "").length < 8) return "Digite o código completo, como CENT-2026.";
}

export type ErrosEnvio = { indicador?: string; valor?: string };

// Confere o indicador escolhido e o valor digitado (aceita "1.234" e "83,5").
// Devolve os erros de cada campo e o número já convertido.
export function validarEnvio(indicador: { unidade: string } | undefined, valor: string) {
  const numero = lerNumero(valor);
  const erros: ErrosEnvio = {};
  if (!indicador) erros.indicador = "Escolha o que você vai informar.";
  if (numero === null) erros.valor = "Informe o valor, só com números.";
  else if (numero < 0) erros.valor = "O valor não pode ser negativo.";
  else if (indicador?.unidade === "%" && numero > 100) erros.valor = "Uma porcentagem não pode passar de 100.";
  return { erros, numero };
}
