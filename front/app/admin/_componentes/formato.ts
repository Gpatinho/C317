// Funções de formatação usadas nas telas do painel.

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// "2026-10-14T..." -> "14 out. 2026"
export function formatarData(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// "2026-09" -> "Set/2026"
export function formatarMes(periodo: string) {
  const [ano, mes] = periodo.split("-");
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano}`;
}

// "2026-09" -> "Setembro de 2026"
export function formatarMesLongo(periodo: string) {
  const [ano, mes] = periodo.split("-");
  return `${MESES_LONGOS[Number(mes) - 1]} de ${ano}`;
}

// 29600 + "pessoas" -> "29.600 pessoas"; 83 + "%" -> "83%"
export function formatarValor(valor: number, unidade: string) {
  const numero = valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return unidade === "%" ? `${numero}%` : `${numero} ${unidade}`;
}

// Mês no formato da API: Date -> "2026-09"
export function mesDe(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Lista de meses do mês atual para trás ("2026-10", "2026-09", ...), usada nos selects.
// Não inclui meses futuros, porque a API não aceita lançamentos de meses que não começaram.
export function ultimosMeses(quantidade = 120) {
  const hoje = new Date();
  return Array.from({ length: quantidade }, (_, i) => mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)));
}

// Converte o que a pessoa digitou em número, aceitando o jeito brasileiro:
// "29.600" -> 29600; "83,5" -> 83.5; "1.234,5" -> 1234.5; "83.5" -> 83.5
export function lerNumero(texto: string): number | null {
  let t = texto.trim().replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Número -> texto para preencher o campo ao editar: 29600 -> "29.600"; 83.5 -> "83,5"
export function numeroParaCampo(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}
