"use client";

import Link from "next/link";
import { useRef, useState } from "react";

// Categorias disponíveis para filtro.
const categorias = [
  "Restaurantes",
  "Picos",
  "Montanhas",
  "Festas",
  "Eventos",
  "Pontos conhecidos",
];

// Eventos futuros exibidos no carrossel.
// Substitua pelos dados reais assim que a API do back-end estiver pronta.
const eventosFuturos = [
  {
    nome: "Festival de Inverno de Santa Rita",
    data: "12 a 14 de julho",
    local: "Praça Central",
    rede: { tipo: "Instagram", perfil: "@festivaldeinvernosrs" },
    acesso: "Gratuito",
  },
  {
    nome: "Feira de Eletrônica e Inovação",
    data: "22 de agosto",
    local: "Inatel - Campus SRS",
    rede: { tipo: "Instagram", perfil: "@inatel.oficial" },
    acesso: "Gratuito",
  },
  {
    nome: "Encontro de Voo Livre na Serra",
    data: "5 de setembro",
    local: "Rampa do Zeza",
    rede: { tipo: "Facebook", perfil: "voolivresrs" },
    acesso: "Pago",
  },
  {
    nome: "Festa do Padroeiro",
    data: "3 a 6 de outubro",
    local: "Igreja Matriz",
    rede: { tipo: "Instagram", perfil: "@paroquiasrs" },
    acesso: "Gratuito",
  },
];

export default function Dashboard() {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<
    string | null
  >("Restaurantes");
  const [progresso, setProgresso] = useState(0);
  const carrosselRef = useRef<HTMLDivElement>(null);

  const atualizarProgresso = () => {
    const el = carrosselRef.current;
    if (!el) return;
    const maximo = el.scrollWidth - el.clientWidth;
    const percentual = maximo > 0 ? (el.scrollLeft / maximo) * 100 : 0;
    setProgresso(percentual);
  };

  const rolar = (direcao: "esquerda" | "direita") => {
    const el = carrosselRef.current;
    if (!el) return;
    const distancia = el.clientWidth * 0.8;
    el.scrollBy({
      left: direcao === "direita" ? distancia : -distancia,
      behavior: "smooth",
    });
    // Atualiza a barra de progresso um instante depois do scroll suave iniciar.
    setTimeout(atualizarProgresso, 300);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabeçalho, mesma identidade da Home */}
      <header className="bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white px-6 pt-8 pb-16 text-center">
        <Link href="/" className="text-xs text-white/70 hover:text-white">
          ← Voltar para a Home
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mt-2 mb-2">
          O que estamos procurando?
        </h1>
        <p className="text-white/90 text-sm max-w-lg mx-auto">
          Consulte indicadores turísticos, dashboards e relatórios da região
          de Santa Rita do Sapucaí
        </p>
      </header>

      {/* Filtros: Período e Categoria */}
      <section className="max-w-5xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-2">
              PERÍODO
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
              />
              <span className="text-gray-400 text-sm">até</span>
              <input
                type="date"
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
                  onClick={() =>
                    setCategoriaSelecionada(
                      categoriaSelecionada === categoria ? null : categoria
                    )
                  }
                  className={`text-sm px-4 py-1.5 rounded-full border transition ${
                    categoriaSelecionada === categoria
                      ? "bg-violet-50 text-violet-700 border-violet-400"
                      : "border-gray-300 text-gray-600 hover:border-violet-300"
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Aviso de sazonalidade */}
      <section className="max-w-5xl mx-auto px-6 mt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <span className="text-amber-500 text-lg leading-none">⚠</span>
          <p className="text-sm text-amber-900">
            Boa parte da movimentação turística de Santa Rita do Sapucaí está
            ligada a eventos sazonais. Isso significa que alguns indicadores
            podem aparecer com baixa movimentação em determinados meses,
            mesmo sendo períodos importantes para pontos específicos — o
            volume tende a se concentrar nas datas dos eventos, não de forma
            constante ao longo do ano.
          </p>
        </div>
      </section>

      {/* Carrossel de eventos futuros */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Próximos eventos em Santa Rita do Sapucaí
        </h2>

        <div
          ref={carrosselRef}
          onScroll={atualizarProgresso}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none]"
        >
          {eventosFuturos.map((evento) => (
            <div
              key={evento.nome}
              className="flex-none w-64 bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
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

              <h3 className="font-semibold text-gray-800 text-sm mb-3">
                {evento.nome}
              </h3>
              <p className="text-xs text-gray-500 mb-1">📍 {evento.local}</p>
              <p className="text-xs text-gray-400">
                {evento.rede.tipo}: {evento.rede.perfil}
              </p>
            </div>
          ))}
        </div>

        {/* Navegação: setas + barra de progresso */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => rolar("esquerda")}
            aria-label="Eventos anteriores"
            className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
          >
            ‹
          </button>

          <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all"
              style={{ width: `${Math.max(progresso, 8)}%` }}
            />
          </div>

          <button
            onClick={() => rolar("direita")}
            aria-label="Próximos eventos"
            className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
          >
            ›
          </button>
        </div>
      </section>
    </main>
  );
}