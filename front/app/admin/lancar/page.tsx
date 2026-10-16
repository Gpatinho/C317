"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type Estabelecimento, type Indicador, type Registro } from "@/lib/api";
import {
  formatarData,
  formatarMes,
  formatarMesLongo,
  formatarValor,
  lerNumero,
  mesDe,
  numeroParaCampo,
  ultimosMeses,
} from "../_componentes/formato";
import {
  IconeAlerta,
  IconeBusca,
  IconeCheck,
  IconeFechar,
  IconeFiltro,
  IconeLapis,
  IconeLixeira,
  IconePrancheta,
} from "../_componentes/icones";
import { useSessao } from "../_componentes/sessao";

// Quantos lançamentos aparecem antes do botão "Carregar mais"
const POR_PAGINA = 8;

// Meses que aparecem nos selects (do atual para trás, sem meses futuros)
const MESES = ultimosMeses();

// Normalmente se lança o mês que acabou de fechar (em outubro, os dados de setembro)
function mesAnterior() {
  const hoje = new Date();
  return mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
}

// Ignora maiúsculas e acentos na busca
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Valores do formulário como texto (como vêm dos campos). estabelecimentoId "" = município.
type Campos = { indicadorId: string; periodo: string; estabelecimentoId: string; valor: string };
type ErrosCampos = Partial<Record<keyof Campos, string>>;

const camposVazios = (): Campos => ({ indicadorId: "", periodo: mesAnterior(), estabelecimentoId: "", valor: "" });

function camposDe(r: Registro): Campos {
  return {
    indicadorId: String(r.indicadorId),
    periodo: r.periodo,
    estabelecimentoId: r.estabelecimentoId ? String(r.estabelecimentoId) : "",
    valor: numeroParaCampo(r.valor),
  };
}

// Confere os campos antes de mandar para a API
function validar(c: Campos) {
  const erros: ErrosCampos = {};
  if (!c.indicadorId) erros.indicadorId = "Escolha um indicador.";
  if (!c.periodo) erros.periodo = "Escolha o mês de referência.";
  else if (c.periodo > mesDe(new Date())) erros.periodo = "Não é possível lançar meses futuros.";
  const valor = lerNumero(c.valor);
  if (!c.valor.trim()) erros.valor = "Digite o valor.";
  else if (valor === null) erros.valor = "Digite um número válido (ex.: 29.600 ou 83,5).";
  else if (valor < 0) erros.valor = "O valor não pode ser negativo.";

  if (Object.keys(erros).length > 0 || valor === null) return { erros };
  return {
    erros,
    dados: {
      indicadorId: Number(c.indicadorId),
      periodo: c.periodo,
      estabelecimentoId: c.estabelecimentoId ? Number(c.estabelecimentoId) : null,
      valor,
    },
  };
}

// Procura na lista o lançamento que já ocupa o mesmo indicador + mês + estabelecimento
function acharExistente(lista: Registro[], c: Campos, ignorarId?: number) {
  const est = c.estabelecimentoId ? Number(c.estabelecimentoId) : null;
  return lista.find(
    (r) =>
      r.id !== ignorarId &&
      r.indicadorId === Number(c.indicadorId) &&
      r.periodo === c.periodo &&
      (r.estabelecimentoId ?? null) === est,
  );
}

type Dados = {
  tentativa: number;
  indicadores?: Indicador[];
  estabelecimentos?: Estabelecimento[];
  registros?: Registro[];
  erro?: boolean;
};

export default function LancarValores() {
  const { usuario, sessaoExpirou } = useSessao();
  const podeExcluir = usuario.papel === "ADMIN";

  // Cada "tentativa" dispara uma nova busca na API (o botão "Tentar de novo" soma 1)
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  // Formulário "Novo lançamento"
  const [campos, setCampos] = useState<Campos>(camposVazios);
  const [erros, setErros] = useState<ErrosCampos>({});
  const [erroApi, setErroApi] = useState<{ mensagem: string; existente?: Registro }>();
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [destaque, setDestaque] = useState<number>(); // linha recém-criada/editada

  // Filtros da lista
  const [filtroIndicador, setFiltroIndicador] = useState("");
  const [mesInicial, setMesInicial] = useState("");
  const [mesFinal, setMesFinal] = useState("");
  const [busca, setBusca] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false); // só no celular
  const [quantidade, setQuantidade] = useState(POR_PAGINA);

  // Modais
  const [editando, setEditando] = useState<Registro>();
  const [excluindo, setExcluindo] = useState<Registro>();

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.indicadores(), api.estabelecimentos(), api.registros()])
      .then(([indicadores, estabelecimentos, registros]) => {
        if (!cancelado) setDados({ tentativa, indicadores, estabelecimentos, registros });
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

  const indicadores = useMemo(() => dados?.indicadores ?? [], [dados]);
  const estabelecimentos = useMemo(() => dados?.estabelecimentos ?? [], [dados]);

  // Lista ordenada pelo mais recente (criado ou editado) primeiro
  const registros = useMemo(
    () => [...(dados?.registros ?? [])].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [dados],
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return registros.filter(
      (r) =>
        (!filtroIndicador || r.indicadorId === Number(filtroIndicador)) &&
        (!mesInicial || r.periodo >= mesInicial) &&
        (!mesFinal || r.periodo <= mesFinal) &&
        (!termo ||
          normalizar(r.indicador.nome).includes(termo) ||
          normalizar(r.estabelecimento?.nome ?? "").includes(termo)),
    );
  }, [registros, filtroIndicador, mesInicial, mesFinal, busca]);

  const visiveis = filtrados.slice(0, quantidade);

  // Atualiza a lista local sem buscar tudo de novo na API
  function atualizarLista(fn: (lista: Registro[]) => Registro[]) {
    setDados((d) => (d ? { ...d, registros: fn(d.registros ?? []) } : d));
  }

  function alterarCampo(campo: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setErroApi(undefined);
  }

  function limpar() {
    setCampos(camposVazios());
    setErros({});
    setErroApi(undefined);
    setSucesso("");
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSucesso("");
    setErroApi(undefined);
    const v = validar(campos);
    setErros(v.erros);
    if (!v.dados) return;

    setSalvando(true);
    try {
      const novo = await api.lancarValor(v.dados);
      atualizarLista((lista) => [novo, ...lista]);
      setDestaque(novo.id);
      setSucesso("Valor lançado! Ele já aparece no dashboard público.");
      setCampos((c) => ({ ...c, valor: "" }));
      setQuantidade(POR_PAGINA);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      const mensagem = err instanceof Error ? err.message : "Não foi possível salvar.";
      const existente = err instanceof ApiError && err.status === 409 ? acharExistente(registros, campos) : undefined;
      setErroApi({
        mensagem:
          err instanceof ApiError && err.status === 409
            ? "Já existe um valor para este indicador neste mês. Edite-o em vez de criar outro."
            : mensagem,
        existente,
      });
    } finally {
      setSalvando(false);
    }
  }

  function aoEditar(r: Registro) {
    atualizarLista((lista) => lista.map((x) => (x.id === r.id ? r : x)));
    setDestaque(r.id);
    setEditando(undefined);
    setErroApi(undefined);
    setSucesso("Lançamento atualizado! O dashboard já mostra o novo valor.");
  }

  function aoExcluir(id: number) {
    atualizarLista((lista) => lista.filter((x) => x.id !== id));
    setExcluindo(undefined);
    setSucesso("Lançamento excluído.");
  }

  const filtrosAtivos = Boolean(filtroIndicador || mesInicial || mesFinal || busca);

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Lançar valores</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-500">
        Registre o valor mensal de um indicador. Ele aparece no dashboard público assim que for salvo.
      </p>

      {carregando ? (
        <Carregando />
      ) : dados?.erro ? (
        <div
          role="alert"
          className="mt-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
        >
          <p className="text-sm flex items-center gap-2">
            <IconeAlerta /> Não foi possível carregar os dados. Tente novamente em instantes.
          </p>
          <button
            onClick={() => setTentativa((t) => t + 1)}
            className="self-start sm:self-auto bg-white border border-red-300 text-red-700 hover:bg-red-100 text-sm font-semibold rounded-full px-4 py-1.5"
          >
            Tentar de novo
          </button>
        </div>
      ) : (
        <>
          {/* Novo lançamento */}
          <form
            onSubmit={salvar}
            noValidate
            className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6"
          >
            <h2 className="font-serif text-xl font-bold text-gray-800">Novo lançamento</h2>

            {sucesso && (
              <div
                role="status"
                className="mt-5 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3"
              >
                <IconeCheck />
                <span className="flex-1">{sucesso}</span>
                <button type="button" onClick={() => setSucesso("")} aria-label="Fechar aviso" className="text-green-700">
                  <IconeFechar />
                </button>
              </div>
            )}

            <div className="mt-5 grid md:grid-cols-2 gap-x-6 gap-y-5">
              <CamposRegistro
                campos={campos}
                erros={erros}
                indicadores={indicadores}
                estabelecimentos={estabelecimentos}
                onChange={alterarCampo}
                desabilitado={salvando}
              />
            </div>

            {erroApi && (
              <div role="alert" className="mt-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <p>{erroApi.mensagem}</p>
                {erroApi.existente && (
                  <button
                    type="button"
                    onClick={() => setEditando(erroApi.existente)}
                    className="mt-1 font-semibold text-violet-700 hover:underline"
                  >
                    Editar o valor existente →
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={limpar}
                disabled={salvando}
                className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
              >
                Limpar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {salvando ? "Salvando..." : "Salvar lançamento"}
              </button>
            </div>
          </form>

          {/* Lançamentos */}
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl font-bold text-gray-800">Lançamentos</h2>
              {registros.length > 0 && (
                <button
                  onClick={() => setFiltrosAbertos((a) => !a)}
                  aria-expanded={filtrosAbertos}
                  className="md:hidden flex items-center gap-2 border border-violet-200 text-violet-700 text-sm font-semibold rounded-full px-4 py-2"
                >
                  <IconeFiltro /> Filtros{filtrosAtivos && " •"}
                </button>
              )}
            </div>

            {registros.length === 0 ? (
              <ListaVazia />
            ) : (
              <>
                {/* Filtros: sempre visíveis no computador; no celular abrem pelo botão "Filtros" */}
                <div
                  className={`${filtrosAbertos ? "grid" : "hidden"} md:grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_2.4fr] gap-3 mb-4`}
                >
                  <Select
                    value={filtroIndicador}
                    onChange={(v) => {
                      setFiltroIndicador(v);
                      setQuantidade(POR_PAGINA);
                    }}
                    aria-label="Filtrar por indicador"
                  >
                    <option value="">Todos os indicadores</option>
                    {indicadores.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={mesInicial}
                    onChange={(v) => {
                      setMesInicial(v);
                      setQuantidade(POR_PAGINA);
                    }}
                    aria-label="Mês inicial"
                  >
                    <option value="">Mês inicial</option>
                    {MESES.map((m) => (
                      <option key={m} value={m}>
                        {formatarMes(m)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={mesFinal}
                    onChange={(v) => {
                      setMesFinal(v);
                      setQuantidade(POR_PAGINA);
                    }}
                    aria-label="Mês final"
                  >
                    <option value="">Mês final</option>
                    {MESES.map((m) => (
                      <option key={m} value={m}>
                        {formatarMes(m)}
                      </option>
                    ))}
                  </Select>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <IconeBusca />
                    </span>
                    <input
                      type="search"
                      value={busca}
                      onChange={(e) => {
                        setBusca(e.target.value);
                        setQuantidade(POR_PAGINA);
                      }}
                      placeholder="Buscar indicador ou estabelecimento"
                      className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>

                {filtrados.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-10 text-center">
                    <p className="font-semibold text-gray-800">Nenhum lançamento encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">Tente mudar os filtros ou a busca.</p>
                    <button
                      onClick={() => {
                        setFiltroIndicador("");
                        setMesInicial("");
                        setMesFinal("");
                        setBusca("");
                      }}
                      className="mt-4 text-sm font-semibold text-violet-700 hover:underline"
                    >
                      Limpar filtros
                    </button>
                  </div>
                ) : (
                  <>
                    <TabelaLancamentos
                      registros={visiveis}
                      destaque={destaque}
                      podeExcluir={podeExcluir}
                      onEditar={setEditando}
                      onExcluir={setExcluindo}
                    />
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-sm text-gray-500">
                        Exibindo {visiveis.length} de {filtrados.length}
                      </p>
                      {visiveis.length < filtrados.length && (
                        <button
                          onClick={() => setQuantidade((q) => q + POR_PAGINA)}
                          className="w-full sm:w-auto border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5 bg-white"
                        >
                          Carregar mais
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </>
      )}

      {editando && (
        <ModalEditar
          registro={editando}
          registros={registros}
          indicadores={indicadores}
          estabelecimentos={estabelecimentos}
          onFechar={() => setEditando(undefined)}
          onSalvo={aoEditar}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          registro={excluindo}
          onFechar={() => setExcluindo(undefined)}
          onExcluido={aoExcluir}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

// ---------- Campos do formulário (usados no "Novo lançamento" e no modal de edição) ----------

function CamposRegistro({
  campos,
  erros,
  indicadores,
  estabelecimentos,
  onChange,
  desabilitado,
}: {
  campos: Campos;
  erros: ErrosCampos;
  indicadores: Indicador[];
  estabelecimentos: Estabelecimento[];
  onChange: (campo: keyof Campos, valor: string) => void;
  desabilitado?: boolean;
}) {
  const indicador = indicadores.find((i) => i.id === Number(campos.indicadorId));
  const unidade = indicador?.unidade;

  // Indicadores agrupados por categoria no select
  const categorias = useMemo(() => {
    const grupos = new Map<string, Indicador[]>();
    for (const i of indicadores) grupos.set(i.categoria, [...(grupos.get(i.categoria) ?? []), i]);
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [indicadores]);

  // Garante que o mês do lançamento aparece no select, mesmo se for bem antigo
  const meses = MESES.includes(campos.periodo) || !campos.periodo ? MESES : [campos.periodo, ...MESES];

  return (
    <>
      <Campo
        rotulo="INDICADOR"
        erro={erros.indicadorId}
        ajuda={unidade ? `Unidade: ${unidade === "%" ? "percentual (%)" : unidade}` : undefined}
      >
        <Select
          value={campos.indicadorId}
          onChange={(v) => onChange("indicadorId", v)}
          erro={Boolean(erros.indicadorId)}
          disabled={desabilitado}
        >
          <option value="">Selecione um indicador</option>
          {categorias.map(([categoria, lista]) => (
            <optgroup key={categoria} label={categoria}>
              {lista.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Campo>

      <Campo rotulo="MÊS DE REFERÊNCIA" erro={erros.periodo} ajuda="Não é possível lançar meses futuros.">
        <Select
          value={campos.periodo}
          onChange={(v) => onChange("periodo", v)}
          erro={Boolean(erros.periodo)}
          disabled={desabilitado}
          icone={<IconeCalendario />}
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {formatarMesLongo(m)}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo
        rotulo={
          <>
            ESTABELECIMENTO <span className="normal-case">(opcional)</span>
          </>
        }
      >
        <Select
          value={campos.estabelecimentoId}
          onChange={(v) => onChange("estabelecimentoId", v)}
          disabled={desabilitado}
        >
          <option value="">Valor do município (todos)</option>
          {estabelecimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo rotulo="VALOR" erro={erros.valor}>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={campos.valor}
            onChange={(e) => onChange("valor", e.target.value)}
            disabled={desabilitado}
            placeholder="Ex.: 29.600"
            aria-invalid={Boolean(erros.valor)}
            className={`w-full bg-white border rounded-lg pl-3 pr-28 py-2.5 text-sm focus:outline-none focus:ring-2 ${
              erros.valor
                ? "border-red-400 text-red-700 focus:ring-red-300"
                : "border-gray-300 text-gray-800 focus:ring-violet-400"
            }`}
          />
          {unidade && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {unidade}
            </span>
          )}
        </div>
      </Campo>
    </>
  );
}

function Campo({
  rotulo,
  erro,
  ajuda,
  children,
}: {
  rotulo: ReactNode;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      {children}
      {erro ? (
        <span className="block mt-1.5 text-xs text-red-600">{erro}</span>
      ) : (
        ajuda && <span className="block mt-1.5 text-xs text-gray-500">{ajuda}</span>
      )}
    </label>
  );
}

// Select nativo com a setinha (ou outro ícone) desenhada à direita
function Select({
  value,
  onChange,
  children,
  erro,
  disabled,
  icone,
  ...resto
}: {
  value: string;
  onChange: (valor: string) => void;
  children: ReactNode;
  erro?: boolean;
  disabled?: boolean;
  icone?: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <div className="relative">
      <select
        {...resto}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={erro || undefined}
        className={`w-full appearance-none bg-white border rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 ${
          erro ? "border-red-400 text-red-700 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
        }`}
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
        {icone ?? <IconeSeta />}
      </span>
    </div>
  );
}

// ---------- Lista ----------

function TabelaLancamentos({
  registros,
  destaque,
  podeExcluir,
  onEditar,
  onExcluir,
}: {
  registros: Registro[];
  destaque?: number;
  podeExcluir: boolean;
  onEditar: (r: Registro) => void;
  onExcluir: (r: Registro) => void;
}) {
  const acoes = (r: Registro) => (
    <div className="flex items-center gap-4">
      <button onClick={() => onEditar(r)} className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:underline">
        <IconeLapis /> Editar
      </button>
      {podeExcluir && (
        <button onClick={() => onExcluir(r)} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline">
          <IconeLixeira /> Excluir
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Tabela (computador/tablet) */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-5 py-3">INDICADOR</th>
              <th className="text-left px-5 py-3">MÊS</th>
              <th className="text-right px-5 py-3">VALOR</th>
              <th className="text-left px-5 py-3">LANÇADO POR</th>
              <th className="text-left px-5 py-3">ATUALIZADO EM</th>
              <th className="text-left px-5 py-3">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registros.map((r) => (
              <tr key={r.id} className={r.id === destaque ? "bg-violet-50" : "hover:bg-gray-50"}>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-gray-800">{r.indicador.nome}</p>
                  {r.estabelecimento && <p className="text-xs text-gray-500">{r.estabelecimento.nome}</p>}
                </td>
                <td className="px-5 py-3.5 text-gray-600">{formatarMes(r.periodo)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-800 whitespace-nowrap">
                  {formatarValor(r.valor, r.indicador.unidade)}
                </td>
                <td className="px-5 py-3.5 text-gray-700">{r.usuario.nome}</td>
                <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatarData(r.atualizadoEm)}</td>
                <td className="px-5 py-3.5">{acoes(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (celular) */}
      <ul className="md:hidden space-y-3">
        {registros.map((r) => (
          <li
            key={r.id}
            className={`border rounded-2xl shadow-sm p-4 ${r.id === destaque ? "bg-violet-50 border-violet-200" : "bg-white border-gray-200"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-gray-800">{r.indicador.nome}</p>
              <p className="font-bold text-gray-800 whitespace-nowrap">{formatarValor(r.valor, r.indicador.unidade)}</p>
            </div>
            {r.estabelecimento && <p className="text-xs text-gray-500 mt-1">{r.estabelecimento.nome}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {formatarMes(r.periodo)} · {r.usuario.nome}
            </p>
            <div className="mt-3 flex justify-end">{acoes(r)}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ListaVazia() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-14 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center">
        <IconePrancheta />
      </div>
      <p className="mt-4 font-semibold text-gray-800">Nenhum valor lançado ainda</p>
      <p className="text-sm text-gray-500 mt-1">Use o formulário acima para lançar o primeiro valor.</p>
    </div>
  );
}

function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="h-6 w-48 bg-gray-100 rounded" />
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-gray-100 rounded" />
              <div className="mt-2 h-10 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 h-7 w-40 bg-gray-100 rounded" />
      <div className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

// ---------- Modais ----------

function Modal({ onFechar, largura, children }: { onFechar: () => void; largura: string; children: ReactNode }) {
  // Fecha com a tecla Esc
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-gray-900/50" />
      <div role="dialog" aria-modal="true" className={`relative w-full ${largura} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 sm:p-7`}>
        {children}
      </div>
    </div>
  );
}

function ModalEditar({
  registro,
  registros,
  indicadores,
  estabelecimentos,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  registro: Registro;
  registros: Registro[];
  indicadores: Indicador[];
  estabelecimentos: Estabelecimento[];
  onFechar: () => void;
  onSalvo: (r: Registro) => void;
  onSessaoExpirada: () => void;
}) {
  const [campos, setCampos] = useState<Campos>(() => camposDe(registro));
  const [erros, setErros] = useState<ErrosCampos>({});
  const [erroApi, setErroApi] = useState("");
  const [salvando, setSalvando] = useState(false);

  function alterar(campo: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setErroApi("");
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validar(campos);
    setErros(v.erros);
    if (!v.dados) return;
    if (acharExistente(registros, campos, registro.id)) {
      setErroApi("Já existe outro valor para este indicador neste mês.");
      return;
    }
    setSalvando(true);
    try {
      onSalvo(await api.editarRegistro(registro.id, v.dados));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErroApi(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSalvando(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[520px]">
      <form onSubmit={salvar} noValidate>
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl font-bold text-gray-800">Editar lançamento</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-gray-500 hover:text-gray-700 p-1">
            <IconeFechar tamanho={20} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <CamposRegistro
            campos={campos}
            erros={erros}
            indicadores={indicadores}
            estabelecimentos={estabelecimentos}
            onChange={alterar}
            desabilitado={salvando}
          />
        </div>

        <p className="mt-5 text-xs text-gray-500">
          Último lançamento por {registro.usuario.nome} em {formatarData(registro.atualizadoEm)}
        </p>

        {erroApi && (
          <p role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {erroApi}
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
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalExcluir({
  registro,
  onFechar,
  onExcluido,
  onSessaoExpirada,
}: {
  registro: Registro;
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
      await api.excluirRegistro(registro.id);
      onExcluido(registro.id);
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
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Excluir este lançamento?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {registro.indicador.nome}
        {registro.estabelecimento && ` (${registro.estabelecimento.nome})`} · {formatarMes(registro.periodo)} ·{" "}
        {formatarValor(registro.valor, registro.indicador.unidade)}. Ele deixa de aparecer no dashboard. Essa ação não
        pode ser desfeita.
      </p>

      {erro && (
        <p role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {erro}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onFechar}
          className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
        >
          Cancelar
        </button>
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

// ---------- Ícones só desta tela ----------

function IconeSeta() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconeCalendario() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}
