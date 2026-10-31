"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type DadosEvento, type Evento } from "@/lib/api";
import { IconeAlerta, IconeCalendario, IconeLapis, IconeLixeira } from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

// Agenda de eventos turísticos. Os próximos aparecem no dashboard público ("Próximos eventos").

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

// Datas vêm como "2027-07-12T00:00:00.000Z": usa só os 10 primeiros caracteres,
// sem new Date(), para não mostrar o dia anterior no fuso do Brasil.
const dia = (iso: string) => iso.slice(0, 10);
function formatarDia(d: string) {
  const [a, m, di] = d.split("-");
  return `${Number(di)} ${MESES[Number(m) - 1]} ${a}`;
}
function periodo(e: Evento) {
  const inicio = dia(e.dataInicio);
  const fim = e.dataFim && dia(e.dataFim);
  return !fim || fim === inicio ? formatarDia(inicio) : `${formatarDia(inicio)} a ${formatarDia(fim)}`;
}

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Campos = {
  nome: string;
  icone: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  contato: string;
  gratuito: boolean;
  descricao: string;
};
type Erros = Partial<Record<keyof Campos, string>>;

const VAZIO: Campos = { nome: "", icone: "", dataInicio: "", dataFim: "", local: "", contato: "", gratuito: true, descricao: "" };

const paraCampos = (e: Evento): Campos => ({
  nome: e.nome,
  icone: e.icone ?? "",
  dataInicio: dia(e.dataInicio),
  dataFim: e.dataFim ? dia(e.dataFim) : "",
  local: e.local,
  contato: e.contato ?? "",
  gratuito: e.gratuito,
  descricao: e.descricao ?? "",
});

// Mesmas regras do back-end (eventoSchema)
function validar(c: Campos) {
  const erros: Erros = {};
  if (c.nome.trim().length < 3) erros.nome = "Informe o nome do evento.";
  if (!c.dataInicio) erros.dataInicio = "Informe a data de início.";
  if (c.dataFim && c.dataInicio && c.dataFim < c.dataInicio) erros.dataFim = "A data final não pode ser antes da inicial.";
  if (c.local.trim().length < 2) erros.local = "Informe o local.";
  return erros;
}

const limpar = (c: Campos): DadosEvento => ({
  nome: c.nome.trim(),
  icone: c.icone.trim() || null,
  dataInicio: c.dataInicio,
  dataFim: c.dataFim && c.dataFim !== c.dataInicio ? c.dataFim : null,
  local: c.local.trim(),
  contato: c.contato.trim() || null,
  gratuito: c.gratuito,
  descricao: c.descricao.trim() || null,
});

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

type Dados = { tentativa: number; lista?: Evento[]; erro?: boolean };

export default function Eventos() {
  const { usuario, sessaoExpirou } = useSessao();
  const ehAdmin = usuario.papel === "ADMIN"; // excluir é só do ADMIN na API

  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  const [aba, setAba] = useState<"proximos" | "passados">("proximos");
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Evento>();
  const [excluindo, setExcluindo] = useState<Evento>();

  useEffect(() => {
    let cancelado = false;
    api
      .eventos()
      .then((lista) => !cancelado && setDados({ tentativa, lista }))
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
        setDados({ tentativa, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa, sessaoExpirou]);

  function salvo(e: Evento) {
    setDados((d) => {
      if (!d) return d;
      const existe = d.lista?.some((x) => x.id === e.id);
      return { ...d, lista: existe ? d.lista!.map((x) => (x.id === e.id ? e : x)) : [...(d.lista ?? []), e] };
    });
    setNovoAberto(false);
    setEditando(undefined);
  }

  // Próximo = ainda não terminou (mesma regra do dashboard). Próximos do mais perto ao mais longe;
  // passados do mais recente ao mais antigo.
  const hj = hoje();
  const fimDe = (e: Evento) => dia(e.dataFim ?? e.dataInicio);
  const todos = dados?.lista ?? [];
  const proximos = todos.filter((e) => fimDe(e) >= hj).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const passados = todos.filter((e) => fimDe(e) < hj).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  const lista = aba === "proximos" ? proximos : passados;

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Eventos</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500">
            Agenda turística da cidade. Os próximos aparecem no dashboard público.
          </p>
        </div>
        <button
          onClick={() => setNovoAberto(true)}
          className="self-start sm:self-auto bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5"
        >
          + Novo evento
        </button>
      </div>

      <div className="mt-6 flex gap-2" role="tablist" aria-label="Eventos">
        {(
          [
            ["proximos", `Próximos (${proximos.length})`],
            ["passados", `Já realizados (${passados.length})`],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            role="tab"
            aria-selected={aba === valor}
            onClick={() => setAba(valor)}
            className={`text-sm rounded-full px-4 py-1.5 border ${
              aba === valor ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold" : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {dados?.lista ? rotulo : rotulo.replace(/ \(\d+\)/, "")}
          </button>
        ))}
      </div>

      <section aria-busy={carregando} className={`mt-6 transition-opacity ${carregando ? "opacity-50" : ""}`}>
        {dados?.erro && !carregando && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">Não foi possível carregar os eventos.</p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="mt-3 border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!dados?.erro && !carregando && lista.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-14 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <IconeCalendario />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {aba === "proximos" ? "Nenhum evento programado." : "Nenhum evento realizado ainda."}
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {lista.map((e) => (
            <li key={e.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-violet-50 flex items-center justify-center text-2xl" aria-hidden>
                {e.icone || "📅"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-800">{e.nome}</p>
                  <span
                    className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                      e.gratuito ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {e.gratuito ? "Gratuito" : "Pago"}
                  </span>
                </div>
                <p className="text-sm text-violet-700 mt-0.5">{periodo(e)}</p>
                <p className="text-xs text-gray-500">{[e.local, e.contato].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditando(e)}
                  aria-label={`Editar ${e.nome}`}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                >
                  <IconeLapis />
                </button>
                {ehAdmin && (
                  <button
                    onClick={() => setExcluindo(e)}
                    aria-label={`Excluir ${e.nome}`}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <IconeLixeira />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(novoAberto || editando) && (
        <ModalFormulario
          evento={editando}
          onFechar={() => {
            setNovoAberto(false);
            setEditando(undefined);
          }}
          onSalvo={salvo}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          evento={excluindo}
          onFechar={() => setExcluindo(undefined)}
          onExcluido={(id) => {
            setDados((d) => d && { ...d, lista: d.lista?.filter((x) => x.id !== id) });
            setExcluindo(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

function ModalFormulario({
  evento,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  evento?: Evento; // sem evento = novo
  onFechar: () => void;
  onSalvo: (e: Evento) => void;
  onSessaoExpirada: () => void;
}) {
  const [campos, setCampos] = useState<Campos>(evento ? paraCampos(evento) : VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mudar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validar(campos);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    setErro("");
    try {
      const dados = limpar(campos);
      onSalvo(evento ? await api.editarEvento(evento.id, dados) : await api.criarEvento(dados));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSalvando(false);
    }
  }

  const campo = (
    nome: Exclude<keyof Campos, "gratuito" | "descricao">,
    rotulo: string,
    props: { type?: string; max?: number; placeholder?: string; min?: string } = {},
  ) => (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      <input
        type={props.type ?? "text"}
        value={campos[nome]}
        maxLength={props.max}
        min={props.min}
        disabled={salvando}
        placeholder={props.placeholder}
        aria-invalid={Boolean(erros[nome])}
        onChange={(e) => mudar(nome, e.target.value)}
        className={classeCampo(erros[nome])}
      />
      {erros[nome] && <span className="block mt-1 text-xs text-red-600">{erros[nome]}</span>}
    </label>
  );

  return (
    <Modal onFechar={onFechar} largura="max-w-[620px]">
      <form onSubmit={salvar} noValidate>
        <h2 className="font-serif text-2xl font-bold text-gray-800">{evento ? "Editar evento" : "Novo evento"}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_120px]">
          {campo("nome", "NOME", { max: 160, placeholder: "Ex.: Festival de Inverno" })}
          {campo("icone", "ÍCONE (EMOJI)", { max: 8, placeholder: "🎵" })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {campo("dataInicio", "DATA DE INÍCIO", { type: "date" })}
          <div>
            {campo("dataFim", "DATA FINAL (OPCIONAL)", { type: "date", min: campos.dataInicio || undefined })}
            {!erros.dataFim && <span className="block mt-1 text-xs text-gray-500">Deixe em branco se for um dia só.</span>}
          </div>
          {campo("local", "LOCAL", { max: 160, placeholder: "Ex.: Praça Santa Rita" })}
          {campo("contato", "CONTATO (OPCIONAL)", { max: 120, placeholder: "Ex.: @festival ou (35) 3471-0000" })}
        </div>

        <fieldset className="mt-4">
          <legend className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">ENTRADA</legend>
          <div className="flex gap-2">
            {[
              { valor: true, rotulo: "Gratuito" },
              { valor: false, rotulo: "Pago" },
            ].map((o) => (
              <label
                key={o.rotulo}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                  campos.gratuito === o.valor ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold" : "border-gray-300 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="gratuito"
                  checked={campos.gratuito === o.valor}
                  onChange={() => mudar("gratuito", o.valor)}
                  disabled={salvando}
                  className="sr-only"
                />
                {o.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block mt-4">
          <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">DESCRIÇÃO (OPCIONAL)</span>
          <textarea
            value={campos.descricao}
            maxLength={5000}
            rows={3}
            disabled={salvando}
            onChange={(e) => mudar("descricao", e.target.value)}
            className={classeCampo()}
          />
        </label>

        {erro && <Aviso>{erro}</Aviso>}
        <div className="mt-6 flex justify-end gap-3">
          <BotaoCancelar onClick={onFechar} />
          <button
            type="submit"
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Salvando..." : evento ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalExcluir({
  evento,
  onFechar,
  onExcluido,
  onSessaoExpirada,
}: {
  evento: Evento;
  onFechar: () => void;
  onExcluido: (id: number) => void;
  onSessaoExpirada: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir() {
    setExcluindo(true);
    setErro("");
    try {
      await api.excluirEvento(evento.id);
      onExcluido(evento.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[420px]">
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
        <IconeLixeira tamanho={22} />
      </div>
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Excluir este evento?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {evento.nome} ({periodo(evento)}) sai da agenda e do dashboard.
      </p>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="mt-6 flex justify-end gap-3">
        <BotaoCancelar onClick={onFechar} />
        <button
          onClick={excluir}
          disabled={excluindo}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
        >
          {excluindo ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </Modal>
  );
}

function BotaoCancelar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
    >
      Cancelar
    </button>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      <IconeAlerta /> {children}
    </p>
  );
}
