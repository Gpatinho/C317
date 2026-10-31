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

export type Evento = {
  id: number;
  nome: string;
  dataInicio: string; // "2027-07-12T00:00:00.000Z" (use .slice(0, 10))
  dataFim: string | null; // null = evento de um dia só
  local: string;
  contato: string | null;
  gratuito: boolean;
  icone: string | null;
  descricao: string | null;
};

export type TipoAtrativo = "ATRATIVO" | "EQUIPAMENTO" | "SERVICO";

// Item do inventário turístico (lugar que o visitante pode conhecer)
export type Atrativo = {
  id: number;
  nome: string;
  tipo: TipoAtrativo;
  categoria: string;
  descricao: string | null;
  endereco: string | null;
  contato: string | null;
  horarioFuncionamento: string | null;
  melhorHorario: string | null; // melhor horário para visitar
  periodoMovimentado: string | null; // época do ano mais frequentada
  instagram: string | null; // só o nome do perfil, sem @
  revisadoEm: string;
};

// Corpo de POST/PUT /api/atrativos. Campos opcionais vazios vão como null (apaga o valor).
export type DadosAtrativo = Omit<Atrativo, "id" | "revisadoEm">;

export type Papel = "ADMIN" | "EDITOR";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
};

// Item da lista de usuários do painel (a senha nunca vem da API)
export type UsuarioEquipe = Usuario & { criadoEm: string };

// POST /api/usuarios exige senha; no PUT ela é opcional (só quando for redefinir)
export type DadosUsuario = { nome: string; email: string; papel: Papel; senha?: string };

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

export type Estabelecimento = {
  id: number;
  nome: string;
  categoria: string;
  endereco?: string | null;
  regiao?: string | null;
  temCodigo?: boolean; // já tem código de acesso para a coleta
};

export type DadosEstabelecimento = { nome: string; categoria: string; endereco?: string | null; regiao?: string | null };

// Corpo de POST/PUT /api/registros. estabelecimentoId null = valor do município.
export type DadosRegistro = {
  indicadorId: number;
  valor: number;
  periodo: string; // "2026-09"
  estabelecimentoId?: number | null;
};

export type StatusSubmissao = "PENDENTE" | "APROVADA" | "REJEITADA";
export type ContagemSubmissoes = Record<StatusSubmissao, number>;

// Valor enviado por um estabelecimento pelo formulário de coleta, aguardando (ou já com) análise da SMCELT
export type Submissao = {
  id: number;
  valor: number;
  periodo: string; // "2026-09"
  observacao: string | null;
  status: StatusSubmissao;
  motivoRejeicao: string | null;
  enviadoEm: string;
  analisadoEm: string | null;
  estabelecimento: { id: number; nome: string; categoria: string };
  indicador: { id: number; nome: string; unidade: string };
  analisadoPor: { id: number; nome: string } | null;
};

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

// Igual ao request(), mas para upload de arquivo mostrando o progresso (o fetch não informa
// quanto já foi enviado, por isso aqui usamos XMLHttpRequest).
function enviarComProgresso<T>(caminho: string, form: FormData, onProgresso?: (porcento: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${caminho}`);
    const t = token();
    if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgresso?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let dados: { erro?: string } = {};
      try {
        dados = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(dados as T);
      else reject(new ApiError(xhr.status, dados.erro ?? "Erro ao acessar a API"));
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "Não foi possível conectar ao servidor. Tente novamente em instantes."));
    xhr.send(form);
  });
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
  // futuros: só eventos que ainda não terminaram, do mais próximo ao mais distante
  eventos: (f: { futuros?: boolean; limite?: number } = {}) =>
    request<Evento[]>(`/eventos${qs({ futuros: f.futuros ? "true" : undefined, limite: f.limite })}`),
  indicadores: (categoria?: string) => request<Indicador[]>(`/indicadores${qs({ categoria })}`),

  // inicio/fim no formato "2026-01"
  resumo: (f: { inicio?: string; fim?: string; categoria?: string }) =>
    request<Resumo>(`/dashboard/resumo${qs(f)}`),
  serie: (indicadorId: number, inicio?: string, fim?: string) =>
    request<{ indicador: Indicador; serie: { periodo: string; valor: number | null }[] }>(
      `/dashboard/serie${qs({ indicadorId, inicio, fim })}`,
    ),

  lancarValor: (dados: DadosRegistro) =>
    request<Registro>("/registros", { method: "POST", body: JSON.stringify(dados) }),
  editarRegistro: (id: number, dados: DadosRegistro) =>
    request<Registro>(`/registros/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
  excluirRegistro: (id: number) => request<void>(`/registros/${id}`, { method: "DELETE" }),
  estabelecimentos: () => request<Estabelecimento[]>("/estabelecimentos"),
  criarEstabelecimento: (dados: DadosEstabelecimento) =>
    request<Estabelecimento>("/estabelecimentos", { method: "POST", body: JSON.stringify(dados) }),
  editarEstabelecimento: (id: number, dados: DadosEstabelecimento) =>
    request<Estabelecimento>(`/estabelecimentos/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
  excluirEstabelecimento: (id: number) => request<void>(`/estabelecimentos/${id}`, { method: "DELETE" }),
  // Gera um novo código de acesso (invalida o anterior). O código só vem nesta resposta.
  gerarCodigo: (id: number) =>
    request<{ estabelecimento: { id: number; nome: string }; codigo: string }>(`/estabelecimentos/${id}/codigo`, {
      method: "POST",
    }),

  registros: () => request<Registro[]>("/registros"),
  contagemSubmissoes: () => request<ContagemSubmissoes>("/submissoes/contagem"),
  submissoes: (status?: StatusSubmissao) => request<Submissao[]>(`/submissoes${qs({ status })}`),
  aprovarSubmissao: (id: number) => request<Submissao>(`/submissoes/${id}/aprovar`, { method: "POST" }),
  rejeitarSubmissao: (id: number, motivo: string) =>
    request<Submissao>(`/submissoes/${id}/rejeitar`, { method: "POST", body: JSON.stringify({ motivo }) }),
  atrativos: (f: { busca?: string; tipo?: TipoAtrativo; categoria?: string } = {}) =>
    request<Atrativo[]>(`/atrativos${qs(f)}`),
  atrativo: (id: number) => request<Atrativo>(`/atrativos/${id}`),
  // Itens sem conferência há mais de "meses" meses, dos mais atrasados para os mais recentes
  revisaoPendente: () =>
    request<{ meses: number; total: number; atrativos: Atrativo[] }>("/atrativos/revisao-pendente"),
  criarAtrativo: (dados: DadosAtrativo) =>
    request<Atrativo>("/atrativos", { method: "POST", body: JSON.stringify(dados) }),
  // Editar também conta como revisão: a API atualiza o revisadoEm
  editarAtrativo: (id: number, dados: Partial<DadosAtrativo>) =>
    request<Atrativo>(`/atrativos/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
  revisarAtrativo: (id: number) => request<Atrativo>(`/atrativos/${id}/revisar`, { method: "POST" }),
  excluirAtrativo: (id: number) => request<void>(`/atrativos/${id}`, { method: "DELETE" }),

  // Gestão da equipe (só ADMIN)
  usuarios: () => request<UsuarioEquipe[]>("/usuarios"),
  criarUsuario: (dados: DadosUsuario) =>
    request<UsuarioEquipe>("/usuarios", { method: "POST", body: JSON.stringify(dados) }),
  editarUsuario: (id: number, dados: Partial<DadosUsuario>) =>
    request<UsuarioEquipe>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
  excluirUsuario: (id: number) => request<void>(`/usuarios/${id}`, { method: "DELETE" }),

  relatorios: () => request<Relatorio[]>("/relatorios"),
  urlDownload: (id: number) => `${API_URL}/relatorios/${id}/download`,
  publicarRelatorio: (form: FormData, onProgresso?: (porcento: number) => void) =>
    enviarComProgresso<Relatorio>("/relatorios", form, onProgresso),
  editarRelatorio: (id: number, dados: { titulo: string; descricao: string; ano?: number }) =>
    request<Relatorio>(`/relatorios/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
  excluirRelatorio: (id: number) => request<void>(`/relatorios/${id}`, { method: "DELETE" }),
};
