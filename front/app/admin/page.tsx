"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api, type Registro, type Usuario } from "@/lib/api";

// Telas do painel que ainda serão criadas (T9). Quando existirem, é só ajustar aqui.
const ROTAS = {
  lancar: "/admin/lancar",
  publicar: "/admin/publicar",
  envios: "/admin/envios",
};

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// "2026-10-14T..." -> "14 out. 2026"
function formatarData(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// "2026-09" -> "Set/2026"
function formatarMes(periodo: string) {
  const [ano, mes] = periodo.split("-");
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano}`;
}

// 29600 + "pessoas" -> "29.600 pessoas"; 83 + "%" -> "83%"
function formatarValor(valor: number, unidade: string) {
  const numero = valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return unidade === "%" ? `${numero}%` : `${numero} ${unidade}`;
}

type Painel = {
  enviosPendentes: number;
  relatoriosPublicados: number;
  indicadoresAtivos: number;
  inventarioSemRevisao: number;
  atualizadoEm: string | null;
  ultimos: Registro[];
};

export default function PainelAdmin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario>();
  const [menuAberto, setMenuAberto] = useState(false);

  // Cada "tentativa" dispara uma nova busca na API (o botão "Tentar de novo" soma 1)
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<{ tentativa: number; painel?: Painel; erro?: boolean }>();
  const carregando = dados?.tentativa !== tentativa;

  // 1) Confere se quem abriu a página está logado (token válido no back-end)
  useEffect(() => {
    if (!api.temSessao()) {
      router.replace("/login");
      return;
    }
    let cancelado = false;
    api
      .me()
      .then((u) => !cancelado && setUsuario(u))
      .catch((err) => {
        if (cancelado) return;
        // 401 = token vencido ou inválido: apaga e pede login de novo.
        // Outros erros (ex.: API fora do ar) só mandam para o login, sem apagar o token.
        if (err instanceof ApiError && err.status === 401) {
          api.logout();
          router.replace("/login?expirou=1");
        } else {
          router.replace("/login");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [router]);

  // 2) Com o acesso confirmado, busca os números do painel
  useEffect(() => {
    if (!usuario) return;
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
        if (err instanceof ApiError && err.status === 401) {
          api.logout();
          router.replace("/login?expirou=1");
          return;
        }
        setDados({ tentativa, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [usuario, tentativa, router]);

  function sair() {
    api.logout();
    router.replace("/login");
  }

  if (!usuario) return <VerificandoAcesso />;

  const painel = dados?.painel;
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Menu lateral fixo (computador) */}
      <aside className="hidden lg:flex w-[264px] shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <MenuLateral usuario={usuario} onSair={sair} />
      </aside>

      {/* Menu em gaveta (celular) */}
      {menuAberto && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 bg-gray-900/50"
          />
          <aside className="relative w-4/5 max-w-xs h-full bg-white shadow-xl flex">
            <MenuLateral usuario={usuario} onSair={sair} onFechar={() => setMenuAberto(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Barra superior (celular) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
          >
            <IconeMenu />
          </button>
          <span className="text-sm font-semibold text-gray-800">Painel administrativo</span>
          <Avatar nome={usuario.nome} pequeno />
        </header>

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
      </div>
    </div>
  );
}

// ---------- Menu lateral ----------

function MenuLateral({ usuario, onSair, onFechar }: { usuario: Usuario; onSair: () => void; onFechar?: () => void }) {
  const item = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm";
  return (
    <div className="flex flex-col w-full p-5">
      <div className="flex items-start justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-fuchsia-600 flex items-center justify-center text-lg text-white">
            🏛
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800">Observatório do Turismo</p>
            <p className="text-xs text-gray-500">Painel administrativo</p>
          </div>
        </Link>
        {onFechar && (
          <button onClick={onFechar} aria-label="Fechar menu" className="text-gray-400 hover:text-gray-600 p-1">
            <IconeFechar />
          </button>
        )}
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        <span className={`${item} bg-violet-50 text-violet-700 font-semibold`} aria-current="page">
          <IconeCasa /> Visão geral
        </span>
        <Link href={ROTAS.lancar} className={`${item} text-gray-600 hover:bg-gray-50`}>
          <IconeMais /> Lançar valores
        </Link>
        <Link href={ROTAS.publicar} className={`${item} text-gray-600 hover:bg-gray-50`}>
          <IconeUpload /> Publicar relatório
        </Link>
        <hr className="my-3 border-gray-200" />
        <Link href="/" target="_blank" rel="noopener noreferrer" className={`${item} text-gray-600 hover:bg-gray-50`}>
          <IconeExterno /> Ver site público ↗
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar nome={usuario.nome} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{usuario.nome}</p>
            <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
            <span
              className={`inline-block mt-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                usuario.papel === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {usuario.papel === "ADMIN" ? "Administrador" : "Editor"}
            </span>
          </div>
        </div>
        <button
          onClick={onSair}
          className="mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-700"
        >
          <IconeSair /> Sair
        </button>
      </div>
    </div>
  );
}

function Avatar({ nome, pequeno }: { nome: string; pequeno?: boolean }) {
  return (
    <div
      className={`${pequeno ? "w-8 h-8 text-sm" : "w-10 h-10"} shrink-0 rounded-full bg-violet-600 text-white font-semibold flex items-center justify-center`}
      aria-hidden
    >
      {nome.trim().charAt(0).toUpperCase()}
    </div>
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

function VerificandoAcesso() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-fuchsia-600 flex items-center justify-center text-2xl text-white">
        🏛
      </div>
      <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
      <p className="text-sm text-gray-500">Verificando seu acesso…</p>
    </main>
  );
}

// ---------- Ícones (SVG simples, sem biblioteca) ----------

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

function IconeMenu() {
  return (
    <svg {...svg} width={22} height={22}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function IconeFechar() {
  return (
    <svg {...svg}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function IconeCasa() {
  return (
    <svg {...svg}>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function IconeMais() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IconeUpload() {
  return (
    <svg {...svg}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
function IconeExterno() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
function IconeSair() {
  return (
    <svg {...svg}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function IconeCaixa() {
  return (
    <svg {...svg}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function IconeDocumento() {
  return (
    <svg {...svg}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}
function IconeGrafico() {
  return (
    <svg {...svg}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </svg>
  );
}
function IconeRelogio() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconeAlerta() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
function IconePrancheta() {
  return (
    <svg {...svg} width={26} height={26}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4" />
    </svg>
  );
}