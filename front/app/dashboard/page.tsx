"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { api, type CardResumo, type Indicador, type Resumo } from "@/lib/api";

// Categorias de filtro.
// PENDENTE: estas categorias (tipos de atração) não existem no back-end, que hoje
// agrupa os indicadores por setor (Visitantes, Hospedagem...). Ainda não filtram nada.
const categorias = [
  "Visão geral",
  "Restaurantes",
  "Picos",
  "Montanhas",
  "Festas",
  "Eventos",
  "Pontos conhecidos",
];

const icones: Record<string, string> = {
  Visitantes: "👥",
  Hospedagem: "🏨",
  Leitos: "🛏",
  Empresas: "🏢",
  Empregos: "💼",
};

// O que o número do card representa, conforme a agregação do indicador.
function legenda(c: CardResumo) {
  if (!c.periodo) return "sem dados no período selecionado";
  const meses = intervalo(c.periodo);
  const textos: Record<Indicador["agregacao"], string> = {
    SOMA: `total de ${meses}`,
    MEDIA: `média de ${meses}`,
    ULTIMO: `valor de ${nomeMes(c.periodo.fim)}`,
  };
  return textos[c.indicador.agregacao];
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function formatarValor(valor: number | null, unidade: string) {
  if (valor === null) return "—";
  return unidade === "%" ? `${numero(valor)}%` : numero(valor);
}

// "2026-03" -> "Mar/2026"
function nomeMes(periodo: string) {
  const [ano, mes] = periodo.split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

// { inicio: "2026-01", fim: "2026-09" } -> "Jan–Set/2026"
function intervalo({ inicio, fim }: { inicio: string; fim: string }) {
  if (inicio === fim) return nomeMes(fim);
  if (inicio.slice(0, 4) !== fim.slice(0, 4)) return `${nomeMes(inicio)}–${nomeMes(fim)}`;
  return `${MESES[Number(inicio.slice(5)) - 1]}–${nomeMes(fim)}`;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Serie = { periodo: string; valor: number | null }[];

// Eventos futuros exibidos no carrossel (mock).
// PENDENTE: o back-end ainda não tem eventos.
const eventosFuturos = [
  {
    icone: "🎵",
    nome: "Festival de Inverno de Santa Rita",
    data: "12 a 14 de julho",
    local: "Praça Central",
    perfil: "@festivaldeinvernosrs",
    acesso: "Gratuito",
  },
  {
    icone: "⚙",
    nome: "Feira de Eletrônica e Inovação",
    data: "22 de agosto",
    local: "Inatel - Campus SRS",
    perfil: "@inatel.oficial",
    acesso: "Gratuito",
  },
  {
    icone: "🪂",
    nome: "Encontro de Voo Livre na Serra",
    data: "5 de setembro",
    local: "Rampa do Zeza",
    perfil: "voolivresrs",
    acesso: "Pago",
  },
  {
    icone: "✨",
    nome: "Festa do Padroeiro",
    data: "3 a 6 de outubro",
    local: "Igreja Matriz",
    perfil: "@paroquiasrs",
    acesso: "Gratuito",
  },
];

export default function Dashboard() {
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("Visão geral");
  const [inicio, setInicio] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [fim, setFim] = useState(hojeISO);

  // A API trabalha com meses ("2026-03"); os inputs de data dão o dia também.
  const filtro = { inicio: inicio.slice(0, 7), fim: fim.slice(0, 7) };
  const chave = `${filtro.inicio}|${filtro.fim}`;

  const [dados, setDados] = useState<{
    chave: string;
    resumo?: Resumo;
    visitantes?: CardResumo;
    serie?: Serie;
    erro?: string;
  }>();
  const carregando = dados?.chave !== chave;

  useEffect(() => {
    if (!filtro.inicio || !filtro.fim) return;
    let cancelado = false;

    (async () => {
      try {
        const resumo = await api.resumo(filtro);
        const visitantes = resumo.cards.find((c) => c.indicador.categoria === "Visitantes");
        const serie = visitantes
          ? (await api.serie(visitantes.indicador.id, filtro.inicio, filtro.fim)).serie
          : undefined;
        if (!cancelado) setDados({ chave, resumo, visitantes, serie });
      } catch (err) {
        if (!cancelado) {
          setDados({ chave, erro: err instanceof Error ? err.message : "Erro ao carregar os dados." });
        }
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `chave` resume o filtro
  }, [chave]);

  const resumo = dados?.resumo;
  const serie = dados?.serie ?? [];
  const variosAnos = filtro.inicio.slice(0, 4) !== filtro.fim.slice(0, 4);
  const dadosGrafico = serie.map((p) => ({
    mes: variosAnos ? nomeMes(p.periodo) : MESES[Number(p.periodo.slice(5)) - 1],
    visitantes: p.valor,
  }));
  const comValor = serie.filter((p): p is { periodo: string; valor: number } => p.valor !== null);
  const pico = comValor.reduce<(typeof comValor)[number] | undefined>(
    (maior, p) => (!maior || p.valor > maior.valor ? p : maior),
    undefined,
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white px-6 pt-6 pb-16">
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg">
              🏛
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Santa Rita do Sapucaí</p>
              <p className="text-xs text-white/70">Observatório do Turismo</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-white/80 hover:text-white flex items-center gap-1"
          >
            ← Voltar para a Home
          </Link>
        </div>

        <div className="text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            O que estamos procurando?
          </h1>
          <p className="text-white/90 text-sm max-w-xl mx-auto">
            Consulte indicadores turísticos, tendências e eventos de Santa
            Rita do Sapucaí em um só lugar.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <section className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">
                Explore os dados
              </h2>
              <p className="text-xs text-gray-500">
                Refine a leitura por período e categoria
              </p>
            </div>
            {resumo?.atualizadoEm && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Atualizado em{" "}
                {new Date(resumo.atualizadoEm).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-2">
                PERÍODO
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Data inicial"
                  value={inicio}
                  max={fim}
                  onChange={(e) => setInicio(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
                <span className="text-gray-400 text-sm">até</span>
                <input
                  type="date"
                  aria-label="Data final"
                  value={fim}
                  min={inicio}
                  onChange={(e) => setFim(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-2">
                CATEGORIA
              </label>
              <div className="flex flex-wrap gap-2">
                {categorias.map((categoria) => (
                  <button
                    key={categoria}
                    onClick={() => setCategoriaSelecionada(categoria)}
                    className={`text-sm px-4 py-1.5 rounded-full border transition ${
                      categoriaSelecionada === categoria
                        ? "bg-violet-50 text-violet-700 border-violet-400 font-medium"
                        : "border-gray-300 text-gray-600 hover:border-violet-300"
                    }`}
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {dados?.erro && (
        <section className="max-w-6xl mx-auto px-6 mt-6">
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {dados.erro}
          </p>
        </section>
      )}

      {/* Cards de indicadores */}
      <section
        aria-busy={carregando}
        className={`max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${
          carregando ? "opacity-50" : ""
        }`}
      >
        {!resumo &&
          carregando &&
          [0, 1, 2].map((i) => <div key={i} className="bg-white rounded-2xl shadow-sm p-5 h-36 animate-pulse" />)}

        {resumo?.cards.map((card) => {
          const { indicador, valor, variacao, periodoAnterior } = card;
          // ULTIMO compara só o último mês (Set/2026 vs Set/2025); os demais, o intervalo todo
          const comparadoA =
            periodoAnterior &&
            (indicador.agregacao === "ULTIMO" ? nomeMes(periodoAnterior.fim) : intervalo(periodoAnterior));
          return (
            <div
              key={indicador.id}
              title={indicador.descricao ?? undefined}
              className="bg-white rounded-2xl shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm">
                    {icones[indicador.categoria] ?? "📊"}
                  </span>
                  <span className="text-sm text-gray-600">{indicador.nome}</span>
                </div>
                {variacao === null || !periodoAnterior ? (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    sem comparação
                  </span>
                ) : (
                  <span
                    title={`Comparado a ${comparadoA}`}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      variacao >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                    }`}
                  >
                    {variacao >= 0 ? "↗ +" : "↘ "}
                    {numero(variacao)}%
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-800 mb-1">
                {formatarValor(valor, indicador.unidade)}
              </p>
              <p className="text-xs text-gray-400">
                {indicador.unidade !== "%" && `${indicador.unidade} · `}
                {legenda(card)}
              </p>
              {comparadoA && <p className="text-xs text-gray-400 mt-0.5">vs {comparadoA}</p>}
            </div>
          );
        })}

        {resumo && resumo.cards.length === 0 && (
          <p className="md:col-span-3 text-sm text-gray-500 bg-white rounded-2xl shadow-sm p-5">
            Nenhum indicador cadastrado ainda.
          </p>
        )}
      </section>

      {/* Gráfico de evolução */}
      <section className="max-w-6xl mx-auto px-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-gray-800">
                Evolução mensal de visitantes
              </h2>
              <p className="text-xs text-gray-500">
                Estimativa de fluxo turístico de {nomeMes(filtro.inicio)} a {nomeMes(filtro.fim)}
              </p>
            </div>
            <span className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              Visitantes
            </span>
          </div>

          <div className={`h-72 transition-opacity ${carregando ? "opacity-50" : ""}`}>
            {!carregando && comValor.length === 0 ? (
              <p className="h-full flex items-center justify-center text-sm text-gray-400">
                Sem dados de visitantes para o período selecionado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico}>
                  <CartesianGrid stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v / 1000} mil`}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [
                      typeof value === "number" ? `${numero(value)} visitantes` : "sem dado",
                      "",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitantes"
                    stroke="#6C5CE0"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#6C5CE0" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {dados?.visitantes?.valor != null && pico && (
            <p className="text-xs text-gray-500 mt-4 flex items-center gap-1.5">
              <span className="text-violet-500">●</span>
              {numero(dados.visitantes.valor)} visitantes no período, com pico em{" "}
              {nomeMes(pico.periodo)} ({numero(pico.valor)}).
            </p>
          )}
        </div>
      </section>

      {/* Aviso de sazonalidade */}
      <section className="max-w-6xl mx-auto px-6 mt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-3">
            <span className="text-amber-500 text-lg leading-none">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Atenção à sazonalidade
              </p>
              <p className="text-sm text-amber-800">
                Boa parte da movimentação turística está ligada a eventos
                sazonais. Alguns indicadores podem variar bastante entre os
                meses, pois o volume tende a se concentrar nas datas dos
                eventos.
              </p>
            </div>
          </div>
          <button className="text-sm font-medium text-amber-800 border border-amber-300 rounded-full px-4 py-1.5 whitespace-nowrap hover:bg-amber-100 transition">
            Entenda os dados
          </button>
        </div>
      </section>

      {/* Eventos futuros */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Próximos eventos em Santa Rita do Sapucaí
            </h2>
            <p className="text-xs text-gray-500">
              A agenda que ajuda a explicar os próximos picos de visitação.
            </p>
          </div>
          <Link
            href="/eventos"
            className="text-sm font-medium text-violet-700 hover:text-violet-800 flex items-center gap-1"
          >
            Ver agenda completa →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {eventosFuturos.map((evento) => (
            <div
              key={evento.nome}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-violet-700">
                  {evento.data}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    evento.acesso === "Gratuito"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {evento.acesso}
                </span>
              </div>

              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm mb-2">
                {evento.icone}
              </div>

              <h3 className="font-semibold text-gray-800 text-sm mb-3">
                {evento.nome}
              </h3>
              <p className="text-xs text-gray-500 mb-1">📍 {evento.local}</p>
              <p className="text-xs text-gray-400">
                Informações: {evento.perfil}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
