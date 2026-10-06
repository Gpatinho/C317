// Utilitários de datas. Os registros sempre usam o 1º dia do mês (UTC).

export function inicioDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

/** Aceita "2026-03" ou "2026-03-15" e devolve 2026-03-01. */
export function parseMes(valor: string): Date {
  const [ano, mes] = valor.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, 1));
}

export function chaveMes(data: Date): string {
  return data.toISOString().slice(0, 7); // "2026-03"
}

export function somarMeses(data: Date, meses: number): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + meses, 1));
}

/** Período padrão: de janeiro do ano corrente até o mês atual. */
export function periodoPadrao(): { inicio: Date; fim: Date } {
  const hoje = new Date();
  return {
    inicio: new Date(Date.UTC(hoje.getUTCFullYear(), 0, 1)),
    fim: inicioDoMes(hoje),
  };
}
