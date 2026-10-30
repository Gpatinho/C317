"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type DadosEstabelecimento, type Estabelecimento } from "@/lib/api";
import { IconeAlerta, IconeLapis, IconeLixeira, IconePrancheta } from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

const CATEGORIAS = ["Hotel", "Pousada", "Hostel", "Chalé", "Restaurante"]; // sugestões; aceita qualquer texto

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

const VAZIO: DadosEstabelecimento = { nome: "", categoria: "", endereco: "", regiao: "" };

// Mesmas regras do back-end (estabelecimentoSchema)
function validar(d: DadosEstabelecimento) {
  const erros: { nome?: string; categoria?: string } = {};
  if (d.nome.trim().length < 2) erros.nome = "Informe o nome do estabelecimento.";
  if (d.categoria.trim().length < 2) erros.categoria = "Informe a categoria (ex.: Hotel).";
  return erros;
}

// Campos vazios viram null para apagar o valor no banco
const limpar = (d: DadosEstabelecimento): DadosEstabelecimento => ({
  nome: d.nome.trim(),
  categoria: d.categoria.trim(),
  endereco: d.endereco?.trim() || null,
  regiao: d.regiao?.trim() || null,
});

type Dados = { tentativa: number; lista?: Estabelecimento[]; erro?: boolean };

// Cadastro dos hotéis e pousadas e geração do código de acesso que eles usam no formulário de coleta.
export default function Estabelecimentos() {
  const { usuario, sessaoExpirou } = useSessao();
  const ehAdmin = usuario.papel === "ADMIN"; // gerar código e excluir são só do ADMIN na API

  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  const [novo, setNovo] = useState(VAZIO);
  const [erros, setErros] = useState<{ nome?: string; categoria?: string }>({});
  const [erroApi, setErroApi] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [editando, setEditando] = useState<Estabelecimento>();
  const [excluindo, setExcluindo] = useState<Estabelecimento>();
  const [gerando, setGerando] = useState<Estabelecimento>(); // confirmar / mostrar código

  useEffect(() => {
    let cancelado = false;
    api
      .estabelecimentos()
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

  function atualizarLista(fn: (lista: Estabelecimento[]) => Estabelecimento[]) {
    setDados((d) => d && { ...d, lista: fn(d.lista ?? []).sort((a, b) => a.nome.localeCompare(b.nome)) });
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setErroApi("");
    const v = validar(novo);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    try {
      const criado = await api.criarEstabelecimento(limpar(novo));
      atualizarLista((l) => [...l, { ...criado, temCodigo: false }]);
      setNovo(VAZIO);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      setErroApi(err instanceof Error ? err.message : "Não foi possível cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  const lista = dados?.lista ?? [];

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Estabelecimentos</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-500">
        Hotéis e pousadas que enviam dados pelo formulário de coleta, cada um com o seu código de acesso.
      </p>

      <form onSubmit={cadastrar} noValidate className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
        <h2 className="font-serif text-xl font-bold text-gray-800">Novo estabelecimento</h2>
        <div className="mt-5">
          <CamposEstabelecimento valor={novo} erros={erros} desabilitado={salvando} onChange={(d, campo) => {
            setNovo(d);
            setErros((e) => ({ ...e, [campo]: undefined }));
          }} />
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
        <h2 className="font-serif text-xl font-bold text-gray-800">Cadastrados {dados?.lista && `(${lista.length})`}</h2>

        {dados?.erro && !carregando && (
          <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">Não foi possível carregar os estabelecimentos.</p>
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
              <IconePrancheta />
            </div>
            <p className="mt-4 text-sm text-gray-500">Nenhum estabelecimento cadastrado ainda.</p>
          </div>
        )}

        <ul className="mt-4 space-y-3">
          {lista.map((e) => (
            <li key={e.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">{e.nome}</p>
                <p className="text-xs text-gray-500">
                  {[e.categoria, e.regiao, e.endereco].filter(Boolean).join(" · ")}
                </p>
                <span
                  className={`inline-block mt-2 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                    e.temCodigo ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {e.temCodigo ? "Com código de acesso" : "Sem código de acesso"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ehAdmin && (
                  <button
                    onClick={() => setGerando(e)}
                    className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-4 py-2"
                  >
                    {e.temCodigo ? "Gerar novo código" : "Gerar código"}
                  </button>
                )}
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

      {editando && (
        <ModalEditar
          estabelecimento={editando}
          onFechar={() => setEditando(undefined)}
          onSalvo={(atualizado) => {
            atualizarLista((l) => l.map((x) => (x.id === atualizado.id ? { ...x, ...atualizado } : x)));
            setEditando(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          estabelecimento={excluindo}
          onFechar={() => setExcluindo(undefined)}
          onExcluido={(id) => {
            atualizarLista((l) => l.filter((x) => x.id !== id));
            setExcluindo(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {gerando && (
        <ModalCodigo
          estabelecimento={gerando}
          onFechar={() => setGerando(undefined)}
          onGerado={(id) => atualizarLista((l) => l.map((x) => (x.id === id ? { ...x, temCodigo: true } : x)))}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

function CamposEstabelecimento({
  valor,
  erros,
  desabilitado,
  onChange,
}: {
  valor: DadosEstabelecimento;
  erros: { nome?: string; categoria?: string };
  desabilitado?: boolean;
  onChange: (d: DadosEstabelecimento, campo: keyof DadosEstabelecimento) => void;
}) {
  const campo = (nome: keyof DadosEstabelecimento, rotulo: string, max: number, placeholder: string, erro?: string, lista?: string) => (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      <input
        type="text"
        value={valor[nome] ?? ""}
        maxLength={max}
        list={lista}
        disabled={desabilitado}
        placeholder={placeholder}
        aria-invalid={Boolean(erro)}
        onChange={(e) => onChange({ ...valor, [nome]: e.target.value }, nome)}
        className={classeCampo(erro)}
      />
      {erro && <span className="block mt-1 text-xs text-red-600">{erro}</span>}
    </label>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {campo("nome", "NOME", 160, "Ex.: Pousada Recanto da Serra", erros.nome)}
      {campo("categoria", "CATEGORIA", 60, "Ex.: Pousada", erros.categoria, "categorias-estabelecimento")}
      {campo("endereco", "ENDEREÇO (OPCIONAL)", 255, "Ex.: Rua Antônio Gomes, 120")}
      {campo("regiao", "REGIÃO (OPCIONAL)", 80, "Ex.: Centro")}
      <datalist id="categorias-estabelecimento">
        {CATEGORIAS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

function ModalEditar({
  estabelecimento,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  estabelecimento: Estabelecimento;
  onFechar: () => void;
  onSalvo: (e: Estabelecimento) => void;
  onSessaoExpirada: () => void;
}) {
  const [valor, setValor] = useState<DadosEstabelecimento>({
    nome: estabelecimento.nome,
    categoria: estabelecimento.categoria,
    endereco: estabelecimento.endereco ?? "",
    regiao: estabelecimento.regiao ?? "",
  });
  const [erros, setErros] = useState<{ nome?: string; categoria?: string }>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validar(valor);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    setErro("");
    try {
      onSalvo(await api.editarEstabelecimento(estabelecimento.id, limpar(valor)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSalvando(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[560px]">
      <form onSubmit={salvar} noValidate>
        <h2 className="font-serif text-2xl font-bold text-gray-800">Editar estabelecimento</h2>
        <div className="mt-5">
          <CamposEstabelecimento valor={valor} erros={erros} desabilitado={salvando} onChange={(d, campo) => {
            setValor(d);
            setErros((x) => ({ ...x, [campo]: undefined }));
          }} />
        </div>
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

function ModalExcluir({
  estabelecimento,
  onFechar,
  onExcluido,
  onSessaoExpirada,
}: {
  estabelecimento: Estabelecimento;
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
      await api.excluirEstabelecimento(estabelecimento.id);
      onExcluido(estabelecimento.id);
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
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Excluir este estabelecimento?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {estabelecimento.nome}. Os envios dele também são apagados. Estabelecimentos com valores já publicados não
        podem ser excluídos.
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

// Primeiro confirma (gerar de novo invalida o código antigo); depois mostra o código uma única vez.
function ModalCodigo({
  estabelecimento,
  onFechar,
  onGerado,
  onSessaoExpirada,
}: {
  estabelecimento: Estabelecimento;
  onFechar: () => void;
  onGerado: (id: number) => void;
  onSessaoExpirada: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    setGerando(true);
    setErro("");
    try {
      const r = await api.gerarCodigo(estabelecimento.id);
      setCodigo(r.codigo);
      onGerado(estabelecimento.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível gerar o código.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setErro("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  if (codigo) {
    return (
      <Modal onFechar={onFechar} largura="max-w-[440px]">
        <h2 className="font-serif text-2xl font-bold text-gray-800">Código de acesso</h2>
        <p className="mt-2 text-sm text-gray-500">{estabelecimento.nome}</p>
        <p className="mt-5 text-center font-mono text-3xl font-bold tracking-widest text-violet-700 bg-violet-50 rounded-xl py-5 select-all">
          {codigo}
        </p>
        <p className="mt-4 flex gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
          <IconeAlerta /> Anote e repasse ao estabelecimento. Este código não será mostrado de novo.
        </p>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={copiar}
            className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
          >
            {copiado ? "Copiado!" : "Copiar código"}
          </button>
          <button
            onClick={onFechar}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5"
          >
            Concluir
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[440px]">
      <h2 className="font-serif text-2xl font-bold text-gray-800">
        {estabelecimento.temCodigo ? "Gerar novo código?" : "Gerar código de acesso?"}
      </h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {estabelecimento.nome} vai usar este código para enviar seus dados no formulário de coleta.
        {estabelecimento.temCodigo && " O código atual deixa de funcionar imediatamente."}
      </p>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="mt-6 flex justify-end gap-3">
        <BotaoCancelar onClick={onFechar} />
        <button
          onClick={gerar}
          disabled={gerando}
          className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
        >
          {gerando ? "Gerando..." : "Gerar código"}
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
