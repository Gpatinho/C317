"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type Atrativo, type DadosAtrativo, type TipoAtrativo } from "@/lib/api";
import { formatarData } from "../_componentes/formato";
import { IconeAlerta, IconeCheck, IconeLapis, IconeLixeira, IconeMapa, IconeRelogio } from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

// Inventário turístico: os lugares que aparecem na busca do dashboard e na página /lugares/[id].
// Também mostra os itens sem conferência há mais de 12 meses, para a equipe revisar.

const TIPOS: { valor: TipoAtrativo; rotulo: string; ajuda: string }[] = [
  { valor: "ATRATIVO", rotulo: "Atrativo", ajuda: "O que motiva a visita: igreja, mirante, festa…" },
  { valor: "EQUIPAMENTO", rotulo: "Equipamento", ajuda: "Estrutura que atende o turista: hotel, restaurante…" },
  { valor: "SERVICO", rotulo: "Serviço", ajuda: "Apoio ao turista: guia, agência, transporte…" },
];
const ROTULO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.valor, t.rotulo])) as Record<TipoAtrativo, string>;

type Campos = Record<Exclude<keyof DadosAtrativo, "tipo">, string> & { tipo: TipoAtrativo };
type Erros = Partial<Record<keyof Campos, string>>;

const VAZIO: Campos = {
  nome: "",
  tipo: "ATRATIVO",
  categoria: "",
  descricao: "",
  endereco: "",
  contato: "",
  horarioFuncionamento: "",
  melhorHorario: "",
  periodoMovimentado: "",
  instagram: "",
};

const paraCampos = (a: Atrativo): Campos => ({
  nome: a.nome,
  tipo: a.tipo,
  categoria: a.categoria,
  descricao: a.descricao ?? "",
  endereco: a.endereco ?? "",
  contato: a.contato ?? "",
  horarioFuncionamento: a.horarioFuncionamento ?? "",
  melhorHorario: a.melhorHorario ?? "",
  periodoMovimentado: a.periodoMovimentado ?? "",
  instagram: a.instagram ? `@${a.instagram}` : "",
});

// Mesmas regras do back-end (atrativoSchema)
function validar(c: Campos) {
  const erros: Erros = {};
  if (c.nome.trim().length < 2) erros.nome = "Informe o nome do lugar.";
  if (c.categoria.trim().length < 2) erros.categoria = "Informe a categoria (ex.: Mirante).";
  const insta = c.instagram.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  if (insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta)) erros.instagram = "Use só o nome do perfil, ex.: @inatel";
  return erros;
}

// Campos opcionais vazios viram null para apagar o valor no banco
const limpar = (c: Campos): DadosAtrativo => {
  const opcional = (v: string) => v.trim() || null;
  return {
    nome: c.nome.trim(),
    tipo: c.tipo,
    categoria: c.categoria.trim(),
    descricao: opcional(c.descricao),
    endereco: opcional(c.endereco),
    contato: opcional(c.contato),
    horarioFuncionamento: opcional(c.horarioFuncionamento),
    melhorHorario: opcional(c.melhorHorario),
    periodoMovimentado: opcional(c.periodoMovimentado),
    instagram: c.instagram.trim(), // a API aceita "@perfil", "perfil" ou o link, e "" apaga
  };
};

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

type Dados = { tentativa: number; lista?: Atrativo[]; pendentes?: { meses: number; ids: Set<number> }; erro?: boolean };

export default function Inventario() {
  const { usuario, sessaoExpirou } = useSessao();
  const ehAdmin = usuario.papel === "ADMIN"; // excluir é só do ADMIN na API

  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  const [filtroTipo, setFiltroTipo] = useState<TipoAtrativo | "">("");
  const [busca, setBusca] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Atrativo>();
  const [excluindo, setExcluindo] = useState<Atrativo>();
  const [revisando, setRevisando] = useState<number>(); // id do item sendo marcado como revisado
  const [erroLista, setErroLista] = useState("");

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.atrativos(), api.revisaoPendente()])
      .then(([lista, revisao]) => {
        if (cancelado) return;
        setDados({ tentativa, lista, pendentes: { meses: revisao.meses, ids: new Set(revisao.atrativos.map((a) => a.id)) } });
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

  // Depois de salvar ou revisar, o item foi conferido agora: sai da lista de pendentes
  function aplicar(atualizado: Atrativo) {
    setDados((d) => {
      if (!d) return d;
      const existe = d.lista?.some((x) => x.id === atualizado.id);
      const lista = existe ? d.lista!.map((x) => (x.id === atualizado.id ? atualizado : x)) : [...(d.lista ?? []), atualizado];
      const ids = new Set(d.pendentes?.ids);
      ids.delete(atualizado.id);
      return { ...d, lista, pendentes: d.pendentes && { ...d.pendentes, ids } };
    });
  }

  async function revisar(a: Atrativo) {
    setRevisando(a.id);
    setErroLista("");
    try {
      aplicar(await api.revisarAtrativo(a.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      setErroLista(err instanceof Error ? err.message : "Não foi possível marcar como revisado.");
    } finally {
      setRevisando(undefined);
    }
  }

  const pendentes = dados?.pendentes;
  const totalPendentes = pendentes?.ids.size ?? 0;
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const lista = (dados?.lista ?? [])
    .filter((a) => !filtroTipo || a.tipo === filtroTipo)
    .filter((a) => !soPendentes || pendentes?.ids.has(a.id))
    .filter((a) => !termo || `${a.nome} ${a.categoria} ${a.endereco ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Inventário turístico</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500">
            Lugares que aparecem na busca do dashboard, com horários e dicas para o visitante.
          </p>
        </div>
        <button
          onClick={() => setFormAberto(true)}
          className="self-start sm:self-auto bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5"
        >
          + Novo lugar
        </button>
      </div>

      {/* Lembrete de revisão */}
      {!carregando && totalPendentes > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">
          <p className="text-sm flex items-center gap-2">
            <IconeRelogio />
            {totalPendentes === 1
              ? `1 item está sem revisão há mais de ${pendentes!.meses} meses.`
              : `${totalPendentes} itens estão sem revisão há mais de ${pendentes!.meses} meses.`}
          </p>
          <button
            onClick={() => setSoPendentes((v) => !v)}
            className="self-start sm:self-auto bg-white border border-amber-300 hover:bg-amber-100 text-sm font-semibold rounded-full px-4 py-1.5"
          >
            {soPendentes ? "Mostrar todos" : "Ver só esses"}
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center gap-3">
        <label className="flex-1">
          <span className="sr-only">Buscar no inventário</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, categoria ou endereço"
            className={classeCampo()}
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          {[{ valor: "" as const, rotulo: "Todos" }, ...TIPOS].map((t) => (
            <button
              key={t.valor || "todos"}
              onClick={() => setFiltroTipo(t.valor)}
              aria-pressed={filtroTipo === t.valor}
              className={`text-sm rounded-full px-4 py-1.5 border ${
                filtroTipo === t.valor ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erroLista && <Aviso>{erroLista}</Aviso>}

      <section aria-busy={carregando} className={`mt-6 transition-opacity ${carregando ? "opacity-50" : ""}`}>
        {dados?.erro && !carregando && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">Não foi possível carregar o inventário.</p>
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
              <IconeMapa />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {dados?.lista?.length ? "Nenhum lugar encontrado com esses filtros." : "Nenhum lugar cadastrado ainda."}
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {lista.map((a) => {
            const atrasado = pendentes?.ids.has(a.id);
            const faltaInfo = !a.horarioFuncionamento && !a.melhorHorario && !a.periodoMovimentado;
            return (
              <li key={a.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-800">{a.nome}</p>
                    <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
                      {ROTULO_TIPO[a.tipo]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{[a.categoria, a.endereco].filter(Boolean).join(" · ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                        atrasado ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                      }`}
                    >
                      {atrasado ? "Revisão atrasada" : "Revisado"} em {formatarData(a.revisadoEm)}
                    </span>
                    {faltaInfo && (
                      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-gray-100 text-gray-500">
                        Sem horários para o visitante
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/lugares/${a.id}`}
                    target="_blank"
                    className="text-sm text-violet-700 hover:underline px-2"
                  >
                    Ver página ↗
                  </Link>
                  {atrasado && (
                    <button
                      onClick={() => revisar(a)}
                      disabled={revisando === a.id}
                      className="border border-amber-300 text-amber-800 hover:bg-amber-50 text-sm font-semibold rounded-full px-4 py-2 disabled:opacity-60 disabled:cursor-wait flex items-center gap-1.5"
                    >
                      <IconeCheck /> {revisando === a.id ? "Salvando..." : "Marcar como revisado"}
                    </button>
                  )}
                  <button
                    onClick={() => setEditando(a)}
                    aria-label={`Editar ${a.nome}`}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  >
                    <IconeLapis />
                  </button>
                  {ehAdmin && (
                    <button
                      onClick={() => setExcluindo(a)}
                      aria-label={`Excluir ${a.nome}`}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <IconeLixeira />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {(formAberto || editando) && (
        <ModalFormulario
          atrativo={editando}
          onFechar={() => {
            setFormAberto(false);
            setEditando(undefined);
          }}
          onSalvo={(a) => {
            aplicar(a);
            setFormAberto(false);
            setEditando(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          atrativo={excluindo}
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
  atrativo,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  atrativo?: Atrativo; // sem atrativo = novo lugar
  onFechar: () => void;
  onSalvo: (a: Atrativo) => void;
  onSessaoExpirada: () => void;
}) {
  const [campos, setCampos] = useState<Campos>(atrativo ? paraCampos(atrativo) : VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);

  // Sugestões de categoria já usadas no inventário, para manter os nomes padronizados
  useEffect(() => {
    let cancelado = false;
    fetchCategorias(campos.tipo).then((c) => !cancelado && setCategorias(c));
    return () => {
      cancelado = true;
    };
  }, [campos.tipo]);

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
      onSalvo(atrativo ? await api.editarAtrativo(atrativo.id, dados) : await api.criarAtrativo(dados));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSalvando(false);
    }
  }

  const texto = (campo: keyof Omit<Campos, "tipo" | "descricao">, rotulo: string, max: number, placeholder: string, lista?: string) => (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      <input
        type="text"
        value={campos[campo]}
        maxLength={max}
        list={lista}
        disabled={salvando}
        placeholder={placeholder}
        aria-invalid={Boolean(erros[campo])}
        onChange={(e) => mudar(campo, e.target.value)}
        className={classeCampo(erros[campo])}
      />
      {erros[campo] && <span className="block mt-1 text-xs text-red-600">{erros[campo]}</span>}
    </label>
  );

  return (
    <Modal onFechar={onFechar} largura="max-w-[680px]">
      <form onSubmit={salvar} noValidate>
        <h2 className="font-serif text-2xl font-bold text-gray-800">{atrativo ? "Editar lugar" : "Novo lugar"}</h2>
        {atrativo && <p className="mt-1 text-xs text-gray-500">Salvar também marca o item como revisado hoje.</p>}

        <fieldset className="mt-5">
          <legend className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">TIPO</legend>
          <div className="grid sm:grid-cols-3 gap-2">
            {TIPOS.map((t) => (
              <label
                key={t.valor}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm ${
                  campos.tipo === t.valor ? "border-violet-500 bg-violet-50" : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={t.valor}
                  checked={campos.tipo === t.valor}
                  onChange={() => mudar("tipo", t.valor)}
                  disabled={salvando}
                  className="sr-only"
                />
                <span className="font-semibold text-gray-800">{t.rotulo}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{t.ajuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {texto("nome", "NOME", 160, "Ex.: Santo Cruzeiro")}
          {texto("categoria", "CATEGORIA", 60, "Ex.: Mirante", "categorias-inventario")}
          {texto("endereco", "ENDEREÇO (OPCIONAL)", 255, "Ex.: Praça Santa Rita, Centro")}
          {texto("contato", "CONTATO (OPCIONAL)", 120, "Ex.: (35) 3471-0000")}
          <datalist id="categorias-inventario">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-gray-800">Informações para o visitante</h3>
        <p className="text-xs text-gray-500">Aparecem na página do lugar. Deixe em branco o que não souber.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {texto("horarioFuncionamento", "HORÁRIO DE FUNCIONAMENTO", 255, "Ex.: Todos os dias, 7h às 19h")}
          {texto("melhorHorario", "MELHOR HORÁRIO PARA VISITAR", 255, "Ex.: Fim da tarde, para o pôr do sol")}
          {texto("periodoMovimentado", "ÉPOCA MAIS MOVIMENTADA", 255, "Ex.: Feriados e Semana Santa")}
          {texto("instagram", "INSTAGRAM", 120, "Ex.: @perfil ou o link")}
        </div>

        <label className="block mt-4">
          <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">DESCRIÇÃO (OPCIONAL)</span>
          <textarea
            value={campos.descricao}
            maxLength={5000}
            rows={4}
            disabled={salvando}
            placeholder="O que o visitante encontra no lugar"
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
            {salvando ? "Salvando..." : atrativo ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Lista de categorias de um tipo (falha silenciosa: são só sugestões)
async function fetchCategorias(tipo: TipoAtrativo) {
  try {
    const lista = await api.atrativos({ tipo });
    return [...new Set(lista.map((a) => a.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch {
    return [];
  }
}

function ModalExcluir({
  atrativo,
  onFechar,
  onExcluido,
  onSessaoExpirada,
}: {
  atrativo: Atrativo;
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
      await api.excluirAtrativo(atrativo.id);
      onExcluido(atrativo.id);
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
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Excluir este lugar?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {atrativo.nome} deixa de aparecer na busca do dashboard e a página dele sai do ar.
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
