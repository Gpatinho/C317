import type { Agregacao } from "../generated/prisma/enums.js";
import { chaveMes } from "./periodo.js";

type RegistroBase = { valor: unknown; periodo: Date; estabelecimentoId: number | null };

/**
 * Transforma os registros de UM indicador em uma série mensal.
 * Regra: se existe valor consolidado do município (estabelecimentoId = null)
 * naquele mês, ele é usado; senão, combinam-se os valores dos estabelecimentos
 * (média para taxas, soma para o resto — ex.: leitos do hotel A + hotel B).
 */
export function serieMensal(
  registros: RegistroBase[],
  agregacao: Agregacao,
): { periodo: string; valor: number }[] {
  const municipal = new Map<string, number>();
  const somaEstab = new Map<string, number>();
  const qtdEstab = new Map<string, number>();

  for (const r of registros) {
    const chave = chaveMes(r.periodo);
    const valor = Number(r.valor);
    if (r.estabelecimentoId === null) {
      municipal.set(chave, valor);
    } else {
      somaEstab.set(chave, (somaEstab.get(chave) ?? 0) + valor);
      qtdEstab.set(chave, (qtdEstab.get(chave) ?? 0) + 1);
    }
  }

  const meses = new Set([...municipal.keys(), ...somaEstab.keys()]);
  return [...meses]
    .sort()
    .map((periodo) => {
      if (municipal.has(periodo)) return { periodo, valor: municipal.get(periodo)! };
      const soma = somaEstab.get(periodo)!;
      const valor = agregacao === "MEDIA" ? soma / qtdEstab.get(periodo)! : soma;
      return { periodo, valor: Number(valor.toFixed(2)) };
    });
}

/** Reduz uma série mensal a um único número, conforme o tipo do indicador. */
export function agregar(serie: { valor: number }[], tipo: Agregacao): number | null {
  if (serie.length === 0) return null;
  const valores = serie.map((s) => s.valor);
  switch (tipo) {
    case "SOMA":
      return valores.reduce((a, b) => a + b, 0);
    case "MEDIA":
      return Number((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2));
    case "ULTIMO":
      return valores[valores.length - 1];
  }
}

export function variacaoPercentual(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null || anterior === 0) return null;
  return Number((((atual - anterior) / anterior) * 100).toFixed(1));
}
