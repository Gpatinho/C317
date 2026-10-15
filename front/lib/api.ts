// Cliente da API do back-end. Configure NEXT_PUBLIC_API_URL no front/.env.local
// Ex.: NEXT_PUBLIC_API_URL=http://localhost:3333/api
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

export type Indicador = {
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  descricao: string | null;
  agregacao: "SOMA" | "ULTIMO" | "MEDIA";
};

type Intervalo = { inicio: string; fim: string }; // meses "2026-01"

export type CardResumo = {
  indicador: Indicador;
  valor: number | null;
  valorAnterior: number | null;
  variacao: number | null; // em %, ex.: 12.4
  periodo: Intervalo | null; // meses com dado usados no valor (null = sem dados)
  periodoAnterior: Intervalo | null; // mesmos meses do ano anterior (null = sem comparação)
};

export type Relatorio = {
  id: number;
  titulo: string;
  descricao: string | null;
  ano: number | null;
  arquivoNome: string;
  tamanhoBytes: number;
  publicadoEm: string;
};

export type Resumo = {
  periodo: Intervalo; // período pedido
  atualizadoEm: string | null;
  cards: CardResumo[];
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: "ADMIN" | "EDITOR";
};

export type Registro = {
  id: number;
  indicadorId: number;
  estabelecimentoId: number | null;
  valor: number;
  periodo: string; // "2026-09"
  criadoEm: string;
  atualizadoEm: string;
  indicador: { id: number; nome: string; categoria: string; unidade: string };
  estabelecimento: { id: number; nome: string } | null;
  usuario: { id: number; nome: string };
};

export type ContagemSubmissoes = { PENDENTE: number; APROVADA: number; REJEITADA: number };

// Erro da API com o código HTTP. status 401 = sessão expirada/inválida;
// status 0 = não conseguiu falar com o servidor.
export class ApiError extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// "Lembrar de mim" marcado -> localStorage (sobrevive ao fechar o navegador);
// desmarcado -> sessionStorage (some ao fechar a aba).
function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") ?? sessionStorage.getItem("token");
}

async function request<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers = new Headers(opcoes.headers);
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (opcoes.body && !(opcoes.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor. Tente novamente em instantes.");
  }
  if (resposta.status === 204) return undefined as T;

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ApiError(resposta.status, dados.erro ?? "Erro ao acessar a API");
  return dados as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return p.length ? `?${new URLSearchParams(p.map(([k, v]) => [k, String(v)]))}` : "";
};

export const api = {
  login: async (email: string, senha: string, lembrar = true) => {
    const r = await request<{ token: string; usuario: { nome: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    api.logout();
    (lembrar ? localStorage : sessionStorage).setItem("token", r.token);
    return r;
  },
  logout: () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  },

  temSessao: () => token() !== null,
  me: () => request<Usuario>("/auth/me"),

  categorias: () => request<string[]>("/indicadores/categorias"),
  indicadores: (categoria?: string) => request<Indicador[]>(`/indicadores${qs({ categoria })}`),

  // inicio/fim no formato "2026-01"
  resumo: (f: { inicio?: string; fim?: string; categoria?: string }) =>
    request<Resumo>(`/dashboard/resumo${qs(f)}`),
  serie: (indicadorId: number, inicio?: string, fim?: string) =>
    request<{ indicador: Indicador; serie: { periodo: string; valor: number | null }[] }>(
      `/dashboard/serie${qs({ indicadorId, inicio, fim })}`,
    ),

  lancarValor: (dados: { indicadorId: number; valor: number; periodo: string; estabelecimentoId?: number }) =>
    request("/registros", { method: "POST", body: JSON.stringify(dados) }),

  registros: () => request<Registro[]>("/registros"),
  contagemSubmissoes: () => request<ContagemSubmissoes>("/submissoes/contagem"),
  revisaoPendente: () => request<{ meses: number; total: number }>("/atrativos/revisao-pendente"),

  relatorios: () => request<Relatorio[]>("/relatorios"),
  urlDownload: (id: number) => `${API_URL}/relatorios/${id}/download`,
  publicarRelatorio: (form: FormData) => request<Relatorio>("/relatorios", { method: "POST", body: form }),
};