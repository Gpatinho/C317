"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api, type Registro } from "@/lib/api";
import { formatarData, formatarMes, formatarValor } from "./_componentes/formato";
import {
  IconeAlerta,
  IconeCaixa,
  IconeDocumento,
  IconeGrafico,
  IconeMais,
  IconePrancheta,
  IconeRelogio,
  IconeUpload,
} from "./_componentes/icones";
import { useSessao } from "./_componentes/sessao";

// Telas do painel. "envios" ainda será criada; quando existir, é só ajustar aqui.
const ROTAS = {
  lancar: "/admin/lancar",
  publicar: "/admin/publicar",
  envios: "/admin/envios",
};

type Painel = {
  enviosPendentes: number;
  relatoriosPublicados: number;
  indicadoresAtivos: number;
  inventarioSemRevisao: number;
  atualizadoEm: string | null;
  ultimos: Registro[];
};

export default function PainelAdmin() {
  // O login já foi conferido em app/admin/layout.tsx
  const { usuario, sessaoExpirou } = useSessao();

  // Cada "tentativa" dispara uma nova busca na API (o botão "Tentar de novo" soma 1)
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<{ tentativa: number; painel?: Painel; erro?: boolean }>();
  const carregando = dados?.tentativa !== tentativa;

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      api.contagemSubmissoes(),
      api.relatorios(),
      api.indicadores(),
      api.revisaoPendente(),
      api.registros(),
      api.resumo({}),
    ])
      .then(([contagem, relatorios, indicadores, revisao, registros, resumo]) => {
        if (cancelado) return;
        const ultimos = [...registros]
          .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
          .slice(0, 5);
        setDados({
          tentativa,
          painel: {
            enviosPendentes: contagem.PENDENTE,
            relatoriosPublicados: relatorios.length,
            indicadoresAtivos: indicadores.length,
            inventarioSemRevisao: revisao.total,
            atualizadoEm: resumo.atualizadoEm,
            ultimos,
          },
        });
      })
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
        setDados({ tentativa, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa, sessaoExpirou]);

  const painel = dados?.painel;
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      {/* Boas-vindas */}
      <section className="rounded-2xl bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white px-6 py-7 sm:px-8 shadow-sm">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-white/85">Aqui está um resumo dos dados do Observatório.</p>
        {painel?.atualizadoEm && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs bg-white/15 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-300" />
            Dados atualizados em {formatarData(painel.atualizadoEm)}
          </p>
        )}
      </section>

      {/* Números */}
      <section className="mt-6">
        {carregando ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <CardCarregando key={i} />
            ))}
          </div>
        ) : dados?.erro || !painel ? (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <p className="text-sm flex items-center gap-2">
              <IconeAlerta /> Não foi possível carregar o resumo. Tente novamente em instantes.
            </p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="self-start sm:self-auto bg-white border border-red-300 text-red-700 hover:bg-red-100 text-sm font-semibold rounded-full px-4 py-1.5"
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <CardNumero
              valor={painel.enviosPendentes}
              texto="Envios de hotéis aguardando análise"
              destaque={painel.enviosPendentes > 0}
              icone={<IconeCaixa />}
              link={{ href: ROTAS.envios, texto: "Ver envios" }}
            />
            <CardNumero
              valor={painel.relatoriosPublicados}
              texto="Relatórios publicados"
              icone={<IconeDocumento />}
              link={{ href: ROTAS.publicar, texto: "Publicar novo" }}
            />
            <CardNumero
              valor={painel.indicadoresAtivos}
              texto="Indicadores ativos"
              icone={<IconeGrafico />}
              link={{ href: "/dashboard", texto: "Ver no dashboard" }}
            />
            <CardNumero
              valor={painel.inventarioSemRevisao}
              texto={
                painel.inventarioSemRevisao === 1
                  ? "Item do inventário sem revisão há mais de 12 meses"
                  : "Itens do inventário sem revisão há mais de 12 meses"
              }
              icone={<IconeRelogio />}
            />
          </div>
        )}
      </section>

      {/* Ações rápidas */}
      <section className="mt-8">
        <h2 className="font-serif text-xl font-bold text-gray-800 mb-3">Ações rápidas</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <CardAcao
            icone={<IconeMais />}
            titulo="Lançar valor do mês"
            texto="Registre o valor de um indicador para um mês. Ele aparece no dashboard público."
          >
            <Link
              href={ROTAS.lancar}
              className="inline-block bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2"
            >
              Lançar valor
            </Link>
          </CardAcao>
          <CardAcao
            icone={<IconeUpload />}
            titulo="Publicar relatório"
            texto="Envie um PDF para a página pública de relatórios."
          >
            <Link
              href={ROTAS.publicar}
              className="inline-block border border-violet-300 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2"
            >
              Publicar
            </Link>
          </CardAcao>
        </div>
      </section>

      {/* Últimos lançamentos */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-bold text-gray-800">Últimos lançamentos</h2>
          {painel && painel.ultimos.length > 0 && (
            <Link href={ROTAS.lancar} className="text-sm font-semibold text-violet-700 hover:underline">
              Ver todos
            </Link>
          )}
        </div>
        {carregando ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : painel && painel.ultimos.length === 0 ? (
          <SemLancamentos />
        ) : painel ? (
          <UltimosLancamentos registros={painel.ultimos} />
        ) : null}
      </section>
    </main>
  );
}

// ---------- Cards ----------

function CardNumero({
  valor,
  texto,
  icone,
  link,
  destaque,
}: {
  valor: number;
  texto: string;
  icone: ReactNode;
  link?: { href: string; texto: string };
  destaque?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 flex flex-col ${
        destaque ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          destaque ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-700"
        }`}
      >
        {icone}
      </div>
      <p className="mt-3 font-serif text-3xl font-bold text-gray-800">{valor.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-xs sm:text-sm text-gray-500 flex-1">{texto}</p>
      {link && (
        <Link href={link.href} className="mt-3 text-sm font-semibold text-violet-700 hover:underline">
          {link.texto} →
        </Link>
      )}
    </div>
  );
}

function CardCarregando() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-gray-100" />
      <div className="mt-4 h-7 w-16 bg-gray-100 rounded" />
      <div className="mt-3 h-3 w-full bg-gray-100 rounded" />
      <div className="mt-2 h-3 w-2/3 bg-gray-100 rounded" />
    </div>
  );
}

function CardAcao({ icone, titulo, texto, children }: { icone: ReactNode; titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex gap-4">
      <div className="w-11 h-11 shrink-0 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
        {icone}
      </div>
      <div>
        <h3 className="font-semibold text-gray-800">{titulo}</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">{texto}</p>
        {children}
      </div>
    </div>
  );
}

// ---------- Últimos lançamentos ----------

function UltimosLancamentos({ registros }: { registros: Registro[] }) {
  return (
    <>
      {/* Tabela (computador/tablet) */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-5 py-3">INDICADOR</th>
              <th className="text-left px-5 py-3">MÊS</th>
              <th className="text-right px-5 py-3">VALOR</th>
              <th className="text-left px-5 py-3">LANÇADO POR</th>
              <th className="text-left px-5 py-3">ATUALIZADO EM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registros.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-800">{r.indicador.nome}</p>
                  {r.estabelecimento && <p className="text-xs text-gray-500">{r.estabelecimento.nome}</p>}
                </td>
                <td className="px-5 py-3 text-gray-600">{formatarMes(r.periodo)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                  {formatarValor(r.valor, r.indicador.unidade)}
                </td>
                <td className="px-5 py-3 text-gray-600">{r.usuario.nome}</td>
                <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatarData(r.atualizadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (celular) */}
      <ul className="md:hidden space-y-3">
        {registros.map((r) => (
          <li key={r.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-gray-800">{r.indicador.nome}</p>
              <p className="font-semibold text-gray-800 whitespace-nowrap">{formatarValor(r.valor, r.indicador.unidade)}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatarMes(r.periodo)} · {r.usuario.nome}
            </p>
            <p className="text-xs text-gray-400 mt-1">Atualizado em {formatarData(r.atualizadoEm)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function SemLancamentos() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center">
        <IconePrancheta />
      </div>
      <p className="mt-4 font-semibold text-gray-800">Nenhum valor lançado ainda</p>
      <p className="text-sm text-gray-500 mt-1">Quando alguém lançar um valor, ele aparece aqui.</p>
      <Link
        href={ROTAS.lancar}
        className="inline-block mt-5 bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2"
      >
        Lançar o primeiro valor
      </Link>
    </div>
  );
}
