"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Categorias de filtro.
const categorias = [
  "Visão geral",
  "Restaurantes",
  "Picos",
  "Montanhas",
  "Festas",
  "Eventos",
  "Pontos conhecidos",
];

// Indicadores-chave exibidos nos cards.
// Dados fictícios (mock) — substituir pela integração com a API/back-end.
const indicadores = [
  {
    titulo: "Visitantes/mês",
    valor: "18.420",
    variacao: "+12,4%",
    legenda: "estimativa média nos últimos 30 dias",
    icone: "👥",
  },
  {
    titulo: "Estabelecimentos",
    valor: "286",
    variacao: "+4,8%",
    legenda: "empreendimentos turísticos ativos",
    icone: "🏨",
  },
  {
    titulo: "Ocupação média",
    valor: "67,8%",
    variacao: "+6,2%",
    legenda: "rede hoteleira no período selecionado",
    icone: "🛏",
  },
];

// Série mensal de visitantes (mock) para o gráfico.
const fluxoMensal = [
  { mes: "Jan", visitantes: 10500 },
  { mes: "Fev", visitantes: 13500 },
  { mes: "Mar", visitantes: 15200 },
  { mes: "Abr", visitantes: 14200 },
  { mes: "Mai", visitantes: 17300 },
  { mes: "Jun", visitantes: 19800 },
  { mes: "Jul", visitantes: 25800 },
  { mes: "Ago", visitantes: 21200 },
  { mes: "Set", visitantes: 29600 },
  { mes: "Out", visitantes: 20700 },
  { mes: "Nov", visitantes: 17200 },
  { mes: "Dez", visitantes: 24900 },
];

// Eventos futuros exibidos no carrossel (mock).
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
            <span className="hidden md:flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Atualizado em 30 set. 2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-2">
                PERÍODO
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  defaultValue="2026-01-01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
                <span className="text-gray-400 text-sm">até</span>
                <input
                  type="date"
                  defaultValue="2026-09-30"
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

      {/* Cards de indicadores */}
      <section className="max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {indicadores.map((item) => (
          <div
            key={item.titulo}
            className="bg-white rounded-2xl shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm">
                  {item.icone}
                </span>
                <span className="text-sm text-gray-600">{item.titulo}</span>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ↗ {item.variacao}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-1">
              {item.valor}
            </p>
            <p className="text-xs text-gray-400">{item.legenda}</p>
          </div>
        ))}
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
                Estimativa de fluxo turístico ao longo de 2026
              </p>
            </div>
            <span className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              Visitantes
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fluxoMensal}>
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
                  formatter={(value: number) => [
                    `${value.toLocaleString("pt-BR")} visitantes`,
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
          </div>

          <p className="text-xs text-gray-500 mt-4 flex items-center gap-1.5">
            <span className="text-emerald-500">↗</span>
            O fluxo cresceu 18,5% no ano, com picos associados às férias de
            julho e à feira de inovação em setembro.
          </p>
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
