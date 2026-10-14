"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type Relatorio } from "@/lib/api";

// Quantos cards aparecem antes do botão "Carregar mais relatórios"
const POR_PAGINA = 9;

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

// "2025-09-12T..." -> "12 set. 2025"
function formatarData(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// 2516582 -> "2,4 MB"
function formatarTamanho(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

// Ano usado no filtro e na etiqueta: o informado no relatório ou, se vazio, o da publicação
const anoDo = (r: Relatorio) => r.ano ?? new Date(r.publicadoEm).getFullYear();

// Ignora maiúsculas e acentos na busca ("turismo" encontra "Turísmo")
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Relatorios() {
  // Cada "tentativa" dispara uma nova busca na API (o botão "Tentar de novo" soma 1)
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<{ tentativa: number; relatorios?: Relatorio[]; erro?: string }>();
  const carregando = dados?.tentativa !== tentativa;

  const [busca, setBusca] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null); // null = "Todos"
  const [quantidade, setQuantidade] = useState(POR_PAGINA);

  useEffect(() => {
    let cancelado = false;
    api
      .relatorios()
      .then((relatorios) => !cancelado && setDados({ tentativa, relatorios }))
      .catch(() => !cancelado && setDados({ tentativa, erro: "falhou" }));
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  const relatorios = useMemo(() => dados?.relatorios ?? [], [dados]);

  // Anos que existem nos relatórios, do mais novo para o mais antigo
  const anos = useMemo(
    () => [...new Set(relatorios.map(anoDo))].sort((a, b) => b - a),
    [relatorios],
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return relatorios.filter(
      (r) =>
        (anoSelecionado === null || anoDo(r) === anoSelecionado) &&
        (!termo || normalizar(r.titulo).includes(termo)),
    );
  }, [relatorios, busca, anoSelecionado]);

  const visiveis = filtrados.slice(0, quantidade);

  function limparFiltros() {
    setBusca("");
    setAnoSelecionado(null);
    setQuantidade(POR_PAGINA);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white px-6 pt-6 pb-16">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg">🏛</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Santa Rita do Sapucaí</p>
              <p className="text-xs text-white/70">Observatório do Turismo</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-white/80 hover:text-white flex items-center gap-1.5">
            <IconeSeta /> Voltar para a Home
          </Link>
        </div>

        <div className="max-w-6xl mx-auto sm:text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">Relatórios e pesquisas</h1>
          <p className="text-white/90 text-sm max-w-xl sm:mx-auto">
            Acesse os estudos publicados pelo Observatório do Turismo e baixe os arquivos em PDF.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <section className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
            <div>
              <h2 className="font-serif font-bold text-gray-800">Encontre um relatório</h2>
              <p className="text-xs text-gray-500">Filtre por ano ou busque pelo título</p>
            </div>
            {dados?.relatorios && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {relatorios.length} {relatorios.length === 1 ? "relatório publicado" : "relatórios publicados"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:items-end">
            <label className="relative block">
              <span className="sr-only">Buscar pelo título</span>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconeLupa />
              </span>
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setQuantidade(POR_PAGINA);
                }}
                placeholder="Buscar pelo título…"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </label>

            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">ANO</p>
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                {[null, ...anos].map((ano) => (
                  <button
                    key={ano ?? "todos"}
                    type="button"
                    onClick={() => {
                      setAnoSelecionado(ano);
                      setQuantidade(POR_PAGINA);
                    }}
                    aria-pressed={anoSelecionado === ano}
                    className={`text-sm px-4 py-2 rounded-full border whitespace-nowrap transition ${
                      anoSelecionado === ano
                        ? "bg-violet-50 text-violet-700 border-violet-400 font-medium"
                        : "border-gray-300 text-gray-600 hover:border-violet-300"
                    }`}
                  >
                    {ano ?? "Todos"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lista */}
      <section className="max-w-6xl mx-auto px-6 mt-10">
        <h2 className="font-serif text-2xl font-bold text-gray-800 mb-5">Publicações do Observatório</h2>

        {carregando && (
          <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <CardCarregando key={i} />
            ))}
          </div>
        )}

        {!carregando && dados?.erro && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="flex items-start gap-3 text-red-700">
              <IconeAlerta />
              Não foi possível carregar os relatórios. Tente novamente em instantes.
            </p>
            <button
              type="button"
              onClick={() => setTentativa((t) => t + 1)}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-700 border border-red-300 rounded-full px-5 py-2.5 hover:bg-red-100 transition"
            >
              <IconeRecarregar /> Tentar de novo
            </button>
          </div>
        )}

        {!carregando && !dados?.erro && filtrados.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-5">
              <IconeDocumentoBusca />
            </div>
            {relatorios.length === 0 ? (
              <>
                <h3 className="font-serif text-xl font-bold text-gray-800 mb-1">Nenhum relatório publicado ainda</h3>
                <p className="text-sm text-gray-500">Os relatórios do Observatório aparecerão aqui assim que forem publicados.</p>
              </>
            ) : (
              <>
                <h3 className="font-serif text-xl font-bold text-gray-800 mb-1">Nenhum relatório encontrado</h3>
                <p className="text-sm text-gray-500 mb-5">Tente outro ano ou limpe a busca.</p>
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-sm font-semibold text-violet-700 border border-violet-400 rounded-full px-5 py-2.5 hover:bg-violet-50 transition"
                >
                  Limpar filtros
                </button>
              </>
            )}
          </div>
        )}

        {!carregando && visiveis.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiveis.map((r) => (
                <CardRelatorio key={r.id} relatorio={r} />
              ))}
            </div>

            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 mb-3">
                Exibindo {visiveis.length} de {filtrados.length}{" "}
                {filtrados.length === 1 ? "relatório" : "relatórios"}
              </p>
              {visiveis.length < filtrados.length && (
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => q + POR_PAGINA)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 border border-violet-400 rounded-full px-5 py-2.5 hover:bg-violet-50 transition"
                >
                  <span aria-hidden>+</span> Carregar mais relatórios
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* Aviso */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-900">
          <span className="text-amber-600 shrink-0 mt-0.5">
            <IconeInfo />
          </span>
          <p>
            Os relatórios são produzidos pela Secretaria Municipal de Cultura, Esporte, Lazer e Turismo (SMCELT). Para
            dúvidas sobre os dados, entre em contato com o Observatório.
          </p>
        </div>
      </section>
    </main>
  );
}

function CardRelatorio({ relatorio: r }: { relatorio: Relatorio }) {
  const urlBaixar = api.urlDownload(r.id);
  return (
    <article className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
          <IconeDocumento />
        </span>
        <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">{anoDo(r)}</span>
      </div>

      <h3 className="font-serif font-bold text-gray-800 leading-snug mb-2 line-clamp-2">{r.titulo}</h3>
      {r.descricao && <p className="text-sm text-gray-500 line-clamp-3">{r.descricao}</p>}

      {/* Empurra datas e botões para o fim do card, alinhando os cards da mesma linha */}
      <div className="flex-1" />

      <p className="text-xs text-gray-500 mt-5 mb-4">
        Publicado em {formatarData(r.publicadoEm)} · PDF · {formatarTamanho(r.tamanhoBytes)}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={urlBaixar}
          aria-label={`Baixar PDF: ${r.titulo}`}
          className="inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:from-blue-800 hover:to-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500 transition"
        >
          <IconeDownload /> Baixar PDF
        </a>
        <a
          href={`${urlBaixar}?inline=1`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visualizar PDF: ${r.titulo}`}
          className="inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-violet-700 border border-violet-400 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500 transition"
        >
          <IconeOlho /> Visualizar
        </a>
      </div>
    </article>
  );
}

function CardCarregando() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between mb-5">
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
        <div className="w-12 h-6 rounded-full bg-gray-100" />
      </div>
      <div className="h-4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mb-4" />
      <div className="h-3 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-1/2 bg-gray-100 rounded mb-5" />
      <div className="h-3 w-3/4 bg-gray-200 rounded mb-5" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-10 rounded-full bg-gray-200" />
        <div className="h-10 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

// ---- Ícones (SVG simples, sem biblioteca extra) ----
const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconeSeta() {
  return (
    <svg {...svg}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function IconeLupa() {
  return (
    <svg {...svg}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IconeDocumento() {
  return (
    <svg {...svg} width={20} height={20}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6M9 9h2" />
    </svg>
  );
}
function IconeDocumentoBusca() {
  return (
    <svg {...svg} width={24} height={24}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <circle cx="11.5" cy="14" r="2.5" />
      <path d="m15 17.5-1.7-1.7" />
    </svg>
  );
}
function IconeDownload() {
  return (
    <svg {...svg} width={16} height={16}>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}
function IconeOlho() {
  return (
    <svg {...svg} width={16} height={16}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconeAlerta() {
  return (
    <svg {...svg} width={20} height={20}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
function IconeRecarregar() {
  return (
    <svg {...svg} width={16} height={16}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
    </svg>
  );
}
function IconeInfo() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}