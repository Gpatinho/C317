"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { TIPO_ROTULO } from "@/app/dashboard/BuscaLugares";
import { ApiError, api, type Atrativo } from "@/lib/api";

// Página pública de um lugar do inventário turístico: tudo o que o visitante
// precisa para planejar a visita. Os dados são cadastrados pela SMCELT no painel.

// revisadoEm é data e hora (não só data), então converte para o fuso de quem está vendo
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

type Estado = { id: string; lugar?: Atrativo; erro?: "nao-encontrado" | "falha" };

export default function LugarPage() {
  const { id } = useParams<{ id: string }>();
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<Estado & { tentativa: number }>();
  const carregando = estado?.id !== id || estado?.tentativa !== tentativa;

  useEffect(() => {
    let cancelado = false;
    const numero = Number(id);
    const pedido = Number.isInteger(numero) && numero > 0 ? api.atrativo(numero) : Promise.reject(new ApiError(404, ""));
    pedido
      .then((lugar) => !cancelado && setEstado({ id, tentativa, lugar }))
      .catch((err) => {
        if (cancelado) return;
        const naoEncontrado = err instanceof ApiError && (err.status === 404 || err.status === 400);
        setEstado({ id, tentativa, erro: naoEncontrado ? "nao-encontrado" : "falha" });
      });
    return () => {
      cancelado = true;
    };
  }, [id, tentativa]);

  const lugar = carregando ? undefined : estado?.lugar;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white px-6 pt-6 pb-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg">🏛</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Santa Rita do Sapucaí</p>
              <p className="text-xs text-white/70">Observatório do Turismo</p>
            </div>
          </Link>
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white flex items-center gap-1">
            ← Voltar ao dashboard
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          {lugar ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs bg-white/15 rounded-full px-3 py-1">{lugar.categoria}</span>
                <span className="text-xs bg-white/15 rounded-full px-3 py-1">{TIPO_ROTULO[lugar.tipo]}</span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold">{lugar.nome}</h1>
              {lugar.endereco && <p className="mt-2 text-white/90 text-sm">📍 {lugar.endereco}</p>}
            </>
          ) : (
            <div className="h-20" aria-hidden />
          )}
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 -mt-8 pb-12">
        {carregando ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3" aria-busy>
            <p className="sr-only">Carregando informações do lugar…</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : estado?.erro === "nao-encontrado" ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-4xl mb-3" aria-hidden>🧭</p>
            <h1 className="font-semibold text-gray-800">Lugar não encontrado</h1>
            <p className="text-sm text-gray-500 mt-1">Ele pode ter sido removido do inventário.</p>
            <Link href="/dashboard" className="inline-block mt-5 text-sm font-semibold text-violet-700 hover:underline">
              Buscar outro lugar
            </Link>
          </div>
        ) : estado?.erro ? (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <p className="text-sm">Não foi possível carregar este lugar. Tente novamente em instantes.</p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="self-start sm:self-auto bg-white border border-red-300 text-red-700 hover:bg-red-100 text-sm font-semibold rounded-full px-4 py-1.5"
            >
              Tentar de novo
            </button>
          </div>
        ) : lugar ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Info icone="🕒" titulo="Horário de funcionamento" valor={lugar.horarioFuncionamento} />
              <Info icone="☀️" titulo="Melhor horário para visitar" valor={lugar.melhorHorario} />
              <Info icone="📅" titulo="Época mais movimentada" valor={lugar.periodoMovimentado} />
              <Info
                icone="📸"
                titulo="Instagram"
                valor={
                  lugar.instagram && (
                    <a
                      href={`https://www.instagram.com/${lugar.instagram}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-700 font-semibold hover:underline"
                    >
                      @{lugar.instagram}
                    </a>
                  )
                }
              />
              {lugar.contato && <Info icone="☎️" titulo="Contato" valor={lugar.contato} />}
            </div>

            {lugar.descricao && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                <h2 className="font-semibold text-gray-800 mb-2">Sobre o lugar</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{lugar.descricao}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-6">
              Informações conferidas pela SMCELT em {dataBR(lugar.revisadoEm)}. Horários podem mudar em feriados e
              eventos: confirme com o local antes de ir.
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}

function Info({ icone, titulo, valor }: { icone: string; titulo: string; valor: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
        <span aria-hidden className="text-base">
          {icone}
        </span>
        {titulo}
      </p>
      <div className={`mt-2 text-sm ${valor ? "text-gray-800" : "text-gray-400 italic"}`}>
        {valor || "Não informado"}
      </div>
    </div>
  );
}
