"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, type ContagemSubmissoes, type StatusSubmissao, type Submissao } from "@/lib/api";
import { formatarData, formatarMesLongo, formatarValor } from "../_componentes/formato";
import { IconeAlerta, IconeCaixa } from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

const ABAS: { status: StatusSubmissao; titulo: string }[] = [
  { status: "PENDENTE", titulo: "Pendentes" },
  { status: "APROVADA", titulo: "Aprovados" },
  { status: "REJEITADA", titulo: "Rejeitados" },
];

type Dados = { chave: string; envios?: Submissao[]; erro?: boolean };

// Análise dos valores enviados pelos estabelecimentos no formulário de coleta.
// Aprovar publica o valor no dashboard; rejeitar devolve ao estabelecimento com o motivo.
export default function Envios() {
  const { sessaoExpirou } = useSessao();
  const [aba, setAba] = useState<StatusSubmissao>("PENDENTE");
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const [contagem, setContagem] = useState<ContagemSubmissoes>();
  const [rejeitando, setRejeitando] = useState<Submissao>();
  const [ocupado, setOcupado] = useState<number>(); // id do envio sendo aprovado
  const [erros, setErros] = useState<Record<number, string>>({}); // erro por envio (ex.: 409)

  const chave = `${aba}|${tentativa}`;
  const carregando = dados?.chave !== chave;

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.submissoes(aba), api.contagemSubmissoes()])
      .then(([envios, c]) => {
        if (cancelado) return;
        setDados({ chave, envios });
        setContagem(c);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
        setDados({ chave, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [aba, chave, sessaoExpirou]);

  // Tira o envio analisado da lista de pendentes e atualiza os contadores das abas
  function concluir(s: Submissao) {
    setDados((d) => d && { ...d, envios: d.envios?.filter((x) => x.id !== s.id) });
    setContagem((c) => c && { ...c, PENDENTE: c.PENDENTE - 1, [s.status]: c[s.status] + 1 });
    setRejeitando(undefined);
  }

  async function aprovar(s: Submissao) {
    setOcupado(s.id);
    setErros((e) => ({ ...e, [s.id]: "" }));
    try {
      concluir(await api.aprovarSubmissao(s.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      setErros((e) => ({ ...e, [s.id]: err instanceof Error ? err.message : "Não foi possível aprovar." }));
    } finally {
      setOcupado(undefined);
    }
  }

  const envios = dados?.envios ?? [];

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Envios dos estabelecimentos</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-500">
        Valores enviados pelos hotéis e pousadas. Aprovados aparecem no dashboard; rejeitados voltam com o motivo.
      </p>

      <div role="tablist" className="mt-8 flex gap-2 overflow-x-auto">
        {ABAS.map((a) => (
          <button
            key={a.status}
            role="tab"
            aria-selected={aba === a.status}
            onClick={() => setAba(a.status)}
            className={`whitespace-nowrap text-sm px-4 py-2 rounded-full border ${
              aba === a.status
                ? "bg-violet-50 text-violet-700 border-violet-400 font-semibold"
                : "border-gray-300 text-gray-600 hover:border-violet-300"
            }`}
          >
            {a.titulo}
            {contagem && <span className="ml-1.5 text-xs opacity-75">({contagem[a.status]})</span>}
          </button>
        ))}
      </div>

      <section aria-busy={carregando} className={`mt-6 space-y-3 transition-opacity ${carregando ? "opacity-50" : ""}`}>
        {dados?.erro && !carregando && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">Não foi possível carregar os envios.</p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="mt-3 border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!dados?.erro && !carregando && envios.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-14 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <IconeCaixa />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {aba === "PENDENTE" ? "Nenhum envio aguardando análise." : "Nenhum envio nesta lista ainda."}
            </p>
          </div>
        )}

        {envios.map((s) => (
          <article key={s.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{s.estabelecimento.nome}</p>
                <p className="text-xs text-gray-500">
                  {s.estabelecimento.categoria} · enviado em {formatarData(s.enviadoEm)}
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  {s.indicador.nome} de {formatarMesLongo(s.periodo)}
                </p>
                <p className="text-2xl font-bold text-gray-800">{formatarValor(s.valor, s.indicador.unidade)}</p>
                {s.observacao && <p className="mt-2 text-sm text-gray-500 italic">“{s.observacao}”</p>}
              </div>

              {s.status === "PENDENTE" ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setRejeitando(s)}
                    disabled={ocupado === s.id}
                    className="border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => aprovar(s)}
                    disabled={ocupado === s.id}
                    className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {ocupado === s.id ? "Aprovando..." : "Aprovar"}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-500 sm:text-right shrink-0">
                  <span
                    className={`inline-block font-semibold rounded-full px-2.5 py-1 ${
                      s.status === "APROVADA" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {s.status === "APROVADA" ? "Aprovado" : "Rejeitado"}
                  </span>
                  {s.analisadoEm && (
                    <p className="mt-1.5">
                      {s.analisadoPor ? `por ${s.analisadoPor.nome} ` : ""}em {formatarData(s.analisadoEm)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {s.motivoRejeicao && (
              <p className="mt-3 text-sm bg-red-50 text-red-700 rounded-lg px-3 py-2">Motivo: {s.motivoRejeicao}</p>
            )}
            {erros[s.id] && (
              <p role="alert" className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <IconeAlerta /> {erros[s.id]}
              </p>
            )}
          </article>
        ))}
      </section>

      {rejeitando && (
        <ModalRejeitar
          envio={rejeitando}
          onFechar={() => setRejeitando(undefined)}
          onRejeitado={concluir}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

function ModalRejeitar({
  envio,
  onFechar,
  onRejeitado,
  onSessaoExpirada,
}: {
  envio: Submissao;
  onFechar: () => void;
  onRejeitado: (s: Submissao) => void;
  onSessaoExpirada: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function rejeitar(e: FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 3) return setErro("Explique o motivo da rejeição.");
    setEnviando(true);
    setErro("");
    try {
      onRejeitado(await api.rejeitarSubmissao(envio.id, motivo.trim()));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível rejeitar.");
      setEnviando(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[480px]">
      <form onSubmit={rejeitar} noValidate>
        <h2 className="font-serif text-2xl font-bold text-gray-800">Rejeitar envio</h2>
        <p className="mt-2 text-sm text-gray-500">
          {envio.estabelecimento.nome} · {envio.indicador.nome} de {formatarMesLongo(envio.periodo)}:{" "}
          <strong>{formatarValor(envio.valor, envio.indicador.unidade)}</strong>
        </p>
        <label className="block mt-5">
          <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">MOTIVO</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={255}
            rows={3}
            autoFocus
            placeholder="Ex.: Taxa de ocupação acima de 100%. Confira e envie de novo."
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
          />
          <span className="block mt-1 text-xs text-gray-400">O estabelecimento vê este motivo ao entrar no formulário de coleta.</span>
        </label>
        {erro && (
          <p role="alert" className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            <IconeAlerta /> {erro}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {enviando ? "Rejeitando..." : "Rejeitar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
