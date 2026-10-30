"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { api, type Atrativo } from "@/lib/api";

// Barra de busca de lugares (inventário turístico) do topo do dashboard.
// Busca pelo nome a partir de 2 letras, espera o usuário parar de digitar
// e leva para a página completa do lugar (/lugares/[id]).

const ESPERA_MS = 300;
const MAX_RESULTADOS = 8;

export const TIPO_ROTULO: Record<Atrativo["tipo"], string> = {
  ATRATIVO: "Atrativo",
  EQUIPAMENTO: "Equipamento",
  SERVICO: "Serviço",
};

type Resultado = { termo: string; lista?: Atrativo[]; erro?: boolean };

export default function BuscaLugares() {
  const router = useRouter();
  const idLista = useId();
  const caixa = useRef<HTMLDivElement>(null);

  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState(""); // texto depois da espera
  const [resultado, setResultado] = useState<Resultado>();
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(-1); // item destacado pelo teclado

  const busca = texto.trim();
  const termoValido = termo.length >= 2;
  const carregando = termoValido && resultado?.termo !== termo;
  const lista = termoValido && !carregando ? (resultado?.lista ?? []).slice(0, MAX_RESULTADOS) : [];

  // Espera o usuário parar de digitar antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setTermo(busca), ESPERA_MS);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    if (termo.length < 2) return;
    let cancelado = false;
    api
      .atrativos({ busca: termo })
      .then((l) => !cancelado && setResultado({ termo, lista: l }))
      .catch(() => !cancelado && setResultado({ termo, erro: true }));
    return () => {
      cancelado = true;
    };
  }, [termo]);

  // Fecha a lista ao clicar fora
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberta(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAberta(false);
      return;
    }
    if (!lista.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberta(true);
      setAtivo((i) => (i + 1) % lista.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => (i <= 0 ? lista.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const escolhido = lista[ativo >= 0 ? ativo : 0];
      if (escolhido) router.push(`/lugares/${escolhido.id}`);
    }
  }

  const mostrarLista = aberta && busca.length >= 2;

  return (
    <div ref={caixa} className="relative z-30 max-w-xl mx-auto mt-6 text-left">
      <label htmlFor={`${idLista}-campo`} className="sr-only">
        Buscar um lugar para conhecer
      </label>
      <div className="flex items-center gap-2 bg-white rounded-full shadow-lg px-5 py-3 focus-within:ring-4 focus-within:ring-white/40">
        <span aria-hidden className="text-gray-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          id={`${idLista}-campo`}
          type="search"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={`${idLista}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={ativo >= 0 && lista[ativo] ? `${idLista}-item-${lista[ativo].id}` : undefined}
          autoComplete="off"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberta(true);
            setAtivo(-1);
          }}
          onFocus={() => setAberta(true)}
          onKeyDown={aoTeclar}
          placeholder="Busque um lugar: Santo Cruzeiro, Inatel, Campão…"
          className="flex-1 bg-transparent text-gray-800 placeholder:text-gray-400 text-sm outline-none"
        />
      </div>

      {mostrarLista && (
        <div
          id={`${idLista}-lista`}
          role="listbox"
          aria-label="Lugares encontrados"
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {carregando || busca !== termo ? (
            <p className="px-5 py-4 text-sm text-gray-500">Buscando…</p>
          ) : resultado?.erro ? (
            <p role="alert" className="px-5 py-4 text-sm text-red-700">
              Não foi possível buscar agora. Tente novamente em instantes.
            </p>
          ) : lista.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500">
              Nenhum lugar encontrado para “{termo}”.
            </p>
          ) : (
            <ul>
              {lista.map((l, i) => (
                <li key={l.id} id={`${idLista}-item-${l.id}`} role="option" aria-selected={i === ativo}>
                  <Link
                    href={`/lugares/${l.id}`}
                    className={`flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-violet-50 ${
                      i === ativo ? "bg-violet-50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-800 truncate">{l.nome}</span>
                      <span className="block text-xs text-gray-500 truncate">
                        {l.categoria} · {TIPO_ROTULO[l.tipo]}
                        {l.endereco ? ` · ${l.endereco}` : ""}
                      </span>
                    </span>
                    <span aria-hidden className="text-violet-600 shrink-0">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
