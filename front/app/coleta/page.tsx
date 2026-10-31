"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type AcessoColeta, type EnvioColeta, type StatusSubmissao } from "@/lib/api";
import { formatarData, formatarMes, formatarValor, lerNumero, mesDe, ultimosMeses } from "../admin/_componentes/formato";

// Formulário público de coleta (item 6 da proposta): o hotel ou pousada entra com o código
// de acesso gerado pela SMCELT e envia o valor do mês. Nada vai direto para o dashboard:
// todo envio fica PENDENTE até a SMCELT aprovar em /admin/envios.
// O código fica só na memória da página (nunca em localStorage).

const STATUS: Record<StatusSubmissao, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: "Aguardando análise", classe: "bg-amber-50 text-amber-700" },
  APROVADA: { rotulo: "Aprovado", classe: "bg-green-50 text-green-700" },
  REJEITADA: { rotulo: "Rejeitado", classe: "bg-red-50 text-red-700" },
};

const MESES = ultimosMeses(24);

function mesAnterior() {
  const hoje = new Date();
  return mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
}

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

// 429 = muitas tentativas erradas; 0 = sem conexão; o resto vem com a mensagem da API
function mensagemDeErro(err: unknown, padrao: string) {
  if (err instanceof ApiError && err.status === 429) return "Muitas tentativas. Aguarde 15 minutos e tente de novo.";
  return err instanceof Error && err.message ? err.message : padrao;
}

export default function ColetaPage() {
  const [sessao, setSessao] = useState<{ codigo: string; dados: AcessoColeta }>();
  const [aviso, setAviso] = useState("");

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
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Voltar para a Home
          </Link>
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">Área do estabelecimento</h1>
          <p className="text-white/90 text-sm max-w-xl mx-auto">
            Hotéis e pousadas de Santa Rita do Sapucaí enviam aqui os dados do mês. A SMCELT confere cada envio antes
            de publicar no Observatório.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-12">
        {sessao ? (
          <Formulario
            codigo={sessao.codigo}
            dados={sessao.dados}
            onSair={() => {
              setSessao(undefined);
              setAviso("");
            }}
            onCodigoInvalido={() => {
              setSessao(undefined);
              setAviso("Este código não vale mais. Peça um novo código à SMCELT.");
            }}
          />
        ) : (
          <Entrada aviso={aviso} onEntrou={(codigo, dados) => setSessao({ codigo, dados })} />
        )}
      </div>
    </main>
  );
}

function Entrada({ aviso, onEntrou }: { aviso: string; onEntrou: (codigo: string, dados: AcessoColeta) => void }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState(aviso);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    const c = codigo.trim();
    if (c.replace(/[^a-z0-9]/gi, "").length < 8) {
      setErro("Digite o código completo, como CENT-2026.");
      return;
    }
    setEntrando(true);
    setErro("");
    try {
      onEntrou(c, await api.acessoColeta(c));
    } catch (err) {
      setErro(mensagemDeErro(err, "Não foi possível entrar. Tente novamente."));
      setEntrando(false);
    }
  }

  return (
    <section className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">
      <h2 className="font-serif text-2xl font-bold text-gray-800">Entrar com o código</h2>
      <p className="mt-2 text-sm text-gray-500">
        Use o código de acesso que a SMCELT repassou ao seu estabelecimento.
      </p>
      <form onSubmit={entrar} noValidate className="mt-6">
        <label className="block">
          <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">CÓDIGO DE ACESSO</span>
          <input
            type="text"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setErro("");
            }}
            disabled={entrando}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            aria-invalid={Boolean(erro)}
            className={`${classeCampo(erro)} font-mono text-lg tracking-widest text-center`}
          />
        </label>
        {erro && <Aviso>{erro}</Aviso>}
        <button
          type="submit"
          disabled={entrando}
          className="mt-6 w-full bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-3 disabled:opacity-60 disabled:cursor-wait"
        >
          {entrando ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-xs text-gray-500 text-center">
        Não tem o código ou ele parou de funcionar? Fale com a SMCELT.
      </p>
    </section>
  );
}

function Formulario({
  codigo,
  dados,
  onSair,
  onCodigoInvalido,
}: {
  codigo: string;
  dados: AcessoColeta;
  onSair: () => void;
  onCodigoInvalido: () => void;
}) {
  const [envios, setEnvios] = useState<EnvioColeta[]>(dados.envios);
  const [indicadorId, setIndicadorId] = useState(dados.indicadores.length === 1 ? String(dados.indicadores[0].id) : "");
  const [periodo, setPeriodo] = useState(mesAnterior());
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erros, setErros] = useState<{ indicador?: string; valor?: string }>({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<EnvioColeta>();

  const indicador = dados.indicadores.find((i) => String(i.id) === indicadorId);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso(undefined);
    const numero = lerNumero(valor);
    const v: typeof erros = {};
    if (!indicador) v.indicador = "Escolha o que você vai informar.";
    if (numero === null) v.valor = "Informe o valor, só com números.";
    else if (numero < 0) v.valor = "O valor não pode ser negativo.";
    else if (indicador?.unidade === "%" && numero > 100) v.valor = "Uma porcentagem não pode passar de 100.";
    setErros(v);
    if (Object.keys(v).length || numero === null || !indicador) return;

    setEnviando(true);
    try {
      const envio = await api.enviarColeta({
        codigo,
        indicadorId: indicador.id,
        valor: numero,
        periodo,
        observacao: observacao.trim() || null,
      });
      setEnvios((l) => [envio, ...l]);
      setSucesso(envio);
      setValor("");
      setObservacao("");
    } catch (err) {
      // 401 aqui = o código foi trocado pela SMCELT enquanto a página estava aberta
      if (err instanceof ApiError && err.status === 401) return onCodigoInvalido();
      setErro(mensagemDeErro(err, "Não foi possível enviar. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-violet-700">{dados.estabelecimento.categoria.toUpperCase()}</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-gray-800">{dados.estabelecimento.nome}</h2>
          </div>
          <button
            onClick={onSair}
            className="self-start border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-4 py-1.5"
          >
            Sair
          </button>
        </div>

        {dados.indicadores.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No momento não há dados abertos para envio. Fale com a SMCELT.</p>
        ) : (
          <form onSubmit={enviar} noValidate className="mt-6">
            <h3 className="font-semibold text-gray-800">Enviar dados do mês</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">O QUE VOCÊ VAI INFORMAR</span>
                <select
                  value={indicadorId}
                  onChange={(e) => {
                    setIndicadorId(e.target.value);
                    setErros((x) => ({ ...x, indicador: undefined }));
                  }}
                  disabled={enviando}
                  aria-invalid={Boolean(erros.indicador)}
                  className={classeCampo(erros.indicador)}
                >
                  <option value="">Escolha…</option>
                  {dados.indicadores.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome} ({i.unidade})
                    </option>
                  ))}
                </select>
                {erros.indicador ? (
                  <span className="block mt-1 text-xs text-red-600">{erros.indicador}</span>
                ) : (
                  indicador?.descricao && <span className="block mt-1 text-xs text-gray-500">{indicador.descricao}</span>
                )}
              </label>
              <label className="block">
                <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">MÊS DE REFERÊNCIA</span>
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} disabled={enviando} className={classeCampo()}>
                  {MESES.map((m) => (
                    <option key={m} value={m}>
                      {formatarMes(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">
                  VALOR {indicador && `(${indicador.unidade})`}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => {
                    setValor(e.target.value);
                    setErros((x) => ({ ...x, valor: undefined }));
                  }}
                  disabled={enviando}
                  placeholder={indicador?.unidade === "%" ? "Ex.: 72,5" : "Ex.: 1.250"}
                  aria-invalid={Boolean(erros.valor)}
                  className={classeCampo(erros.valor)}
                />
                {erros.valor && <span className="block mt-1 text-xs text-red-600">{erros.valor}</span>}
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">OBSERVAÇÃO (OPCIONAL)</span>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  disabled={enviando}
                  maxLength={1000}
                  rows={2}
                  placeholder="Ex.: movimento maior por causa de um evento na cidade"
                  className={classeCampo()}
                />
              </label>
            </div>

            {erro && <Aviso>{erro}</Aviso>}
            {sucesso && (
              <p role="status" className="mt-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
                Enviado! {sucesso.indicador.nome} de {formatarMes(sucesso.periodo)}:{" "}
                {formatarValor(sucesso.valor, sucesso.indicador.unidade)}. Agora é só aguardar a análise da SMCELT.
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={enviando}
                className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
        <h3 className="font-semibold text-gray-800">Seus envios</h3>
        {envios.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nenhum envio ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {envios.map((e) => (
              <li key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {e.indicador.nome} · {formatarMes(e.periodo)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatarValor(e.valor, e.indicador.unidade)} · enviado em {formatarData(e.enviadoEm)}
                  </p>
                  {e.status === "REJEITADA" && e.motivoRejeicao && (
                    <p className="mt-1 text-xs text-red-700">Motivo: {e.motivoRejeicao}</p>
                  )}
                </div>
                <span className={`self-start shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUS[e.status].classe}`}>
                  {STATUS[e.status].rotulo}
                </span>
              </li>
            ))}
          </ul>
        )}
        {envios.some((e) => e.status === "REJEITADA") && (
          <p className="mt-4 text-xs text-gray-500">Envios rejeitados podem ser corrigidos e enviados de novo.</p>
        )}
      </section>
    </div>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      {children}
    </p>
  );
}
