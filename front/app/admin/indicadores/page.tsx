"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type DadosIndicador, type IndicadorCompleto } from "@/lib/api";
import { IconeAlerta, IconeGrafico, IconeLapis, IconeLixeira } from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

// Cadastro dos indicadores que aparecem no dashboard e na tela "Lançar valores".
// Desativar esconde o indicador do site sem apagar os valores já lançados.

const AGREGACOES: { valor: DadosIndicador["agregacao"]; rotulo: string; ajuda: string }[] = [
  { valor: "SOMA", rotulo: "Soma", ajuda: "Soma os meses do período (ex.: visitantes)" },
  { valor: "MEDIA", rotulo: "Média", ajuda: "Média dos meses (ex.: taxa de ocupação)" },
  { valor: "ULTIMO", rotulo: "Último valor", ajuda: "Usa o mês mais recente (ex.: leitos disponíveis)" },
];
const rotuloAgregacao = (a: DadosIndicador["agregacao"]) => AGREGACOES.find((x) => x.valor === a)?.rotulo ?? a;

const VAZIO: DadosIndicador = {
  nome: "",
  categoria: "",
  unidade: "",
  descricao: "",
  agregacao: "SOMA",
  ativo: true,
  coletaEstabelecimento: false,
};

type Erros = { nome?: string; categoria?: string; unidade?: string };

// Mesmas regras do back-end (indicadorSchema)
function validar(d: DadosIndicador) {
  const erros: Erros = {};
  if (d.nome.trim().length < 2) erros.nome = "Informe o nome do indicador.";
  if (d.categoria.trim().length < 2) erros.categoria = "Informe o setor (ex.: Hospedagem).";
  if (!d.unidade.trim()) erros.unidade = "Informe a unidade (ex.: pessoas, %).";
  return erros;
}

const limpar = (d: DadosIndicador): DadosIndicador => ({
  ...d,
  nome: d.nome.trim(),
  categoria: d.categoria.trim(),
  unidade: d.unidade.trim(),
  descricao: d.descricao?.trim() || null,
});

// A API devolve "Registro duplicado." quando já existe o mesmo nome no mesmo setor
function mensagemDeErro(err: unknown, padrao: string) {
  if (err instanceof ApiError && err.status === 409) return "Já existe um indicador com este nome neste setor.";
  return err instanceof Error ? err.message : padrao;
}

const ordenar = (l: IndicadorCompleto[]) =>
  [...l].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

type Dados = { tentativa: number; lista?: IndicadorCompleto[]; erro?: boolean };

export default function Indicadores() {
  const { usuario, sessaoExpirou } = useSessao();
  const ehAdmin = usuario.papel === "ADMIN"; // excluir é só do ADMIN na API

  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  const [novo, setNovo] = useState(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroApi, setErroApi] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [editando, setEditando] = useState<IndicadorCompleto>();
  const [excluindo, setExcluindo] = useState<IndicadorCompleto>();
  const [alternando, setAlternando] = useState<number>(); // id do indicador sendo ativado/desativado
  const [erroLista, setErroLista] = useState("");

  useEffect(() => {
    let cancelado = false;
    api
      .todosIndicadores()
      .then((lista) => !cancelado && setDados({ tentativa, lista: ordenar(lista) }))
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
        setDados({ tentativa, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa, sessaoExpirou]);

  function atualizarLista(fn: (lista: IndicadorCompleto[]) => IndicadorCompleto[]) {
    setDados((d) => d && { ...d, lista: ordenar(fn(d.lista ?? [])) });
  }

  const lista = dados?.lista ?? [];
  const setores = [...new Set(lista.map((i) => i.categoria))];

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setErroApi("");
    const v = validar(novo);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    try {
      const criado = await api.criarIndicador(limpar(novo));
      atualizarLista((l) => [...l, criado]);
      setNovo(VAZIO);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      setErroApi(mensagemDeErro(err, "Não foi possível cadastrar."));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(i: IndicadorCompleto) {
    setErroLista("");
    setAlternando(i.id);
    try {
      const atualizado = await api.editarIndicador(i.id, { ativo: !i.ativo });
      atualizarLista((l) => l.map((x) => (x.id === i.id ? atualizado : x)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      setErroLista(mensagemDeErro(err, "Não foi possível alterar o indicador."));
    } finally {
      setAlternando(undefined);
    }
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Indicadores</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-500">
        O que o Observatório acompanha. Os indicadores ativos aparecem no dashboard público e na tela Lançar valores.
      </p>

      <form onSubmit={cadastrar} noValidate className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
        <h2 className="font-serif text-xl font-bold text-gray-800">Novo indicador</h2>
        <div className="mt-5">
          <CamposIndicador
            valor={novo}
            erros={erros}
            setores={setores}
            desabilitado={salvando}
            onChange={(d, campo) => {
              setNovo(d);
              setErros((x) => ({ ...x, [campo]: undefined }));
            }}
          />
        </div>
        {erroApi && <Aviso>{erroApi}</Aviso>}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </div>
      </form>

      <section aria-busy={carregando} className={`mt-8 transition-opacity ${carregando ? "opacity-50" : ""}`}>
        <h2 className="font-serif text-xl font-bold text-gray-800">
          Cadastrados {dados?.lista && `(${lista.length})`}
        </h2>
        {erroLista && <Aviso>{erroLista}</Aviso>}

        {dados?.erro && !carregando && (
          <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">Não foi possível carregar os indicadores.</p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="mt-3 border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!dados?.erro && !carregando && lista.length === 0 && (
          <div className="mt-4 bg-white border border-gray-200 rounded-2xl px-6 py-14 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <IconeGrafico />
            </div>
            <p className="mt-4 text-sm text-gray-500">Nenhum indicador cadastrado ainda.</p>
          </div>
        )}

        {setores.map((setor) => (
          <div key={setor} className="mt-6">
            <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">{setor}</h3>
            <ul className="mt-3 space-y-3">
              {lista
                .filter((i) => i.categoria === setor)
                .map((i) => (
                  <li
                    key={i.id}
                    className={`bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                      i.ativo ? "" : "opacity-70"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800">{i.nome}</p>
                      <p className="text-xs text-gray-500">
                        {[i.unidade, rotuloAgregacao(i.agregacao), i.descricao].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Etiqueta cor={i.ativo ? "verde" : "cinza"}>{i.ativo ? "Ativo" : "Inativo"}</Etiqueta>
                        {i.coletaEstabelecimento && <Etiqueta cor="violeta">Coleta dos estabelecimentos</Etiqueta>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => alternarAtivo(i)}
                        disabled={alternando === i.id}
                        className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-4 py-2 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {alternando === i.id ? "Salvando..." : i.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => setEditando(i)}
                        aria-label={`Editar ${i.nome}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                      >
                        <IconeLapis />
                      </button>
                      {ehAdmin && (
                        <button
                          onClick={() => setExcluindo(i)}
                          aria-label={`Excluir ${i.nome}`}
                          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <IconeLixeira />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      {editando && (
        <ModalEditar
          indicador={editando}
          setores={setores}
          onFechar={() => setEditando(undefined)}
          onSalvo={(atualizado) => {
            atualizarLista((l) => l.map((x) => (x.id === atualizado.id ? atualizado : x)));
            setEditando(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          indicador={excluindo}
          onFechar={() => setExcluindo(undefined)}
          onDesativar={() => {
            const alvo = excluindo;
            setExcluindo(undefined);
            if (alvo.ativo) alternarAtivo(alvo);
          }}
          onExcluido={(id) => {
            atualizarLista((l) => l.filter((x) => x.id !== id));
            setExcluindo(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

function CamposIndicador({
  valor,
  erros,
  setores,
  desabilitado,
  mostrarAtivo,
  onChange,
}: {
  valor: DadosIndicador;
  erros: Erros;
  setores: string[];
  desabilitado?: boolean;
  mostrarAtivo?: boolean;
  onChange: (d: DadosIndicador, campo: keyof DadosIndicador) => void;
}) {
  const texto = (nome: "nome" | "categoria" | "unidade", rotulo: string, max: number, placeholder: string, lista?: string) => (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      <input
        type="text"
        value={valor[nome]}
        maxLength={max}
        list={lista}
        disabled={desabilitado}
        placeholder={placeholder}
        aria-invalid={Boolean(erros[nome])}
        onChange={(e) => onChange({ ...valor, [nome]: e.target.value }, nome)}
        className={classeCampo(erros[nome])}
      />
      {erros[nome] && <span className="block mt-1 text-xs text-red-600">{erros[nome]}</span>}
    </label>
  );

  const caixa = (nome: "ativo" | "coletaEstabelecimento", rotulo: string, ajuda: string) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={valor[nome]}
        disabled={desabilitado}
        onChange={(e) => onChange({ ...valor, [nome]: e.target.checked }, nome)}
        className="mt-0.5 w-4 h-4 accent-violet-600"
      />
      <span>
        <span className="block text-sm font-medium text-gray-800">{rotulo}</span>
        <span className="block text-xs text-gray-500">{ajuda}</span>
      </span>
    </label>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {texto("nome", "NOME", 120, "Ex.: Visitantes no mês")}
      {texto("categoria", "SETOR", 60, "Ex.: Visitantes", "setores-indicador")}
      {texto("unidade", "UNIDADE", 30, "Ex.: pessoas, %, leitos")}
      <label className="block">
        <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">COMO SOMAR OS MESES</span>
        <select
          value={valor.agregacao}
          disabled={desabilitado}
          onChange={(e) => onChange({ ...valor, agregacao: e.target.value as DadosIndicador["agregacao"] }, "agregacao")}
          className={classeCampo()}
        >
          {AGREGACOES.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.rotulo}
            </option>
          ))}
        </select>
        <span className="block mt-1 text-xs text-gray-500">
          {AGREGACOES.find((a) => a.valor === valor.agregacao)?.ajuda}
        </span>
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">DESCRIÇÃO (OPCIONAL)</span>
        <input
          type="text"
          value={valor.descricao ?? ""}
          maxLength={255}
          disabled={desabilitado}
          placeholder="Ex.: Pessoas que visitaram a cidade no mês, segundo os meios de hospedagem"
          onChange={(e) => onChange({ ...valor, descricao: e.target.value }, "descricao")}
          className={classeCampo()}
        />
      </label>
      <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
        {mostrarAtivo && caixa("ativo", "Ativo", "Aparece no dashboard público e na tela Lançar valores.")}
        {caixa(
          "coletaEstabelecimento",
          "Coleta dos estabelecimentos",
          "Hotéis e pousadas podem enviar este indicador pelo formulário de coleta.",
        )}
      </div>
      <datalist id="setores-indicador">
        {setores.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

function ModalEditar({
  indicador,
  setores,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  indicador: IndicadorCompleto;
  setores: string[];
  onFechar: () => void;
  onSalvo: (i: IndicadorCompleto) => void;
  onSessaoExpirada: () => void;
}) {
  const [valor, setValor] = useState<DadosIndicador>({
    nome: indicador.nome,
    categoria: indicador.categoria,
    unidade: indicador.unidade,
    descricao: indicador.descricao ?? "",
    agregacao: indicador.agregacao,
    ativo: indicador.ativo,
    coletaEstabelecimento: indicador.coletaEstabelecimento,
  });
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const mudouAgregacao = valor.agregacao !== indicador.agregacao;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validar(valor);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    setErro("");
    try {
      onSalvo(await api.editarIndicador(indicador.id, limpar(valor)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(mensagemDeErro(err, "Não foi possível salvar."));
      setSalvando(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[620px]">
      <form onSubmit={salvar} noValidate>
        <h2 className="font-serif text-2xl font-bold text-gray-800">Editar indicador</h2>
        <div className="mt-5">
          <CamposIndicador
            valor={valor}
            erros={erros}
            setores={setores}
            desabilitado={salvando}
            mostrarAtivo
            onChange={(d, campo) => {
              setValor(d);
              setErros((x) => ({ ...x, [campo]: undefined }));
            }}
          />
        </div>
        {mudouAgregacao && (
          <p className="mt-4 flex gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
            <IconeAlerta /> Mudar como os meses são somados altera os totais que o dashboard já mostra.
          </p>
        )}
        {erro && <Aviso>{erro}</Aviso>}
        <div className="mt-6 flex justify-end gap-3">
          <BotaoCancelar onClick={onFechar} />
          <button
            type="submit"
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Excluir apaga também todos os valores lançados. Por isso a tela oferece desativar como alternativa.
function ModalExcluir({
  indicador,
  onFechar,
  onDesativar,
  onExcluido,
  onSessaoExpirada,
}: {
  indicador: IndicadorCompleto;
  onFechar: () => void;
  onDesativar: () => void;
  onExcluido: (id: number) => void;
  onSessaoExpirada: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir() {
    setExcluindo(true);
    setErro("");
    try {
      await api.excluirIndicador(indicador.id);
      onExcluido(indicador.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(mensagemDeErro(err, "Não foi possível excluir."));
      setExcluindo(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[460px]">
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
        <IconeLixeira tamanho={22} />
      </div>
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Excluir este indicador?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        <strong className="text-gray-700">{indicador.nome}</strong>. Todos os valores já lançados e os envios dos
        estabelecimentos deste indicador também serão apagados, e isso não pode ser desfeito.
      </p>
      {indicador.ativo && (
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          Para só tirar do site e manter o histórico, use <strong className="text-gray-700">Desativar</strong>.
        </p>
      )}
      {erro && <Aviso>{erro}</Aviso>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <BotaoCancelar onClick={onFechar} />
        {indicador.ativo && (
          <button
            type="button"
            onClick={onDesativar}
            className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
          >
            Desativar
          </button>
        )}
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

function Etiqueta({ cor, children }: { cor: "verde" | "cinza" | "violeta"; children: ReactNode }) {
  const classes = {
    verde: "bg-green-50 text-green-700",
    cinza: "bg-gray-100 text-gray-600",
    violeta: "bg-violet-50 text-violet-700",
  }[cor];
  return <span className={`inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 ${classes}`}>{children}</span>;
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
